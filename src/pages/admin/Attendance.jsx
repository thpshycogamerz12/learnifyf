import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import { serverUrl } from "../../App";

function Attendance() {
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

  const [courseId, setCourseId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [students, setStudents] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [records, setRecords] = useState([]);

  const fetchStudents = async () => {
    if (!courseId) return;
    try {
      const res = await axios.get(`${serverUrl}/api/course/getcourse/${courseId}/students`, {
        withCredentials: true,
      });
      setStudents(res.data || []);
      const initial = {};
      res.data?.forEach((s) => (initial[s._id] = "present"));
      setStatuses(initial);
    } catch (error) {
      toast.error("Failed to load students");
    }
  };

  const fetchRecords = async () => {
    if (!courseId) return;
    try {
      const res = await axios.get(`${serverUrl}/api/attendance/course/${courseId}`, {
        withCredentials: true,
      });
      setRecords(res.data || []);
    } catch (error) {
      // ignore
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const mark = async () => {
    if (!courseId || !date) {
      toast.error("Course and date required");
      return;
    }
    const payloadRecords = Object.entries(statuses).map(([studentId, status]) => ({
      studentId,
      status,
    }));
    try {
      const response = await axios.post(
        `${serverUrl}/api/attendance`,
        { courseId, date, records: payloadRecords },
        { withCredentials: true }
      );
      
      if (response.data.alreadyExists) {
        toast.info("Attendance for this date has already been recorded");
      } else {
        toast.success("Attendance recorded successfully");
      }
      fetchRecords();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Save failed");
    }
  };

  const formatDate = (d) => (d ? new Date(d).toLocaleDateString() : "");

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-lg p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Attendance</h1>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h2 className="font-semibold">Mark Attendance</h2>
            <select
              className="w-full border rounded p-2 text-black"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
            >
              <option value="">Select course</option>
              {myCourses.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.title}
                </option>
              ))}
            </select>
            <input
              className="w-full border rounded p-2 text-black"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />

            <div className="space-y-2 max-h-[320px] overflow-y-auto">
              {students.map((s) => (
                <div key={s._id} className="flex items-center justify-between border rounded p-2">
                  <div>
                    <p className="font-semibold text-sm">{s.name}</p>
                    <p className="text-xs text-gray-600">{s.email}</p>
                  </div>
                  <select
                    className="border rounded p-1 text-sm text-black"
                    value={statuses[s._id] || "present"}
                    onChange={(e) =>
                      setStatuses((p) => ({ ...p, [s._id]: e.target.value }))
                    }
                  >
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="late">Late</option>
                  </select>
                </div>
              ))}
              {students.length === 0 && <p className="text-gray-500 text-sm">No students.</p>}
            </div>

            <button onClick={mark} className="px-4 py-2 bg-black text-white rounded-lg">
              Save Attendance
            </button>
          </div>

          <div className="space-y-3">
            <h2 className="font-semibold">Recent Records</h2>
            <div className="space-y-2 max-h-[520px] overflow-y-auto">
              {records.map((rec) => (
                <div key={rec._id} className="border rounded p-3">
                  <p className="text-sm font-semibold">{formatDate(rec.date)}</p>
                  <div className="text-xs text-gray-700 mt-1 space-y-1">
                    {rec.records.map((r, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>{r.studentId?.name || "Student"}</span>
                        <span className="capitalize">{r.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {records.length === 0 && <p className="text-gray-500 text-sm">No records.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Attendance;

