import React, { useEffect, useRef, useState } from "react";
import { FaVideo, FaVideoSlash, FaMicrophone, FaMicrophoneSlash, FaDesktop, FaComments, FaTimes, FaUser, FaUsers } from "react-icons/fa";
import { toast } from "react-toastify";
import axios from "axios";
import { serverUrl } from "../App";

function LiveVideoPlayer({ liveClassId, userRole, onClose, isEducator = false }) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [showChat, setShowChat] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [participants, setParticipants] = useState([]);

  const peerConnectionRef = useRef(null);
  const dataChannelRef = useRef(null);
  const screenStreamRef = useRef(null);
  const pollingIntervalsRef = useRef([]);
  const processedCandidatesRef = useRef(new Set());
  const processedOffersRef = useRef(new Set());
  const processedAnswersRef = useRef(new Set());

  // STUN/TURN servers configuration
  const rtcConfiguration = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
    ],
    iceCandidatePoolSize: 10,
  };

  useEffect(() => {
    initializeWebRTC();
    return () => {
      cleanup();
    };
  }, [liveClassId, isEducator]);

  const initializeWebRTC = async () => {
    try {
      setConnectionStatus("connecting");
      
      // Request user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, frameRate: 30 },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      setLocalStream(stream);

      // Create peer connection
      const pc = new RTCPeerConnection(rtcConfiguration);
      peerConnectionRef.current = pc;

      // Add local tracks to peer connection
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Handle remote stream
      pc.ontrack = (event) => {
        console.log("Received remote track:", event.track.kind);
        if (event.streams && event.streams[0]) {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
          setRemoteStream(event.streams[0]);
          setConnectionStatus("connected");
          toast.success("Connected to live class!");
        }
      };

      // Handle ICE candidates
      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          try {
            await axios.post(
              `${serverUrl}/api/liveclass/${liveClassId}/ice-candidate`,
              { candidate: event.candidate },
              { withCredentials: true }
            );
          } catch (error) {
            console.error("Error sending ICE candidate:", error);
          }
        }
      };

      // Handle ICE connection state
      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        console.log("ICE Connection State:", state);
        
        if (state === "connected" || state === "completed") {
          setConnectionStatus("connected");
        } else if (state === "disconnected") {
          setConnectionStatus("disconnected");
          toast.warning("Connection lost. Attempting to reconnect...");
        } else if (state === "failed") {
          setConnectionStatus("failed");
          toast.error("Connection failed. Please try again.");
        } else if (state === "checking") {
          setConnectionStatus("connecting");
        }
      };

      // Handle connection state
      pc.onconnectionstatechange = () => {
        console.log("Connection State:", pc.connectionState);
        setConnectionStatus(pc.connectionState);
      };

      // Create data channel for chat (educator creates, student receives)
      if (isEducator) {
        const dataChannel = pc.createDataChannel("chat", {
          ordered: true,
        });
        dataChannelRef.current = dataChannel;
        setupDataChannel(dataChannel);
      } else {
        pc.ondatachannel = (event) => {
          dataChannelRef.current = event.channel;
          setupDataChannel(event.channel);
        };
      }

      // Join the live class first
      try {
        await axios.post(
          `${serverUrl}/api/liveclass/${liveClassId}/join`,
          {},
          { withCredentials: true }
        );
      } catch (error) {
        console.error("Error joining live class:", error);
      }

      // Start WebRTC signaling
      if (isEducator) {
        await startEducatorSignaling(pc);
      } else {
        await startStudentSignaling(pc);
      }

      // Start polling for ICE candidates
      startIceCandidatePolling(pc);

    } catch (error) {
      console.error("Error initializing WebRTC:", error);
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        toast.error("Camera/microphone permission denied. Please allow access.");
      } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        toast.error("No camera/microphone found. Please connect a device.");
      } else {
        toast.error("Failed to initialize video. Please check your devices.");
      }
      setConnectionStatus("failed");
    }
  };

  const startEducatorSignaling = async (pc) => {
    try {
      // Create and send offer
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);

      // Send offer to server
      await axios.post(
        `${serverUrl}/api/liveclass/${liveClassId}/offer`,
        { offer },
        { withCredentials: true }
      );

      // Poll for answer from student
      const pollAnswer = setInterval(async () => {
        try {
          const response = await axios.get(
            `${serverUrl}/api/liveclass/${liveClassId}/answer`,
            { withCredentials: true }
          );

          if (response.data.answer && !processedAnswersRef.current.has(JSON.stringify(response.data.answer))) {
            processedAnswersRef.current.add(JSON.stringify(response.data.answer));
            
            if (pc.signalingState === "have-local-offer") {
              await pc.setRemoteDescription(new RTCSessionDescription(response.data.answer));
              console.log("Answer received and set");
            }
          }
        } catch (error) {
          // Silent error - answer might not be available yet
        }
      }, 1000);

      pollingIntervalsRef.current.push(pollAnswer);
    } catch (error) {
      console.error("Error in educator signaling:", error);
      toast.error("Failed to start live class");
    }
  };

  const startStudentSignaling = async (pc) => {
    // Poll for offer from educator
    const pollOffer = setInterval(async () => {
      try {
        const response = await axios.get(
          `${serverUrl}/api/liveclass/${liveClassId}/offer`,
          { withCredentials: true }
        );

        if (response.data.offer && !processedOffersRef.current.has(JSON.stringify(response.data.offer))) {
          processedOffersRef.current.add(JSON.stringify(response.data.offer));
          
          if (pc.signalingState === "stable") {
            await pc.setRemoteDescription(new RTCSessionDescription(response.data.offer));
            
            // Create and send answer
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            await axios.post(
              `${serverUrl}/api/liveclass/${liveClassId}/answer`,
              { answer },
              { withCredentials: true }
            );
            console.log("Answer sent");
          }
        }
      } catch (error) {
        // Silent error - offer might not be available yet
      }
    }, 1000);

    pollingIntervalsRef.current.push(pollOffer);
  };

  const startIceCandidatePolling = (pc) => {
    const pollIce = setInterval(async () => {
      try {
        const response = await axios.get(
          `${serverUrl}/api/liveclass/${liveClassId}/ice-candidates`,
          { withCredentials: true }
        );

        if (response.data.candidates && response.data.candidates.length > 0) {
          for (const candidate of response.data.candidates) {
            const candidateKey = JSON.stringify(candidate);
            if (!processedCandidatesRef.current.has(candidateKey)) {
              processedCandidatesRef.current.add(candidateKey);
              try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
                console.log("ICE candidate added");
              } catch (error) {
                // Candidate might already be added
                console.warn("Error adding ICE candidate:", error);
              }
            }
          }
        }
      } catch (error) {
        // Silent error
      }
    }, 1000);

    pollingIntervalsRef.current.push(pollIce);
  };

  const setupDataChannel = (channel) => {
    channel.onopen = () => {
      console.log("Data channel opened");
      toast.success("Chat connected");
    };

    channel.onclose = () => {
      console.log("Data channel closed");
    };

    channel.onerror = (error) => {
      console.error("Data channel error:", error);
    };

    channel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        setChatMessages((prev) => [...prev, message]);
      } catch (error) {
        console.error("Error parsing chat message:", error);
      }
    };
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoOn;
        setIsVideoOn(!isVideoOn);
        toast.info(isVideoOn ? "Camera turned off" : "Camera turned on");
      }
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isAudioOn;
        setIsAudioOn(!isAudioOn);
        toast.info(isAudioOn ? "Microphone muted" : "Microphone unmuted");
      }
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        // Start screen sharing
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: "always" },
          audio: true,
        });
        screenStreamRef.current = screenStream;

        const videoTrack = screenStream.getVideoTracks()[0];
        const sender = peerConnectionRef.current
          .getSenders()
          .find((s) => s.track && s.track.kind === "video");

        if (sender) {
          await sender.replaceTrack(videoTrack);
          toast.success("Screen sharing started");
        }

        // Handle screen share end
        videoTrack.onended = () => {
          toggleScreenShare();
        };

        setIsScreenSharing(true);
      } else {
        // Stop screen sharing and return to camera
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, frameRate: 30 },
          audio: true,
        });

        const videoTrack = stream.getVideoTracks()[0];
        const sender = peerConnectionRef.current
          .getSenders()
          .find((s) => s.track && s.track.kind === "video");

        if (sender) {
          await sender.replaceTrack(videoTrack);
        }

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Stop screen stream
        screenStreamRef.current?.getTracks().forEach((track) => track.stop());
        screenStreamRef.current = null;

        // Update local stream
        localStream?.getVideoTracks().forEach((track) => track.stop());
        setLocalStream(stream);
        setIsScreenSharing(false);
        toast.info("Screen sharing stopped");
      }
    } catch (error) {
      console.error("Error toggling screen share:", error);
      if (error.name === "NotAllowedError") {
        toast.error("Screen sharing permission denied");
      } else {
        toast.error("Failed to share screen");
      }
    }
  };

  const sendChatMessage = () => {
    if (chatInput.trim() && dataChannelRef.current && dataChannelRef.current.readyState === "open") {
      const message = {
        text: chatInput,
        sender: isEducator ? "Educator" : "Student",
        timestamp: new Date().toISOString(),
      };

      try {
        dataChannelRef.current.send(JSON.stringify(message));
        setChatMessages((prev) => [...prev, message]);
        setChatInput("");
      } catch (error) {
        console.error("Error sending chat message:", error);
        toast.error("Failed to send message");
      }
    } else if (!dataChannelRef.current || dataChannelRef.current.readyState !== "open") {
      toast.warning("Chat not connected yet");
    }
  };

  const cleanup = async () => {
    try {
      // Clear all polling intervals
      pollingIntervalsRef.current.forEach(interval => clearInterval(interval));
      pollingIntervalsRef.current = [];

      // Stop all media tracks
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (remoteStream) {
        remoteStream.getTracks().forEach((track) => track.stop());
      }

      // Close peer connection
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }

      // Leave the class
      await axios.post(
        `${serverUrl}/api/liveclass/${liveClassId}/leave`,
        {},
        { withCredentials: true }
      ).catch(() => {}); // Ignore errors on cleanup

    } catch (error) {
      console.error("Error cleaning up:", error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 text-white p-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-lg font-semibold">Live Class</h2>
            <div className="flex items-center gap-2 text-sm">
              <span className={`w-2 h-2 rounded-full ${
                connectionStatus === "connected" ? "bg-green-500" :
                connectionStatus === "connecting" ? "bg-yellow-500" :
                "bg-red-500"
              }`}></span>
              <span className="capitalize">{connectionStatus}</span>
            </div>
          </div>
          {participants.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <FaUsers />
              <span>{participants.length} participant{participants.length !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          title="Close"
        >
          <FaTimes className="w-5 h-5" />
        </button>
      </div>

      {/* Video Container */}
      <div className="flex-1 flex gap-4 p-4 relative overflow-hidden">
        {/* Remote Video (Main) */}
        <div className="flex-1 bg-gray-900 rounded-lg overflow-hidden relative flex items-center justify-center">
          {remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-contain"
              muted={false}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <div className="text-center">
                <FaUser className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Waiting for {isEducator ? "student" : "educator"}...</p>
                <p className="text-sm mt-2 text-gray-500">
                  {connectionStatus === "connecting" && "Establishing connection..."}
                  {connectionStatus === "failed" && "Connection failed. Please refresh."}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Local Video (Small) */}
        {localStream && (
          <div className="w-64 h-48 bg-gray-900 rounded-lg overflow-hidden relative shadow-lg">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {!isVideoOn && (
              <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
                <FaVideoSlash className="w-8 h-8 text-white" />
              </div>
            )}
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-xs text-white">
              You
            </div>
          </div>
        )}

        {/* Chat Sidebar */}
        {showChat && (
          <div className="w-80 bg-gray-800 rounded-lg flex flex-col shadow-lg">
            <div className="p-3 border-b border-gray-700 flex justify-between items-center">
              <h3 className="font-semibold text-white">Chat</h3>
              <button
                onClick={() => setShowChat(false)}
                className="text-gray-400 hover:text-white transition-colors"
                title="Hide chat"
              >
                <FaTimes className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {chatMessages.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">No messages yet</p>
              ) : (
                chatMessages.map((msg, idx) => (
                  <div key={idx} className="text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-blue-400">{msg.sender}:</span>
                      <span className="text-xs text-gray-500">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-gray-300 ml-0">{msg.text}</p>
                  </div>
                ))
              )}
            </div>
            <div className="p-3 border-t border-gray-700 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && sendChatMessage()}
                placeholder="Type a message..."
                className="flex-1 bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!dataChannelRef.current || dataChannelRef.current.readyState !== "open"}
              />
              <button
                onClick={sendChatMessage}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!dataChannelRef.current || dataChannelRef.current.readyState !== "open"}
              >
                Send
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-gray-900 p-4 flex justify-center items-center gap-4">
        <button
          onClick={toggleVideo}
          className={`p-3 rounded-full transition-colors ${
            isVideoOn ? "bg-gray-700 text-white hover:bg-gray-600" : "bg-red-600 text-white hover:bg-red-700"
          }`}
          title={isVideoOn ? "Turn off camera" : "Turn on camera"}
        >
          {isVideoOn ? <FaVideo className="w-5 h-5" /> : <FaVideoSlash className="w-5 h-5" />}
        </button>

        <button
          onClick={toggleAudio}
          className={`p-3 rounded-full transition-colors ${
            isAudioOn ? "bg-gray-700 text-white hover:bg-gray-600" : "bg-red-600 text-white hover:bg-red-700"
          }`}
          title={isAudioOn ? "Mute microphone" : "Unmute microphone"}
        >
          {isAudioOn ? <FaMicrophone className="w-5 h-5" /> : <FaMicrophoneSlash className="w-5 h-5" />}
        </button>

        {isEducator && (
          <button
            onClick={toggleScreenShare}
            className={`p-3 rounded-full transition-colors ${
              isScreenSharing ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-700 text-white hover:bg-gray-600"
            }`}
            title={isScreenSharing ? "Stop sharing" : "Share screen"}
          >
            <FaDesktop className="w-5 h-5" />
          </button>
        )}

        {!showChat && (
          <button
            onClick={() => setShowChat(true)}
            className="p-3 rounded-full bg-gray-700 text-white hover:bg-gray-600 transition-colors"
            title="Show chat"
          >
            <FaComments className="w-5 h-5" />
          </button>
        )}

        <button
          onClick={onClose}
          className="p-3 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors"
          title="Leave class"
        >
          Leave
        </button>
      </div>
    </div>
  );
}

export default LiveVideoPlayer;
