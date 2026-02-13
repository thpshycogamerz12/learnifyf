import React, { useEffect, useState } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { serverUrl } from "../../App";

function Notifications() {
  const { userData } = useSelector((state) => state.user);
  const { creatorCourseData, courseData } = useSelector((state) => state.course);

  const [notifications, setNotifications] = useState([]);
  const [form, setForm] = useState({
    title: "",
    message: "",
    type: "announcement",
    courseId: "",
    targetAudience: "all",
    eventDate: "",
  });
  const [loading, setLoading] = useState(false);

  // Use creatorCourseData if available, otherwise filter courseData
  const myCourses = (() => {
    if (creatorCourseData && creatorCourseData.length > 0) {
      return creatorCourseData;
    }
    return courseData?.filter(
      (c) => c.creator?._id === userData?._id || c.creator === userData?._id
    ) || [];
  })();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${serverUrl}/api/notifications/all`, {
        withCredentials: true,
      });
      setNotifications(res.data || []);
    } catch (error) {
      toast.error("Failed to fetch notifications");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.message) {
      toast.error("Title and message are required");
      return;
    }
    try {
      await axios.post(
        `${serverUrl}/api/notifications`,
        {
          ...form,
          courseId: form.courseId || undefined,
          eventDate: form.eventDate || undefined,
        },
        { withCredentials: true }
      );
      toast.success("Notification created");
      setForm({
        title: "",
        message: "",
        type: "announcement",
        courseId: "",
        targetAudience: "all",
        eventDate: "",
      });
      fetchNotifications();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to create notification");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this notification?")) return;
    try {
      await axios.delete(`${serverUrl}/api/notifications/${id}`, {
        withCredentials: true,
      });
      toast.success("Notification deleted");
      fetchNotifications();
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const formatDate = (date) => (date ? new Date(date).toLocaleString() : "N/A");

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6">Manage Notifications & Events</h1>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Create Form */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Create Notification</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="text"
                className="w-full border rounded-lg p-2 text-black"
                placeholder="Title"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                required
              />
              <textarea
                className="w-full border rounded-lg p-2 min-h-[120px] text-black"
                placeholder="Message"
                value={form.message}
                onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                required
              />
              <select
                className="w-full border rounded-lg p-2 text-black"
                value={form.type}
                onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
              >
                <option value="announcement">Announcement</option>
                <option value="event">Event</option>
                <option value="assignment">Assignment</option>
                <option value="course">Course Update</option>
                <option value="system">System</option>
              </select>
              <select
                className="w-full border rounded-lg p-2 text-black"
                value={form.targetAudience}
                onChange={(e) => setForm((p) => ({ ...p, targetAudience: e.target.value }))}
              >
                <option value="all">All Users</option>
                <option value="students">Students Only</option>
                <option value="educators">Educators Only</option>
                <option value="course">Course Specific</option>
              </select>
              {form.targetAudience === "course" && (
                <select
                  className="w-full border rounded-lg p-2 text-black"
                  value={form.courseId}
                  onChange={(e) => setForm((p) => ({ ...p, courseId: e.target.value }))}
                  required
                >
                  <option value="">Select Course</option>
                  {myCourses.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              )}
              {form.type === "event" && (
                <input
                  type="datetime-local"
                  className="w-full border rounded-lg p-2 text-black"
                  value={form.eventDate}
                  onChange={(e) => setForm((p) => ({ ...p, eventDate: e.target.value }))}
                />
              )}
              <button
                type="submit"
                className="w-full px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
              >
                Create Notification
              </button>
            </form>
          </div>

          {/* List */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">All Notifications</h2>
            {loading && <p className="text-gray-500">Loading...</p>}
            {!loading && notifications.length === 0 && (
              <p className="text-gray-500">No notifications yet.</p>
            )}
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {notifications.map((notif) => (
                <div key={notif._id} className="border rounded-lg p-3 shadow-sm bg-white">
                  <div className="flex justify-between items-start gap-2">
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
                          {notif.type}
                        </span>
                        <span className="text-xs text-gray-500">
                          {notif.targetAudience}
                        </span>
                      </div>
                      <h3 className="font-semibold">{notif.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {notif.createdBy?.name || "System"}
                        {notif.courseId?.title && ` • ${notif.courseId.title}`}
                      </p>
                      <p className="text-sm text-gray-700 mt-2 line-clamp-2">{notif.message}</p>
                      <p className="text-xs text-gray-400 mt-1">{formatDate(notif.createdAt)}</p>
                    </div>
                    <button
                      onClick={() => handleDelete(notif._id)}
                      className="text-red-600 text-sm hover:text-red-800"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Notifications;

