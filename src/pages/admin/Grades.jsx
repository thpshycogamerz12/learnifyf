import React, { useEffect, useState } from "react";
import axios from "axios";
import { serverUrl } from "../../App";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { FaGraduationCap, FaEdit, FaTrash, FaPlus, FaChartBar, FaFileUpload } from "react-icons/fa";

function Grades() {
  const { userData } = useSelector((state) => state.user);
  const { courseData } = useSelector((state) => state.course);

  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [grades, setGrades] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingGrade, setEditingGrade] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [formData, setFormData] = useState({
    studentId: "",
    courseId: "",
    subject: "",
    assignmentName: "",
    examType: "assignment",
    marksObtained: "",
    totalMarks: "",
    remarks: "",
    date: new Date().toISOString().split("T")[0],
    isPublished: false,
  });

  const { creatorCourseData } = useSelector((state) => state.course);
  
  // Use creatorCourseData if available, otherwise filter courseData
  const myCourses = (() => {
    if (creatorCourseData && creatorCourseData.length > 0) {
      return creatorCourseData;
    }
    return courseData?.filter(
      (c) => c.creator?._id === userData?._id || c.creator === userData?._id
    ) || [];
  })();

  const fetchGrades = async () => {
    if (!selectedCourse) {
      setGrades([]);
      return;
    }
    setLoading(true);
    try {
      const res = await axios.get(`${serverUrl}/api/grades/course/${selectedCourse}`, {
        withCredentials: true,
      });
      setGrades(res.data || []);
    } catch (error) {
      toast.error("Failed to fetch grades");
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    if (!selectedCourse) {
      setStudents([]);
      return;
    }
    try {
      const res = await axios.get(`${serverUrl}/api/course/getcourse/${selectedCourse}/students`, {
        withCredentials: true,
      });
      setStudents(res.data || []);
    } catch (error) {
      console.error("Failed to fetch students", error);
      setStudents([]);
    }
  };

  const fetchStatistics = async () => {
    if (!selectedCourse) return;
    try {
      const res = await axios.get(`${serverUrl}/api/grades/course/${selectedCourse}/statistics`, {
        withCredentials: true,
      });
      setStatistics(res.data);
    } catch (error) {
      // Silent fail
    }
  };

  useEffect(() => {
    fetchGrades();
    fetchStudents();
    fetchStatistics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourse]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        marksObtained: parseFloat(formData.marksObtained),
        totalMarks: parseFloat(formData.totalMarks),
      };

      if (editingGrade) {
        await axios.patch(`${serverUrl}/api/grades/${editingGrade._id}`, payload, {
          withCredentials: true,
        });
        toast.success("Grade updated successfully");
      } else {
        const response = await axios.post(`${serverUrl}/api/grades`, payload, {
          withCredentials: true,
        });
        
        if (response.data.alreadyExists) {
          toast.info("A grade for this student, subject, and assignment already exists");
        } else {
          toast.success("Grade recorded successfully");
        }
      }
      setShowModal(false);
      setEditingGrade(null);
      resetForm();
      fetchGrades();
      fetchStatistics();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save grade");
    }
  };

  const handleEdit = (grade) => {
    setEditingGrade(grade);
    setFormData({
      studentId: grade.studentId._id || grade.studentId,
      courseId: grade.courseId._id || grade.courseId,
      subject: grade.subject,
      assignmentName: grade.assignmentName || "",
      examType: grade.examType || "assignment",
      marksObtained: grade.marksObtained,
      totalMarks: grade.totalMarks,
      remarks: grade.remarks || "",
      date: new Date(grade.date).toISOString().split("T")[0],
      isPublished: grade.isPublished || false,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this grade?")) return;
    try {
      await axios.delete(`${serverUrl}/api/grades/${id}`, {
        withCredentials: true,
      });
      toast.success("Grade deleted successfully");
      fetchGrades();
      fetchStatistics();
    } catch (error) {
      toast.error("Failed to delete grade");
    }
  };

  const resetForm = () => {
    setFormData({
      studentId: selectedStudent || "",
      courseId: selectedCourse || "",
      subject: "",
      assignmentName: "",
      examType: "assignment",
      marksObtained: "",
      totalMarks: "",
      remarks: "",
      date: new Date().toISOString().split("T")[0],
      isPublished: false,
    });
  };

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

  const filteredGrades = selectedStudent
    ? grades.filter((g) => (g.studentId._id || g.studentId) === selectedStudent)
    : grades;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            <FaGraduationCap className="text-blue-600" />
            Grades & Marks Management
          </h1>
          <button
            onClick={() => {
              resetForm();
              setEditingGrade(null);
              setShowModal(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            disabled={!selectedCourse}
          >
            <FaPlus /> Upload Grade
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Select Course *</label>
              <select
                value={selectedCourse}
                onChange={(e) => {
                  setSelectedCourse(e.target.value);
                  setSelectedStudent("");
                }}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Select a course</option>
                {myCourses.map((course) => (
                  <option key={course._id} value={course._id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Filter by Student</label>
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                disabled={!selectedCourse}
              >
                <option value="">All Students</option>
                {students.map((student) => (
                  <option key={student._id} value={student._id}>
                    {student.name} ({student.email})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Statistics */}
        {statistics && selectedCourse && (
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <FaChartBar /> Course Statistics
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total Grades</p>
                <p className="text-2xl font-bold">{statistics.totalGrades}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Average Percentage</p>
                <p className="text-2xl font-bold">{statistics.averagePercentage}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Highest Grade</p>
                <p className="text-2xl font-bold">
                  {Object.entries(statistics.gradeDistribution)
                    .filter(([_, count]) => count > 0)
                    .sort(([a], [b]) => {
                      const order = ["A+", "A", "B+", "B", "C+", "C", "D", "F"];
                      return order.indexOf(a) - order.indexOf(b);
                    })[0]?.[0] || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Subjects</p>
                <p className="text-2xl font-bold">
                  {Object.keys(statistics.subjectStats || {}).length}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Grades Table */}
        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : !selectedCourse ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <FaGraduationCap className="text-6xl text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Please select a course to view grades</p>
          </div>
        ) : filteredGrades.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <FaGraduationCap className="text-6xl text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No grades uploaded yet</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Student</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Subject</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Assignment</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Type</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Marks</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Percentage</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Grade</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredGrades.map((grade) => (
                    <tr key={grade._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        {grade.studentId?.name || "Unknown"}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">{grade.subject}</td>
                      <td className="px-4 py-3 text-sm">{grade.assignmentName || "-"}</td>
                      <td className="px-4 py-3 text-sm capitalize">{grade.examType}</td>
                      <td className="px-4 py-3 text-sm">
                        {grade.marksObtained} / {grade.totalMarks}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold">{grade.percentage}%</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-bold ${getGradeColor(
                            grade.grade
                          )}`}
                        >
                          {grade.grade}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {new Date(grade.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(grade)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => handleDelete(grade._id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">
                {editingGrade ? "Edit Grade" : "Upload Grade"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Course *</label>
                    <select
                      required
                      value={formData.courseId}
                      onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="">Select course</option>
                      {myCourses.map((course) => (
                        <option key={course._id} value={course._id}>
                          {course.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Student *</label>
                    <select
                      required
                      value={formData.studentId}
                      onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="">Select student</option>
                      {students.map((student) => (
                        <option key={student._id} value={student._id}>
                          {student.name} ({student.email})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Subject *</label>
                    <input
                      type="text"
                      required
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="e.g., Mathematics, Science"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Exam Type</label>
                    <select
                      value={formData.examType}
                      onChange={(e) => setFormData({ ...formData, examType: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="assignment">Assignment</option>
                      <option value="quiz">Quiz</option>
                      <option value="midterm">Midterm</option>
                      <option value="final">Final</option>
                      <option value="project">Project</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Assignment Name</label>
                  <input
                    type="text"
                    value={formData.assignmentName}
                    onChange={(e) =>
                      setFormData({ ...formData, assignmentName: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Optional"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Marks Obtained *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.marksObtained}
                      onChange={(e) =>
                        setFormData({ ...formData, marksObtained: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Total Marks *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="0.01"
                      value={formData.totalMarks}
                      onChange={(e) =>
                        setFormData({ ...formData, totalMarks: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Date</label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Remarks</label>
                  <textarea
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows="3"
                    placeholder="Optional feedback or comments"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isPublished"
                    checked={formData.isPublished}
                    onChange={(e) =>
                      setFormData({ ...formData, isPublished: e.target.checked })
                    }
                    className="w-4 h-4"
                  />
                  <label htmlFor="isPublished" className="text-sm">
                    Publish grade (visible to student)
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    {editingGrade ? "Update" : "Upload"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingGrade(null);
                      resetForm();
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
    </div>
  );
}

export default Grades;

