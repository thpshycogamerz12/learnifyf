import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { serverUrl } from "../../App";

function Assignments() {
  const { userData } = useSelector((state) => state.user);
  const { creatorCourseData, courseData } = useSelector((state) => state.course);

  // Use creatorCourseData if available, otherwise filter courseData
  const myCourses = useMemo(
    () => {
      if (creatorCourseData && creatorCourseData.length > 0) {
        return creatorCourseData;
      }
      return courseData?.filter(
        (c) => c.creator?._id === userData?._id || c.creator === userData?._id
      ) || [];
    },
    [creatorCourseData, courseData, userData]
  );

  const [selectedCourse, setSelectedCourse] = useState("");
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    dueDate: "",
    resourceUrl: "",
    attachmentUrl: "",
    maxScore: 100,
  });
  const [attachmentFile, setAttachmentFile] = useState(null);

  const fetchAssignments = async () => {
    if (!selectedCourse) {
      setAssignments([]);
      return;
    }
    try {
      const res = await axios.get(`${serverUrl}/api/assignments/${selectedCourse}`, {
        withCredentials: true,
      });
      setAssignments(res.data || []);
    } catch (error) {
      toast.error("Failed to load assignments");
    }
  };

  useEffect(() => {
    fetchAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourse]);

  const handleCreate = async () => {
    if (!selectedCourse || !form.title) {
      toast.error("Course and title are required");
      return;
    }
    setCreating(true);
    try {
      const fd = new FormData();
      fd.append("courseId", selectedCourse);
      fd.append("title", form.title);
      if (form.description) fd.append("description", form.description);
      if (form.dueDate) fd.append("dueDate", form.dueDate);
      if (form.resourceUrl) fd.append("resourceUrl", form.resourceUrl);
      if (form.attachmentUrl) fd.append("attachmentUrl", form.attachmentUrl);
      if (form.maxScore) fd.append("maxScore", form.maxScore);
      if (attachmentFile) fd.append("attachment", attachmentFile);
      await axios.post(`${serverUrl}/api/assignments`, fd, { withCredentials: true });
      toast.success("Assignment created");
      setForm({
        title: "",
        description: "",
        dueDate: "",
        resourceUrl: "",
        attachmentUrl: "",
        maxScore: 100,
      });
      setAttachmentFile(null);
      fetchAssignments();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Create failed");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${serverUrl}/api/assignments/${id}`, { withCredentials: true });
      setAssignments((prev) => prev.filter((a) => a._id !== id));
      toast.success("Deleted");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Delete failed");
    }
  };

  const loadSubmissions = async (assignmentId) => {
    try {
      const res = await axios.get(`${serverUrl}/api/assignments/${assignmentId}/submissions`, {
        withCredentials: true,
      });
      setSubmissions(res.data || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to fetch submissions");
    }
  };

  const grade = async (submissionId, score, feedback) => {
    try {
      const res = await axios.post(
        `${serverUrl}/api/assignments/submissions/${submissionId}/grade`,
        { score, feedback },
        { withCredentials: true }
      );
      setSubmissions((prev) =>
        prev.map((s) => (s._id === submissionId ? res.data : s))
      );
      toast.success("Graded");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Grade failed");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-lg p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Assignments (Educator)</h1>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h2 className="font-semibold">Create Assignment</h2>
            <select
              className="w-full border rounded-lg p-2 text-black"
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
            >
              <option value="">Select course</option>
              {myCourses.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.title}
                </option>
              ))}
            </select>
            <input
              className="w-full border rounded-lg p-2 text-black"
              placeholder="Title"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            />
            <textarea
              className="w-full border rounded-lg p-2 text-black"
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            />
            <input
              className="w-full border rounded-lg p-2 text-black"
              type="date"
              value={form.dueDate ? form.dueDate.slice(0, 10) : ""}
              onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))}
            />
            <input
              className="w-full border rounded-lg p-2 text-black"
              placeholder="Resource URL"
              value={form.resourceUrl}
              onChange={(e) => setForm((p) => ({ ...p, resourceUrl: e.target.value }))}
            />
            <input
              className="w-full border rounded-lg p-2 text-black"
              placeholder="Attachment URL"
              value={form.attachmentUrl}
              onChange={(e) => setForm((p) => ({ ...p, attachmentUrl: e.target.value }))}
            />
            <input
              className="w-full border rounded-lg p-2 text-black"
              type="file"
              onChange={(e) => setAttachmentFile(e.target.files[0])}
            />
            <input
              className="w-full border rounded-lg p-2 text-black"
              type="number"
              placeholder="Max Score"
              value={form.maxScore}
              onChange={(e) => setForm((p) => ({ ...p, maxScore: e.target.value }))}
            />
            <button
              onClick={handleCreate}
              disabled={creating}
              className="px-4 py-2 rounded-lg bg-black text-white"
            >
              {creating ? "Creating..." : "Create"}
            </button>
          </div>

          <div className="space-y-3">
            <h2 className="font-semibold">Assignments</h2>
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {assignments.length === 0 && <p className="text-gray-500">No assignments</p>}
              {assignments.map((a) => (
                <div key={a._id} className="border rounded-lg p-3 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs text-gray-500">
                        Due: {a.dueDate ? new Date(a.dueDate).toLocaleDateString() : "No due date"}
                      </p>
                      <h3 className="font-semibold">{a.title}</h3>
                      <p className="text-sm text-gray-700">{a.description}</p>
                      {a.resourceUrl && (
                        <a className="text-sm text-blue-600 underline" href={a.resourceUrl} target="_blank" rel="noreferrer">
                          Resource
                        </a>
                      )}
                      {a.attachmentUrl && (
                        <a className="text-sm text-blue-600 underline ml-2" href={a.attachmentUrl} target="_blank" rel="noreferrer">
                          Attachment
                        </a>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(a._id)}
                      className="text-sm text-red-600"
                    >
                      Delete
                    </button>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => loadSubmissions(a._id)}
                      className="px-3 py-1 rounded border"
                    >
                      View Submissions
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {submissions.length > 0 && (
          <div className="border-t pt-4">
            <h2 className="font-semibold mb-3">Submissions</h2>
            <div className="space-y-3">
              {submissions.map((s) => (
                <div key={s._id} className="border rounded-lg p-3">
                  <div className="flex justify-between">
                    <div>
                      <p className="text-sm font-semibold">
                        {s.studentId?.name} ({s.studentId?.email})
                      </p>
                      <p className="text-sm text-gray-700">
                        Link: {s.submissionUrl || "—"} | Attachment: {s.attachmentUrl || "—"}
                      </p>
                      <p className="text-sm text-gray-700">Comment: {s.comment || "—"}</p>
                      <p className="text-sm text-gray-700">Status: {s.status}</p>
                    </div>
                    <div className="text-sm text-gray-600">
                      {s.updatedAt && new Date(s.updatedAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <input
                      className="border rounded p-2 text-sm text-black"
                      type="number"
                      placeholder="Score"
                      value={s.tempScore || s.score || ""}
                      onChange={(e) =>
                        setSubmissions((prev) =>
                          prev.map((item) =>
                            item._id === s._id ? { ...item, tempScore: e.target.value } : item
                          )
                        )
                      }
                    />
                    <input
                      className="border rounded p-2 text-sm flex-1 text-black"
                      placeholder="Feedback"
                      value={s.tempFeedback || s.feedback || ""}
                      onChange={(e) =>
                        setSubmissions((prev) =>
                          prev.map((item) =>
                            item._id === s._id ? { ...item, tempFeedback: e.target.value } : item
                          )
                        )
                      }
                    />
                    <button
                      onClick={() => grade(s._id, s.tempScore || s.score, s.tempFeedback || s.feedback)}
                      className="px-3 py-2 rounded bg-black text-white text-sm"
                    >
                      Save Grade
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Assignments;

