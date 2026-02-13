import React, { useEffect, useState } from "react";
import axios from "axios";
import { serverUrl } from "../App";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import { FaQuestionCircle, FaPlus, FaClock, FaCheckCircle, FaTimesCircle, FaSpinner, FaUser, FaBook, FaTag } from "react-icons/fa";

function Doubts() {
  const { userData } = useSelector((state) => state.user);
  const { courseData } = useSelector((state) => state.course);
  const { creatorCourseData } = useSelector((state) => state.course);

  const [doubts, setDoubts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedDoubt, setSelectedDoubt] = useState(null);
  const [responseText, setResponseText] = useState("");
  const [filter, setFilter] = useState("all"); // all, pending, in-progress, resolved

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    courseId: "",
    subject: "",
    category: "general",
    priority: "medium",
  });

  const isStudent = userData?.role === "student";
  const isEducator = userData?.role === "educator";
  const isAdmin = userData?.role === "admin";

  // Get enrolled courses for students
  const enrolledCourses = courseData?.filter((c) =>
    userData?.enrolledCourses?.some((id) => id.toString() === c._id.toString())
  ) || [];

  // Get created courses for educators
  const myCourses = creatorCourseData?.length > 0 
    ? creatorCourseData 
    : courseData?.filter((c) => c.creator?._id === userData?._id || c.creator === userData?._id) || [];

  useEffect(() => {
    fetchDoubts();
  }, [filter]);

  const fetchDoubts = async () => {
    setLoading(true);
    try {
      let endpoint = "";
      if (isStudent) {
        endpoint = `${serverUrl}/api/doubts/my${filter !== "all" ? `?status=${filter}` : ""}`;
      } else if (isEducator || isAdmin) {
        endpoint = `${serverUrl}/api/doubts/assigned${filter !== "all" ? `?status=${filter}` : ""}`;
      }

      const res = await axios.get(endpoint, { withCredentials: true });
      setDoubts(res.data || []);
    } catch (error) {
      toast.error("Failed to fetch doubts");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDoubt = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${serverUrl}/api/doubts`, formData, { withCredentials: true });
      toast.success("Doubt created successfully");
      setShowModal(false);
      setFormData({
        title: "",
        description: "",
        courseId: "",
        subject: "",
        category: "general",
        priority: "medium",
      });
      fetchDoubts();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create doubt");
    }
  };

  const handleAddResponse = async () => {
    if (!responseText.trim()) {
      toast.error("Response cannot be empty");
      return;
    }

    try {
      await axios.post(
        `${serverUrl}/api/doubts/${selectedDoubt._id}/response`,
        { response: responseText },
        { withCredentials: true }
      );
      toast.success("Response added successfully");
      setResponseText("");
      fetchDoubts();
      // Refresh selected doubt
      const res = await axios.get(`${serverUrl}/api/doubts/${selectedDoubt._id}`, {
        withCredentials: true,
      });
      setSelectedDoubt(res.data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add response");
    }
  };

  const handleStatusUpdate = async (doubtId, newStatus) => {
    try {
      await axios.patch(
        `${serverUrl}/api/doubts/${doubtId}/status`,
        { status: newStatus },
        { withCredentials: true }
      );
      toast.success("Status updated successfully");
      fetchDoubts();
      if (selectedDoubt?._id === doubtId) {
        const res = await axios.get(`${serverUrl}/api/doubts/${doubtId}`, {
          withCredentials: true,
        });
        setSelectedDoubt(res.data);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update status");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "in-progress":
        return "bg-blue-100 text-blue-800";
      case "resolved":
        return "bg-green-100 text-green-800";
      case "closed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            <FaQuestionCircle className="text-blue-600" />
            {isStudent ? "My Doubts" : "Doubts & Questions"}
          </h1>
          {isStudent && (
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <FaPlus /> Ask a Question
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {["all", "pending", "in-progress", "resolved"].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg border ${
                filter === status
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1).replace("-", " ")}
            </button>
          ))}
        </div>

        {/* Doubts List */}
        {loading ? (
          <div className="text-center py-12">
            <FaSpinner className="animate-spin text-4xl text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading doubts...</p>
          </div>
        ) : doubts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <FaQuestionCircle className="text-6xl text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No doubts found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {doubts.map((doubt) => (
              <div
                key={doubt._id}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => {
                  axios
                    .get(`${serverUrl}/api/doubts/${doubt._id}`, { withCredentials: true })
                    .then((res) => setSelectedDoubt(res.data))
                    .catch(() => toast.error("Failed to load doubt details"));
                }}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">{doubt.title}</h3>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">{doubt.description}</p>
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      {doubt.courseId && (
                        <div className="flex items-center gap-1 text-gray-600">
                          <FaBook />
                          <span>{doubt.courseId.title}</span>
                        </div>
                      )}
                      {doubt.subject && (
                        <div className="flex items-center gap-1 text-gray-600">
                          <FaTag />
                          <span>{doubt.subject}</span>
                        </div>
                      )}
                      {!isStudent && doubt.studentId && (
                        <div className="flex items-center gap-1 text-gray-600">
                          <FaUser />
                          <span>{doubt.studentId.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(doubt.status)}`}>
                      {doubt.status.replace("-", " ")}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor(doubt.priority)}`}>
                      {doubt.priority}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-500 mt-3 pt-3 border-t">
                  <span>{new Date(doubt.createdAt).toLocaleDateString()}</span>
                  <span>{doubt.responses?.length || 0} response{doubt.responses?.length !== 1 ? "s" : ""}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Doubt Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">Ask a Question</h2>
              <form onSubmit={handleCreateDoubt} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Brief title of your question"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Description *</label>
                  <textarea
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows="5"
                    placeholder="Describe your question in detail..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Course (Optional)</label>
                    <select
                      value={formData.courseId}
                      onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="">Select a course</option>
                      {enrolledCourses.map((course) => (
                        <option key={course._id} value={course._id}>
                          {course.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Subject (Optional)</label>
                    <input
                      type="text"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="e.g., Mathematics, Physics"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="general">General</option>
                      <option value="course">Course Related</option>
                      <option value="subject">Subject Related</option>
                      <option value="technical">Technical</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Priority</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Submit Question
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setFormData({
                        title: "",
                        description: "",
                        courseId: "",
                        subject: "",
                        category: "general",
                        priority: "medium",
                      });
                    }}
                    className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Doubt Detail Modal */}
      {selectedDoubt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">{selectedDoubt.title}</h2>
                  <div className="flex flex-wrap items-center gap-3 text-sm mb-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(selectedDoubt.status)}`}>
                      {selectedDoubt.status.replace("-", " ")}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor(selectedDoubt.priority)}`}>
                      {selectedDoubt.priority}
                    </span>
                    {selectedDoubt.courseId && (
                      <span className="text-gray-600">
                        <FaBook className="inline mr-1" />
                        {selectedDoubt.courseId.title}
                      </span>
                    )}
                    {selectedDoubt.subject && (
                      <span className="text-gray-600">
                        <FaTag className="inline mr-1" />
                        {selectedDoubt.subject}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDoubt(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <FaTimesCircle className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="mb-6">
                <h3 className="font-semibold mb-2">Description:</h3>
                <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                  {selectedDoubt.description}
                </p>
              </div>

              {/* Responses */}
              <div className="mb-6">
                <h3 className="font-semibold mb-4">Responses ({selectedDoubt.responses?.length || 0}):</h3>
                <div className="space-y-4">
                  {selectedDoubt.responses?.length > 0 ? (
                    selectedDoubt.responses.map((response, idx) => (
                      <div key={idx} className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <FaUser className="text-gray-400" />
                            <span className="font-semibold">{response.respondedBy?.name || "Unknown"}</span>
                            <span className="text-xs text-gray-500">({response.role})</span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(response.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-gray-700 whitespace-pre-wrap">{response.response}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">No responses yet</p>
                  )}
                </div>
              </div>

              {/* Add Response */}
              {(isEducator || isAdmin || (isStudent && selectedDoubt.studentId?._id === userData?._id)) && (
                <div className="mb-4">
                  <h3 className="font-semibold mb-2">Add Response:</h3>
                  <textarea
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg mb-2"
                    rows="4"
                    placeholder="Type your response..."
                  />
                  <button
                    onClick={handleAddResponse}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Send Response
                  </button>
                </div>
              )}

              {/* Status Update (Educator/Admin only) */}
              {(isEducator || isAdmin) && selectedDoubt.status !== "closed" && (
                <div className="flex gap-2 pt-4 border-t">
                  {selectedDoubt.status !== "in-progress" && (
                    <button
                      onClick={() => handleStatusUpdate(selectedDoubt._id, "in-progress")}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                      Mark as In Progress
                    </button>
                  )}
                  {selectedDoubt.status !== "resolved" && (
                    <button
                      onClick={() => handleStatusUpdate(selectedDoubt._id, "resolved")}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                    >
                      Mark as Resolved
                    </button>
                  )}
                  <button
                    onClick={() => handleStatusUpdate(selectedDoubt._id, "closed")}
                    className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Doubts;

