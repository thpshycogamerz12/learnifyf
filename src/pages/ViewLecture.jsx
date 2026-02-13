import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { serverUrl } from "../App";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { FaPlayCircle } from "react-icons/fa";
import { FaArrowLeftLong } from "react-icons/fa6";
import { GiAchievement } from "react-icons/gi";
import Confetti from "react-confetti";
import { useWindowSize } from "@uidotdev/usehooks";

function ViewLecture() {
  const { courseId } = useParams();
  const { courseData } = useSelector((state) => state.course);
  const { userData } = useSelector((state) => state.user);

  const selectedCourse = courseData?.find((c) => c._id === courseId);
  const [selectedLecture, setSelectedLecture] = useState(selectedCourse?.lectures?.[0] || null);
  const videoRef = useRef(null);

  const [progress, setProgress] = useState(0);

  // dark mode
  const [dark, setDark] = useState(localStorage.getItem("theme") === "dark");
  useEffect(() => localStorage.setItem("theme", dark ? "dark" : "light"), [dark]);

const [quizText, setQuizText] = useState("");
const [quizLoading, setQuizLoading] = useState(false);
const [quizError, setQuizError] = useState("");


  // congrats popup
  const [showCongrats, setShowCongrats] = useState(false);
  const { width, height } = useWindowSize();
  const navigate = useNavigate();

  /*------------------ AI Quiz Universal Handler ------------------*/
const generateQuiz = async () => {
  const topic = selectedLecture?.lectureTitle || selectedCourse?.title;
  if (!topic) {
    setQuizError("Topic not available for this lecture.");
    return;
  }

  setQuizLoading(true);
  setQuizError("");
  setQuizText("");

  try {
    const res = await axios.post(
      `${serverUrl}/api/ai/generate-quiz`,
      { topic },
      { withCredentials: true }
    );

    setQuizText(JSON.stringify(res.data.quiz, null, 2));
  } catch (err) {
    console.log("❌ FRONTEND ERROR:", err);
    const apiError =
      err.response?.data?.details ||
      err.response?.data?.error ||
      err.message ||
      "Request failed";
    setQuizError(apiError);
  } finally {
    setQuizLoading(false);
  }
};





  /*------------------ Video Save/Resume ------------------*/
  useEffect(() => {
    const savedTime = localStorage.getItem(`progress_${selectedLecture?._id}`);
    if (savedTime && videoRef.current) videoRef.current.currentTime = savedTime;
  }, [selectedLecture]);

  /*------------------ Fetch Progress ------------------*/
  useEffect(() => {
    if (!userData) return;
    axios
      .get(`${serverUrl}/api/progress/get/${userData._id}/${selectedCourse._id}`)
      .then((res) => setProgress(res.data?.completion || 0))
      .catch(() => {});
  }, []);

  /*------------------ Update on Complete ------------------*/
  const updateProgress = async () => {
    const res = await axios.post(
      `${serverUrl}/api/progress/update`,
      {
        userId: userData._id,
        courseId: selectedCourse._id,
        lectureId: selectedLecture._id,
        totalLectures: selectedCourse.lectures.length,
      },
      { withCredentials: true }
    );

    setProgress(res.data.completion);

    if (res.data.completion === 100) {
      setShowCongrats(true);
      setTimeout(() => setShowCongrats(false), 5000);
    }
  };

  return (
    <div
      className={`min-h-screen w-full p-4 md:p-8 flex gap-6 flex-col md:flex-row transition
      ${dark ? "bg-[#0c0c0c] text-white" : "bg-[#F7F7FC] text-black"}`}
    >

      {/* 🎉 Popup */}
      {showCongrats && (
        <>
          <Confetti width={width} height={height} />
          <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
            <div className="bg-white text-black p-7 rounded-xl shadow-xl text-center">
              <h2 className="text-2xl font-bold text-green-600">🎉 Congratulations!</h2>
              <p>You completed this course!</p>

              <button
                onClick={() => window.open(`${serverUrl}/api/cert/generate/${userData._id}/${selectedCourse._id}`)}
                className="bg-green-600 mt-4 text-white px-5 py-2 rounded-lg"
              >
                Download Certificate
              </button>
            </div>
          </div>
        </>
      )}

      {/* LEFT */}
      <div className={`w-full md:w-3/4 p-6 rounded-2xl shadow-lg border ${dark ? "bg-[#1a1a1a] border-[#444]" : "bg-white"}`}>
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <FaArrowLeftLong onClick={() => navigate("/")} className="cursor-pointer text-xl" />

          <h1 className={`text-2xl font-bold ${dark?"text-white":"text-[#111]"}`}>
            {selectedCourse?.title}
          </h1>

          <button onClick={() => setDark(!dark)} className="ml-auto border px-3 py-1 rounded-lg">
            {dark?"🌞 Light":"🌙 Dark"}
          </button>
        </div>

        {/* Progress */}
        <div>
          <div className="h-2 w-full bg-gray-300 rounded-full overflow-hidden">
            <div className="bg-green-600 h-full transition-all duration-500" style={{ width:`${progress}%` }}></div>
          </div>
          <p className="text-sm mt-1">{progress}% Completed</p>
        </div>

        {/* Video */}
        <div className="aspect-video rounded-xl overflow-hidden mt-5 border bg-black">
          <video
            ref={videoRef}
            src={selectedLecture?.videoUrl}
            controls
            onEnded={updateProgress}
            onTimeUpdate={() => localStorage.setItem(`progress_${selectedLecture._id}`, videoRef.current.currentTime)}
            className="w-full h-full"
          />
        </div>

        <h2 className="text-xl font-semibold mt-3">{selectedLecture?.lectureTitle}</h2>

        {/* Next/Prev */}
        <div className="flex justify-between mt-4">
          <button
            disabled={selectedCourse.lectures.indexOf(selectedLecture)==0}
            onClick={()=>setSelectedLecture(selectedCourse.lectures[selectedCourse.lectures.indexOf(selectedLecture)-1])}
            className="px-4 py-2 border rounded-lg disabled:opacity-40"
          >
            ⬅ Previous
          </button>
          <button
            disabled={selectedCourse.lectures.indexOf(selectedLecture)==selectedCourse.lectures.length-1}
            onClick={()=>setSelectedLecture(selectedCourse.lectures[selectedCourse.lectures.indexOf(selectedLecture)+1])}
            className="px-4 py-2 border rounded-lg disabled:opacity-40"
          >
            Next ➡
          </button>
        </div>

        {/* Certificate */}
       {progress === 100 && (
  <button
    onClick={() =>
      window.open(`${serverUrl}/api/cert/generate/${userData._id}/${selectedCourse._id}`)
    }
    className="
      relative group mt-6 px-6 py-3 
      rounded-xl overflow-hidden
      border-2 border-gradient-to-r from-purple-500 to-blue-500
      shadow-lg transition-all duration-300 
      hover:scale-105 hover:shadow-2xl
      bg-white text-transparent
    "
  >
    {/* Watermark */}
    <span className="absolute inset-0 opacity-10 text-6xl font-bold flex justify-center items-center">
      LEARNIFY
    </span>

    {/* Button Content */}
    <span className="
      relative z-10 font-semibold text-lg 
      bg-gradient-to-r from-green-500 via-blue-500 to-purple-600 
      bg-clip-text text-transparent flex items-center gap-2
    ">
      <GiAchievement className="text-yellow-500 group-hover:rotate-12 transition"/> 
      Download Certificate
    </span>

    {/* Hover animated border glow */}
    <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 opacity-0 group-hover:opacity-15 blur-xl transition"></span>
  </button>
)}


      {/* ================= AI QUIZ SECTION (NEW) ================= */}
<div className="mt-8 bg-white shadow-lg border rounded-2xl p-6 hover:shadow-xl">
  <div className="flex items-center gap-3 mb-4">
    <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700 text-2xl font-bold">
      ?
    </div>
    <div>
      <h3 className="text-xl font-bold text-gray-800">AI Auto-Generated Quiz</h3>
      <p className="text-sm text-gray-500">
        Based on: <span className="font-semibold">{selectedCourse?.title}</span>
      </p>
    </div>
  </div>

  <button
    onClick={generateQuiz}
    disabled={quizLoading}
    className="w-full py-3 bg-black text-white font-semibold rounded-lg hover:bg-gray-900 
    disabled:bg-gray-400 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
  >
    {quizLoading ? "⏳ Generating Quiz..." : "⚡ Generate Quiz"}
  </button>

  {quizError && <p className="text-red-600 text-sm mt-3">{quizError}</p>}

  {quizText && (
    <div className="mt-5 p-4 bg-gray-50 border rounded-xl whitespace-pre-wrap text-sm leading-7 text-gray-800">
      {quizText}
    </div>
  )}
</div>

      </div>

      {/* RIGHT Sidebar */}
      <div className={`w-full md:w-1/4 p-5 rounded-2xl shadow-lg border h-fit 
      ${dark?"bg-[#161616] border-[#444]":"bg-white"}`}>
        <h2 className="text-lg font-bold mb-3">All Lectures</h2>

        <div className="flex flex-col gap-2 max-h-[75vh] overflow-y-auto">
          {selectedCourse?.lectures.map((lec)=>(
            <button key={lec._id}
            onClick={()=>setSelectedLecture(lec)}
            className={`p-3 border rounded-lg flex justify-between 
            ${selectedLecture._id===lec._id?
            "bg-black text-white":"hover:bg-gray-200 dark:hover:bg-[#333]"}`}>
              {lec.lectureTitle} <FaPlayCircle/>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ViewLecture;
