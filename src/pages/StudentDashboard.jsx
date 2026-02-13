import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { serverUrl } from "../App";
import LiveVideoPlayer from "../components/LiveVideoPlayer";
import { FaBook, FaClipboardList, FaBell, FaGraduationCap, FaUser, FaEnvelope, FaClock } from "react-icons/fa";

function StudentDashboard() {
  const { userData } = useSelector((state) => state.user);
  const { courseData } = useSelector((state) => state.course);

  const [activeTab, setActiveTab] = useState("notifications");

  // Safety check - show loading if userData is not available
  if (!userData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Notifications state
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  // Assignments state
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState({});
  const [submitForm, setSubmitForm] = useState({});
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  // Shared course notes
  const [sharedNotes, setSharedNotes] = useState([]);
  const [sharedNoteForm, setSharedNoteForm] = useState({ title: "", content: "", courseId: "" });
  const [sharedFile, setSharedFile] = useState(null);

  // Attendance
  const [attendance, setAttendance] = useState([]);

  // Live Classes
  const [liveClasses, setLiveClasses] = useState([]);
  const [loadingLiveClasses, setLoadingLiveClasses] = useState(false);

  // Grades
  const [grades, setGrades] = useState([]);
  const [loadingGrades, setLoadingGrades] = useState(false);

  // Video Player
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [currentLiveClassId, setCurrentLiveClassId] = useState(null);

  const enrolledCourses = useMemo(() => {
    const ids = (userData?.enrolledCourses || []).map((c) =>
      typeof c === "string" ? c : c._id
    );
    return courseData?.filter((c) => ids.includes(c._id)) || [];
  }, [userData, courseData]);

  const fetchNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const res = await axios.get(`${serverUrl}/api/notifications/my`, {
        withCredentials: true,
      });
      setNotifications(res.data || []);
    } catch (error) {
      toast.error("Failed to fetch notifications");
    } finally {
      setLoadingNotifications(false);
    }
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      await axios.post(`${serverUrl}/api/notifications/${notificationId}/read`, {}, { withCredentials: true });
      setNotifications((prev) =>
        prev.map((n) => (n._id === notificationId ? { ...n, isRead: true } : n))
      );
    } catch (error) {
      // silent
    }
  };

  const fetchAssignments = async () => {
    if (!enrolledCourses.length) return;
    setLoadingAssignments(true);
    try {
      const requests = enrolledCourses.map((c) =>
        axios.get(`${serverUrl}/api/assignments/${c._id}`, { withCredentials: true })
      );
      const results = await Promise.all(requests);
      const list = [];
      results.forEach((res, idx) => {
        const course = enrolledCourses[idx];
        (res.data || []).forEach((a) => list.push({ ...a, course }));
      });
      setAssignments(list);

      // fetch submissions for each assignment
      const submissionPairs = await Promise.all(
        list.map((a) =>
          axios
            .get(`${serverUrl}/api/assignments/${a._id}/my`, { withCredentials: true })
            .then((r) => [a._id, r.data])
            .catch(() => [a._id, null])
        )
      );
      setSubmissions(Object.fromEntries(submissionPairs));
    } catch (error) {
      toast.error("Failed to fetch assignments");
    } finally {
      setLoadingAssignments(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrolledCourses.length]);

  const fetchSharedNotes = async () => {
    try {
      // For students, show notes from all enrolled courses
      // For educators, allow filtering by course
      const params = {};
      if (userData?.role === "educator" || userData?.role === "admin") {
        if (sharedNoteForm.courseId) params.courseId = sharedNoteForm.courseId;
      }
      // Students will get filtered notes from backend (only enrolled courses)
      const res = await axios.get(`${serverUrl}/api/sharednotes`, {
        params,
        withCredentials: true,
      });
      setSharedNotes(res.data || []);
    } catch (error) {
      toast.error("Failed to fetch shared notes");
    }
  };

  const fetchAttendance = async () => {
    try {
      const res = await axios.get(`${serverUrl}/api/attendance/my`, {
        withCredentials: true,
      });
      const attendanceData = res.data || [];
      // Populate course information using Redux courseData if available, otherwise fetch from API
      const attendanceWithCourses = await Promise.all(
        attendanceData.map(async (a) => {
          if (a.courseId && typeof a.courseId === 'string') {
            // First try to find course in Redux store
            const courseFromStore = courseData?.find(c => c._id === a.courseId);
            if (courseFromStore) {
              return { ...a, courseId: courseFromStore };
            }
            // If not in store, fetch from API
            try {
              const courseRes = await axios.get(`${serverUrl}/api/course/${a.courseId}`, {
                withCredentials: true,
              });
              return { ...a, courseId: courseRes.data };
            } catch {
              return a;
            }
          }
          return a;
        })
      );
      setAttendance(attendanceWithCourses);
    } catch (error) {
      console.error("Failed to fetch attendance:", error);
      toast.error("Failed to fetch attendance records");
    }
  };

  useEffect(() => {
    fetchSharedNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharedNoteForm.courseId]);

  useEffect(() => {
    fetchAttendance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchLiveClasses = async () => {
    setLoadingLiveClasses(true);
    try {
      const res = await axios.get(`${serverUrl}/api/liveclass/my`, {
        withCredentials: true,
      });
      setLiveClasses(res.data || []);
    } catch (error) {
      toast.error("Failed to fetch live classes");
    } finally {
      setLoadingLiveClasses(false);
    }
  };

  useEffect(() => {
    if (activeTab === "liveclasses") {
      fetchLiveClasses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const fetchGrades = async () => {
    setLoadingGrades(true);
    try {
      const res = await axios.get(`${serverUrl}/api/grades/my`, {
        withCredentials: true,
      });
      setGrades(res.data || []);
    } catch (error) {
      toast.error("Failed to fetch grades");
    } finally {
      setLoadingGrades(false);
    }
  };

  useEffect(() => {
    if (activeTab === "grades") {
      fetchGrades();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);


  const handleSubmitAssignment = async (assignmentId) => {
    const payload = submitForm[assignmentId] || {};
    try {
      const formData = new FormData();
      if (payload.submissionUrl) formData.append("submissionUrl", payload.submissionUrl);
      if (payload.attachment) formData.append("attachment", payload.attachment);
      if (payload.comment) formData.append("comment", payload.comment);
      const res = await axios.post(
        `${serverUrl}/api/assignments/${assignmentId}/submit`,
        formData,
        { withCredentials: true }
      );
      setSubmissions((prev) => ({ ...prev, [assignmentId]: res.data.submission || res.data }));
      
      if (res.data.alreadySubmitted) {
        toast.info("Assignment submission updated successfully");
      } else {
        toast.success("Assignment submitted successfully");
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Submit failed");
    }
  };

  const formatDate = (date) => (date ? new Date(date).toLocaleDateString() : "No due date");

  const uploadSharedNote = async () => {
    if (!sharedNoteForm.title || !sharedNoteForm.courseId) {
      toast.error("Course and title required");
      return;
    }
    try {
      const formData = new FormData();
      formData.append("title", sharedNoteForm.title);
      formData.append("courseId", sharedNoteForm.courseId);
      if (sharedNoteForm.content) formData.append("content", sharedNoteForm.content);
      if (sharedFile) formData.append("file", sharedFile);
      await axios.post(`${serverUrl}/api/sharednotes`, formData, { withCredentials: true });
      toast.success("Note uploaded");
      setSharedNoteForm({ title: "", content: "", courseId: sharedNoteForm.courseId });
      setSharedFile(null);
      fetchSharedNotes();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Upload failed");
    }
  };

  // Calculate statistics
  const totalEnrolledCourses = enrolledCourses.length;
  const totalAssignments = assignments.length;
  const completedAssignments = Object.values(submissions).filter(s => s?.status === "submitted" || s?.status === "graded").length;
  const totalNotifications = notifications.length;
  const unreadNotifications = notifications.filter(n => !n.isRead).length;
  const totalLiveClasses = liveClasses.length;
  const upcomingLiveClasses = liveClasses.filter(lc => {
    const scheduledDate = new Date(lc.scheduledDate);
    return scheduledDate > new Date() && lc.status === "scheduled";
  }).length;

  // Calculate average grade if grades exist
  const averageGrade = grades.length > 0
    ? Math.round(grades.reduce((sum, g) => sum + (g.percentage || 0), 0) / grades.length)
    : null;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Student Profile Header */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6 flex flex-col md:flex-row items-center gap-6">
          <div className="w-28 h-28 rounded-full bg-gray-200 flex items-center justify-center border-4 border-black shadow-md">
            {userData?.photoUrl ? (
              <img
                src={userData.photoUrl}
                alt="Student"
                className="w-full h-full rounded-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-3xl font-bold text-white" style={{ display: userData?.photoUrl ? 'none' : 'flex' }}>
              {userData?.name?.charAt(0)?.toUpperCase() || "S"}
            </div>
          </div>
          <div className="text-center md:text-left space-y-2 flex-1">
            <h1 className="text-3xl font-bold text-gray-800">
              Welcome, {userData?.name || "Student"} 👋
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <FaEnvelope className="text-gray-400" />
                <span className="font-semibold">Email:</span>
                <span>{userData?.email || "N/A"}</span>
              </div>
              {userData?.description && (
                <div className="flex items-center gap-2">
                  <FaUser className="text-gray-400" />
                  <span className="font-semibold">Bio:</span>
                  <span>{userData.description}</span>
                </div>
              )}
            </div>
            {userData?.totalActiveMinutes && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <FaClock className="text-gray-400" />
                <span>Total Activity: {Math.round((userData.totalActiveMinutes || 0) / 60)} hours</span>
              </div>
            )}
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <FaBook className="text-blue-600 text-xl" />
              <p className="text-sm text-gray-600 font-medium">Enrolled Courses</p>
            </div>
            <p className="text-2xl font-bold text-gray-800">{totalEnrolledCourses}</p>
            <p className="text-xs text-gray-500 mt-1">Active courses</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-orange-500 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <FaClipboardList className="text-orange-600 text-xl" />
              <p className="text-sm text-gray-600 font-medium">Assignments</p>
            </div>
            <p className="text-2xl font-bold text-gray-800">
              {completedAssignments}/{totalAssignments}
            </p>
            <p className="text-xs text-gray-500 mt-1">Completed</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-purple-500 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <FaBell className="text-purple-600 text-xl" />
              <p className="text-sm text-gray-600 font-medium">Notifications</p>
            </div>
            <p className="text-2xl font-bold text-gray-800">{totalNotifications}</p>
            {unreadNotifications > 0 && (
              <p className="text-xs text-red-600 mt-1 font-semibold">{unreadNotifications} unread</p>
            )}
            {unreadNotifications === 0 && (
              <p className="text-xs text-gray-500 mt-1">All read</p>
            )}
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-green-500 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <FaGraduationCap className="text-green-600 text-xl" />
              <p className="text-sm text-gray-600 font-medium">Average Grade</p>
            </div>
            <p className="text-2xl font-bold text-gray-800">
              {averageGrade !== null ? `${averageGrade}%` : "N/A"}
            </p>
            <p className="text-xs text-gray-500 mt-1">Overall performance</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
            <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveTab("notifications")}
                className={`px-4 py-2 rounded-lg border ${
                  activeTab === "notifications" ? "bg-black text-white" : "bg-white"
                }`}
              >
                Notifications
              </button>
              <button
                onClick={() => setActiveTab("assignments")}
                className={`px-4 py-2 rounded-lg border ${
                  activeTab === "assignments" ? "bg-black text-white" : "bg-white"
                }`}
              >
                Assignments
              </button>
              <button
                onClick={() => setActiveTab("shared")}
                className={`px-4 py-2 rounded-lg border ${
                  activeTab === "shared" ? "bg-black text-white" : "bg-white"
                }`}
              >
                Shared Notes
              </button>
              <button
                onClick={() => setActiveTab("attendance")}
                className={`px-4 py-2 rounded-lg border ${
                  activeTab === "attendance" ? "bg-black text-white" : "bg-white"
                }`}
              >
                Attendance
              </button>
              <button
                onClick={() => setActiveTab("liveclasses")}
                className={`px-4 py-2 rounded-lg border ${
                  activeTab === "liveclasses" ? "bg-black text-white" : "bg-white"
                }`}
              >
                Live Classes
              </button>
              <button
                onClick={() => setActiveTab("grades")}
                className={`px-4 py-2 rounded-lg border ${
                  activeTab === "grades" ? "bg-black text-white" : "bg-white"
                }`}
              >
                My Grades
              </button>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === "notifications" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Notifications & Events</h2>
              <button
                onClick={fetchNotifications}
                className="px-3 py-1 text-sm border rounded-lg hover:bg-gray-50"
              >
                Refresh
              </button>
            </div>
            {loadingNotifications && <p className="text-gray-500">Loading notifications...</p>}
            {!loadingNotifications && notifications.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No notifications yet.</p>
                <p className="text-gray-400 text-sm mt-2">You'll see announcements and events here.</p>
              </div>
            )}
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {notifications.map((notif) => (
                <div
                  key={notif._id}
                  className={`border rounded-lg p-4 shadow-sm transition-all ${
                    !notif.isRead
                      ? "bg-blue-50 border-blue-200 border-l-4 border-l-blue-500"
                      : "bg-white border-gray-200"
                  }`}
                  onClick={() => {
                    if (!notif.isRead) {
                      markNotificationAsRead(notif._id);
                    }
                  }}
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            notif.type === "event"
                              ? "bg-purple-100 text-purple-700"
                              : notif.type === "assignment"
                              ? "bg-orange-100 text-orange-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {notif.type === "event"
                            ? "📅 Event"
                            : notif.type === "assignment"
                            ? "📝 Assignment"
                            : "📢 Announcement"}
                        </span>
                        {!notif.isRead && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        )}
                      </div>
                      <h3 className="font-semibold text-lg">{notif.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {notif.createdBy?.name || "System"}
                        {notif.courseId?.title && ` • ${notif.courseId.title}`}
                        {notif.eventDate && ` • ${formatDate(notif.eventDate)}`}
                      </p>
                      <p className="text-gray-700 mt-2 whitespace-pre-wrap">{notif.message}</p>
                      {notif.eventDate && (
                        <p className="text-sm text-gray-500 mt-2">
                          📅 Event Date: {new Date(notif.eventDate).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="text-xs text-gray-400">
                      {formatDate(notif.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          )}

          {activeTab === "assignments" && (
          <div className="space-y-4">
            {loadingAssignments && <p>Loading assignments...</p>}
            {!loadingAssignments && assignments.length === 0 && (
              <p className="text-gray-500">No assignments yet.</p>
            )}
            <div className="grid md:grid-cols-2 gap-4">
              {assignments.map((a) => {
                const sub = submissions[a._id];
                const payload = submitForm[a._id] || {};
                return (
                  <div key={a._id} className="border rounded-xl p-4 shadow-sm bg-white">
                    <p className="text-xs text-gray-500">{a.course?.title || "Course"}</p>
                    <h3 className="text-lg font-semibold">{a.title}</h3>
                    <p className="text-sm text-gray-700 mt-1">{a.description}</p>
                    <p className="text-sm text-gray-600 mt-1">Due: {formatDate(a.dueDate)}</p>
                    {a.resourceUrl && (
                      <a
                        className="text-sm text-blue-600 underline"
                        href={a.resourceUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Resource
                      </a>
                    )}
                    {a.attachmentUrl && (
                      <a
                        className="text-sm text-blue-600 underline ml-2"
                        href={a.attachmentUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Attachment
                      </a>
                    )}

                    <div className="mt-3 space-y-2">
                      <input
                        className="w-full border rounded-lg p-2 text-sm text-black"
                        placeholder="Submission URL"
                        value={payload.submissionUrl || ""}
                        onChange={(e) =>
                          setSubmitForm((p) => ({
                            ...p,
                            [a._id]: { ...p[a._id], submissionUrl: e.target.value },
                          }))
                        }
                      />
                      <input
                        type="file"
                        className="w-full border rounded-lg p-2 text-sm text-black"
                        onChange={(e) =>
                          setSubmitForm((p) => ({
                            ...p,
                            [a._id]: { ...p[a._id], attachment: e.target.files[0] },
                          }))
                        }
                      />
                      <input
                        className="w-full border rounded-lg p-2 text-sm text-black"
                        placeholder="Attachment URL (optional)"
                        value={payload.attachmentUrl || ""}
                        onChange={(e) =>
                          setSubmitForm((p) => ({
                            ...p,
                            [a._id]: { ...p[a._id], attachmentUrl: e.target.value },
                          }))
                        }
                      />
                      <textarea
                        className="w-full border rounded-lg p-2 text-sm text-black"
                        placeholder="Comment (optional)"
                        value={payload.comment || ""}
                        onChange={(e) =>
                          setSubmitForm((p) => ({
                            ...p,
                            [a._id]: { ...p[a._id], comment: e.target.value },
                          }))
                        }
                      />
                      <button
                        onClick={() => handleSubmitAssignment(a._id)}
                        className="w-full py-2 rounded-lg bg-black text-white"
                      >
                        Submit / Update
                      </button>
                    </div>

                    {sub && (
                      <div className="mt-3 border-t pt-2 text-sm text-gray-700">
                        <p>Status: {sub.status}</p>
                        {sub.score !== undefined && <p>Score: {sub.score}</p>}
                        {sub.feedback && <p>Feedback: {sub.feedback}</p>}
                        {sub.attachmentUrl && (
                          <a
                            className="text-blue-600 underline"
                            href={sub.attachmentUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Download submission
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          )}

          {activeTab === "shared" && (
          <div className="space-y-4">
            {userData?.role === "educator" || userData?.role === "admin" ? (
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <h2 className="text-lg font-semibold">Upload Shared Note</h2>
                  <select
                    className="w-full border rounded-lg p-2 text-black"
                    value={sharedNoteForm.courseId}
                    onChange={(e) => setSharedNoteForm((p) => ({ ...p, courseId: e.target.value }))}
                  >
                    <option value="">Select course</option>
                    {enrolledCourses.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                  <input
                    className="w-full border rounded-lg p-2 text-black"
                    placeholder="Title"
                    value={sharedNoteForm.title}
                    onChange={(e) => setSharedNoteForm((p) => ({ ...p, title: e.target.value }))}
                  />
                  <textarea
                    className="w-full border rounded-lg p-2 min-h-[120px] text-black"
                    placeholder="Content (optional)"
                    value={sharedNoteForm.content}
                    onChange={(e) => setSharedNoteForm((p) => ({ ...p, content: e.target.value }))}
                  />
                  <input
                    type="file"
                    className="w-full border rounded-lg p-2 text-black"
                    onChange={(e) => setSharedFile(e.target.files[0])}
                  />
                  <button onClick={uploadSharedNote} className="px-4 py-2 bg-black text-white rounded-lg">
                    Upload Note
                  </button>
                </div>
                <div className="space-y-3">
                  <h2 className="text-lg font-semibold">Shared Notes</h2>
                  <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                    {sharedNotes.length === 0 && <p className="text-gray-500">No shared notes.</p>}
                    {sharedNotes.map((n) => (
                      <div key={n._id} className="border rounded-lg p-3 shadow-sm">
                        <p className="text-xs text-gray-500">
                          {formatDate(n.createdAt)} • {n.uploaderId?.name || "User"}
                          {n.courseId?.title && ` • ${n.courseId.title}`}
                        </p>
                        <h3 className="font-semibold">{n.title}</h3>
                        {n.content && <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{n.content}</p>}
                        {n.fileUrl && (
                          <a
                            className="text-blue-600 underline text-sm mt-2 inline-block"
                            href={n.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            download
                          >
                            📥 Download file
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold">Shared Notes from Educators</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Download notes uploaded by your course educators. Only educators can upload notes.
                </p>
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {sharedNotes.length === 0 && (
                    <p className="text-gray-500 text-center py-8">No shared notes available for your enrolled courses.</p>
                  )}
                  {sharedNotes.map((n) => (
                    <div key={n._id} className="border rounded-lg p-4 shadow-sm bg-white">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-xs text-gray-500">
                            {formatDate(n.createdAt)} • {n.uploaderId?.name || "Educator"}
                            {n.courseId?.title && ` • ${n.courseId.title}`}
                          </p>
                          <h3 className="font-semibold text-lg mt-1">{n.title}</h3>
                        </div>
                      </div>
                      {n.content && (
                        <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap bg-gray-50 p-3 rounded">
                          {n.content}
                        </p>
                      )}
                      {n.fileUrl && (
                        <div className="mt-3">
                          <a
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                            href={n.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            download
                          >
                            <span>📥</span>
                            <span>Download Note File</span>
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          )}

          {activeTab === "attendance" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">My Attendance Records</h2>
              <button
                onClick={fetchAttendance}
                className="px-3 py-1 text-sm border rounded-lg hover:bg-gray-50"
              >
                Refresh
              </button>
            </div>
            {attendance.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No attendance records found.</p>
                <p className="text-gray-400 text-sm mt-2">Your attendance will appear here once your educators mark it.</p>
              </div>
            )}
            {attendance.length > 0 && (
              <>
                {/* Attendance Statistics */}
                {(() => {
                  const totalRecords = attendance.length;
                  const presentCount = attendance.filter(a => a.status === "present").length;
                  const absentCount = attendance.filter(a => a.status === "absent").length;
                  const lateCount = attendance.filter(a => a.status === "late").length;
                  const attendancePercentage = totalRecords > 0 
                    ? Math.round(((presentCount + lateCount) / totalRecords) * 100) 
                    : 0;

                  return (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                      <div className="bg-white border rounded-lg p-4 shadow-sm">
                        <p className="text-sm text-gray-600 mb-1">Total Records</p>
                        <p className="text-2xl font-bold text-gray-800">{totalRecords}</p>
                      </div>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 shadow-sm">
                        <p className="text-sm text-green-700 mb-1">Present</p>
                        <p className="text-2xl font-bold text-green-800">{presentCount}</p>
                      </div>
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-sm">
                        <p className="text-sm text-red-700 mb-1">Absent</p>
                        <p className="text-2xl font-bold text-red-800">{absentCount}</p>
                      </div>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-sm">
                        <p className="text-sm text-yellow-700 mb-1">Late</p>
                        <p className="text-2xl font-bold text-yellow-800">{lateCount}</p>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-sm">
                        <p className="text-sm text-blue-700 mb-1">Attendance %</p>
                        <p className="text-2xl font-bold text-blue-800">{attendancePercentage}%</p>
                      </div>
                    </div>
                  );
                })()}

                {/* Attendance Table */}
                <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Day
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Course
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {attendance.map((a) => {
                          const attendanceDate = new Date(a.date);
                          const dayOfWeek = attendanceDate.toLocaleDateString("en-US", { weekday: "long" });
                          const formattedDate = attendanceDate.toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric"
                          });

                          const getStatusBadge = (status) => {
                            switch (status?.toLowerCase()) {
                              case "present":
                                return (
                                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-300">
                                    ✓ Present
                                  </span>
                                );
                              case "absent":
                                return (
                                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300">
                                    ✗ Absent
                                  </span>
                                );
                              case "late":
                                return (
                                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800 border border-yellow-300">
                                    ⏰ Late
                                  </span>
                                );
                              default:
                                return (
                                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-800 border border-gray-300">
                                    ? Unknown
                                  </span>
                                );
                            }
                          };

                          return (
                            <tr key={a._id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                {formattedDate}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                {dayOfWeek}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {a.courseId?.title || (typeof a.courseId === 'string' ? "Loading..." : "Unknown Course")}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {getStatusBadge(a.status)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
          )}

          {activeTab === "liveclasses" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Upcoming Live Classes</h2>
              <button
                onClick={fetchLiveClasses}
                className="px-3 py-1 text-sm border rounded-lg hover:bg-gray-50"
              >
                Refresh
              </button>
            </div>
            {loadingLiveClasses && <p className="text-gray-500">Loading live classes...</p>}
            {!loadingLiveClasses && liveClasses.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No live classes scheduled.</p>
                <p className="text-gray-400 text-sm mt-2">You'll see upcoming live classes from your enrolled courses here.</p>
              </div>
            )}
            <div className="grid md:grid-cols-2 gap-4">
              {liveClasses.map((liveClass) => {
                const scheduledDate = new Date(liveClass.scheduledDate);
                const isUpcoming = scheduledDate > new Date();
                const isLive = liveClass.status === "live";
                const isCompleted = liveClass.status === "completed";
                const canJoin = isUpcoming || isLive;

                const handleJoin = async () => {
                  try {
                    // For portal-based classes, join and open video player
                    if (liveClass.platformType === "portal") {
                      const response = await axios.post(
                        `${serverUrl}/api/liveclass/${liveClass._id}/join`,
                        {},
                        { withCredentials: true }
                      );
                      
                      if (response.data.alreadyJoined) {
                        toast.info("You have already joined this live class");
                      } else {
                        toast.success("Successfully joined the live class");
                      }
                      
                      // Open video player
                      setCurrentLiveClassId(liveClass._id);
                      setShowVideoPlayer(true);
                      fetchLiveClasses();
                    } else {
                      // For external platforms (Zoom/Google Meet), just open the link
                      // The link will be opened via the anchor tag, but we can still track join
                      try {
                        await axios.post(
                          `${serverUrl}/api/liveclass/${liveClass._id}/join`,
                          {},
                          { withCredentials: true }
                        );
                      } catch (err) {
                        // Silent error - still allow opening the link
                      }
                    }
                  } catch (error) {
                    toast.error(error.response?.data?.message || "Failed to join live class");
                  }
                };

                return (
                  <div
                    key={liveClass._id}
                    className={`border rounded-xl p-5 shadow-lg transition-all ${
                      isLive
                        ? "bg-red-50 border-red-300 border-l-4 border-l-red-500"
                        : isCompleted
                        ? "bg-gray-50 border-gray-200"
                        : "bg-white border-gray-200 hover:shadow-xl"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-xl font-bold text-gray-800">{liveClass.title}</h3>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          isLive
                            ? "bg-red-100 text-red-800"
                            : isCompleted
                            ? "bg-gray-100 text-gray-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {liveClass.status.toUpperCase()}
                      </span>
                    </div>

                    {liveClass.description && (
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                        {liveClass.description}
                      </p>
                    )}

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="font-medium">Course:</span>
                        <span>{liveClass.courseId?.title || "Unknown Course"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="font-medium">Educator:</span>
                        <span>{liveClass.educatorId?.name || "Unknown"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>📅</span>
                        <span>{scheduledDate.toLocaleString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>⏱️</span>
                        <span>{liveClass.duration} minutes</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>👥</span>
                        <span>
                          {liveClass.enrolledStudents?.length || 0} / {liveClass.maxParticipants}{" "}
                          students
                        </span>
                      </div>
                    </div>

                    {/* Platform indicator */}
                    <div className="mb-3 p-2 bg-gray-50 border border-gray-200 rounded text-xs">
                      <span className="font-semibold">Platform:</span>{" "}
                      {liveClass.platformType === "portal" && (
                        <span className="text-blue-700">Our Portal (Built-in Video)</span>
                      )}
                      {liveClass.platformType === "zoom" && (
                        <span className="text-blue-700">Zoom</span>
                      )}
                      {liveClass.platformType === "google-meet" && (
                        <span className="text-green-700">Google Meet</span>
                      )}
                    </div>

                    {/* Meeting details for external platforms */}
                    {(liveClass.platformType === "zoom" || liveClass.platformType === "google-meet") && liveClass.meetingId && (
                      <div className="mb-3 p-2 bg-gray-100 rounded text-sm">
                        <p className="text-gray-700">
                          <span className="font-medium">Meeting ID:</span> {liveClass.meetingId}
                        </p>
                        {liveClass.meetingPassword && (
                          <p className="text-gray-700 mt-1">
                            <span className="font-medium">Password:</span> {liveClass.meetingPassword}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2">
                      {canJoin && (
                        <>
                          {liveClass.platformType === "portal" ? (
                            <button
                              onClick={handleJoin}
                              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 font-semibold"
                            >
                              <span>🎥</span>
                              <span>{isLive ? "Join Now" : "Join Live Class"}</span>
                            </button>
                          ) : liveClass.meetingLink ? (
                            <a
                              href={liveClass.meetingLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={handleJoin}
                              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 font-semibold"
                            >
                              <span>🎥</span>
                              <span>{isLive ? "Join Now" : `Join ${liveClass.platformType === "zoom" ? "Zoom" : "Google Meet"}`}</span>
                            </a>
                          ) : (
                            <button
                              disabled
                              className="flex-1 bg-gray-400 text-white px-4 py-2 rounded-lg cursor-not-allowed flex items-center justify-center gap-2 font-semibold"
                            >
                              <span>🎥</span>
                              <span>Meeting link not available</span>
                            </button>
                          )}
                        </>
                      )}
                      {isCompleted && liveClass.recordingUrl && (
                        <a
                          href={liveClass.recordingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 font-semibold"
                        >
                          <span>📹</span>
                          <span>Watch Recording</span>
                        </a>
                      )}
                    </div>

                    {isCompleted && !liveClass.recordingUrl && (
                      <p className="text-sm text-gray-500 mt-2 text-center">
                        Recording will be available soon
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          )}

          {activeTab === "grades" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">My Grades & Marks</h2>
              <button
                onClick={fetchGrades}
                className="px-3 py-1 text-sm border rounded-lg hover:bg-gray-50"
              >
                Refresh
              </button>
            </div>
            {loadingGrades && <p className="text-gray-500">Loading grades...</p>}
            {!loadingGrades && grades.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No grades available yet.</p>
                <p className="text-gray-400 text-sm mt-2">
                  Your grades will appear here once your educators upload them.
                </p>
              </div>
            )}
            {!loadingGrades && grades.length > 0 && (
              <div className="space-y-4">
                {/* Group by course */}
                {Object.entries(
                  grades.reduce((acc, grade) => {
                    const courseId = grade.courseId?._id || grade.courseId;
                    const courseTitle = grade.courseId?.title || "Unknown Course";
                    if (!acc[courseId]) {
                      acc[courseId] = { title: courseTitle, grades: [] };
                    }
                    acc[courseId].grades.push(grade);
                    return acc;
                  }, {})
                ).map(([courseId, { title, grades: courseGrades }]) => {
                  const averagePercentage =
                    courseGrades.reduce((sum, g) => sum + g.percentage, 0) /
                    courseGrades.length;

                  const getGradeColor = (grade) => {
                    switch (grade) {
                      case "A+":
                      case "A":
                        return "bg-green-100 text-green-800";
                      case "B+":
                      case "B":
                        return "bg-blue-100 text-blue-800";
                      case "C+":
                      case "C":
                        return "bg-yellow-100 text-yellow-800";
                      case "D":
                        return "bg-orange-100 text-orange-800";
                      case "F":
                        return "bg-red-100 text-red-800";
                      default:
                        return "bg-gray-100 text-gray-800";
                    }
                  };

                  return (
                    <div key={courseId} className="bg-white border rounded-lg shadow-sm p-4">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-gray-800">{title}</h3>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Average</p>
                          <p className="text-2xl font-bold">{Math.round(averagePercentage)}%</p>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">
                                Subject
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">
                                Assignment
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">
                                Type
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">
                                Marks
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">
                                Percentage
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">
                                Grade
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">
                                Date
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {courseGrades.map((grade) => (
                              <tr key={grade._id} className="hover:bg-gray-50">
                                <td className="px-3 py-2 text-sm font-medium">{grade.subject}</td>
                                <td className="px-3 py-2 text-sm">
                                  {grade.assignmentName || "-"}
                                </td>
                                <td className="px-3 py-2 text-sm capitalize">{grade.examType}</td>
                                <td className="px-3 py-2 text-sm">
                                  {grade.marksObtained} / {grade.totalMarks}
                                </td>
                                <td className="px-3 py-2 text-sm font-semibold">
                                  {grade.percentage}%
                                </td>
                                <td className="px-3 py-2">
                                  <span
                                    className={`px-2 py-1 rounded-full text-xs font-bold ${getGradeColor(
                                      grade.grade
                                    )}`}
                                  >
                                    {grade.grade}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-sm">
                                  {new Date(grade.date).toLocaleDateString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {courseGrades.some((g) => g.remarks) && (
                        <div className="mt-4 pt-4 border-t">
                          <h4 className="text-sm font-semibold mb-2">Remarks:</h4>
                          {courseGrades
                            .filter((g) => g.remarks)
                            .map((grade) => (
                              <div key={grade._id} className="text-sm text-gray-700 mb-1">
                                <span className="font-medium">{grade.subject}:</span>{" "}
                                {grade.remarks}
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          )}
        </div>
      </div>

      {/* Live Video Player */}
      {showVideoPlayer && currentLiveClassId && (
        <LiveVideoPlayer
          liveClassId={currentLiveClassId}
          userRole={userData?.role}
          isEducator={false}
          onClose={() => {
            setShowVideoPlayer(false);
            setCurrentLiveClassId(null);
          }}
        />
      )}
    </div>
  );
}

export default StudentDashboard;

