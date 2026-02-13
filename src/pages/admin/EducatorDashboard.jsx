import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { serverUrl } from "../../App";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { 
  FaBook, 
  FaClipboardList, 
  FaUsers, 
  FaCalendarCheck, 
  FaBell, 
  FaVideo, 
  FaGraduationCap,
  FaQuestionCircle
} from "react-icons/fa";
import { FaArrowLeftLong } from "react-icons/fa6";

function EducatorDashboard() {
  try {
    const navigate = useNavigate();
    const { userData } = useSelector((state) => state.user);
    const { creatorCourseData } = useSelector((state) => state.course);

    const [activeTab, setActiveTab] = useState("overview");
    const [pendingDoubtsCount, setPendingDoubtsCount] = useState(0);

    // Debug logging
    console.log("EducatorDashboard rendered", { 
      hasUserData: !!userData, 
      userRole: userData?.role,
      coursesCount: creatorCourseData?.length || 0,
      activeTab 
    });

    // Safety checks
    if (!userData) {
      console.log("No userData, showing loading");
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <p className="text-gray-600 text-lg">Loading user data...</p>
        </div>
      );
    }

    if (userData.role !== "educator" && userData.role !== "admin") {
      console.log("User role check failed", userData.role);
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600 text-lg mb-2">Access denied.</p>
            <p className="text-gray-500">Educator access required. Current role: {userData.role}</p>
            <button 
              onClick={() => navigate("/student-dashboard")}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go to Student Dashboard
            </button>
          </div>
        </div>
      );
    }

  // Sample data for charts with safety checks
  const courseProgressData = (creatorCourseData || []).map(course => ({
    name: (course.title || "Course").slice(0, 10) + "...",
    lectures: (course.lectures || []).length
  }));

  const enrollData = (creatorCourseData || []).map(course => ({
    name: (course.title || "Course").slice(0, 10) + "...",
    enrolled: (course.enrolledStudents || []).length
  }));

  const totalEarnings = (creatorCourseData || []).reduce((sum, course) => {
    const studentCount = (course.enrolledStudents || []).length;
    const courseRevenue = course.price ? course.price * studentCount : 0;
    return sum + courseRevenue;
  }, 0);

  // Fetch pending doubts count
  useEffect(() => {
    const fetchPendingDoubts = async () => {
      try {
        const res = await axios.get(`${serverUrl}/api/doubts/assigned?status=pending`, {
          withCredentials: true,
        });
        setPendingDoubtsCount(res.data?.length || 0);
      } catch (error) {
        console.error("Failed to fetch pending doubts:", error);
      }
    };
    fetchPendingDoubts();
  }, []);

  console.log("About to render dashboard JSX", {
    userData: !!userData,
    creatorCourseData: creatorCourseData?.length || 0
  });

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 relative">
      <div className="max-w-7xl mx-auto">
        <button
          onClick={() => navigate("/")}
          className='fixed top-[20px] left-[20px] z-10 bg-white p-2 rounded-full shadow-md hover:bg-gray-100'
          aria-label="Go back"
        >
          <FaArrowLeftLong className='w-[22px] h-[22px]' />
        </button>

        {/* Welcome Section */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6 flex flex-col md:flex-row items-center gap-6">
          <div className="w-28 h-28 rounded-full bg-gray-200 flex items-center justify-center border-4 border-black shadow-md">
            {userData?.photoUrl ? (
              <img
                src={userData.photoUrl}
                alt="Educator"
                className="w-full h-full rounded-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div className="w-full h-full rounded-full bg-gray-300 flex items-center justify-center text-3xl font-bold text-gray-600" style={{ display: userData?.photoUrl ? 'none' : 'flex' }}>
              {userData?.name?.charAt(0)?.toUpperCase() || "E"}
            </div>
          </div>
          <div className="text-center md:text-left space-y-1 flex-1">
            <h1 className="text-2xl font-bold text-gray-800">
              Welcome, {userData?.name || "Educator"} 👋
            </h1>
            <h1 className='text-xl font-semibold text-gray-800'>
              Total Earning: <span className='font-light text-gray-900'>₹{totalEarnings.toLocaleString()}</span>
            </h1>
            <p className="text-gray-600 text-sm">
              {userData?.description || "Start creating amazing courses for your students!"}
            </p>
          </div>
          <button 
            className='px-4 py-2 border-2 bg-black border-black text-white rounded-lg text-sm font-light flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-800' 
            onClick={() => navigate("/courses")}
          >
            Create Courses
          </button>
        </div>

        {/* Tabs Navigation */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-4 py-2 rounded-lg border flex items-center gap-2 ${
                activeTab === "overview" ? "bg-black text-white" : "bg-white"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("courses")}
              className={`px-4 py-2 rounded-lg border flex items-center gap-2 ${
                activeTab === "courses" ? "bg-black text-white" : "bg-white"
              }`}
            >
              <FaBook /> Courses
            </button>
            <button
              onClick={() => setActiveTab("assignments")}
              className={`px-4 py-2 rounded-lg border flex items-center gap-2 ${
                activeTab === "assignments" ? "bg-black text-white" : "bg-white"
              }`}
            >
              <FaClipboardList /> Assignments
            </button>
            <button
              onClick={() => setActiveTab("students")}
              className={`px-4 py-2 rounded-lg border flex items-center gap-2 ${
                activeTab === "students" ? "bg-black text-white" : "bg-white"
              }`}
            >
              <FaUsers /> My Students
            </button>
            <button
              onClick={() => setActiveTab("attendance")}
              className={`px-4 py-2 rounded-lg border flex items-center gap-2 ${
                activeTab === "attendance" ? "bg-black text-white" : "bg-white"
              }`}
            >
              <FaCalendarCheck /> Attendance
            </button>
            <button
              onClick={() => setActiveTab("notifications")}
              className={`px-4 py-2 rounded-lg border flex items-center gap-2 ${
                activeTab === "notifications" ? "bg-black text-white" : "bg-white"
              }`}
            >
              <FaBell /> Notifications
            </button>
            <button
              onClick={() => setActiveTab("liveclasses")}
              className={`px-4 py-2 rounded-lg border flex items-center gap-2 ${
                activeTab === "liveclasses" ? "bg-black text-white" : "bg-white"
              }`}
            >
              <FaVideo /> Live Classes
            </button>
            <button
              onClick={() => setActiveTab("grades")}
              className={`px-4 py-2 rounded-lg border flex items-center gap-2 ${
                activeTab === "grades" ? "bg-black text-white" : "bg-white"
              }`}
            >
              <FaGraduationCap /> Grades
            </button>
            <button
              onClick={() => setActiveTab("doubts")}
              className={`px-4 py-2 rounded-lg border flex items-center gap-2 ${
                activeTab === "doubts" ? "bg-black text-white" : "bg-white"
              }`}
            >
              <FaQuestionCircle /> Doubts & Questions
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow p-6">
          {activeTab === "overview" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold mb-4">Dashboard Overview</h2>
              
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Total Courses</p>
                  <p className="text-2xl font-bold">{(creatorCourseData || []).length}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Total Students</p>
                  <p className="text-2xl font-bold">
                    {(creatorCourseData || []).reduce((sum, course) => 
                      sum + ((course.enrolledStudents || []).length), 0)}
                  </p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Total Earnings</p>
                  <p className="text-2xl font-bold">₹{totalEarnings.toLocaleString()}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Total Lectures</p>
                  <p className="text-2xl font-bold">
                    {(creatorCourseData || []).reduce((sum, course) => 
                      sum + ((course.lectures || []).length), 0)}
                  </p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Pending Doubts</p>
                  <p className="text-2xl font-bold">{pendingDoubtsCount}</p>
                  {pendingDoubtsCount > 0 && (
                    <button
                      onClick={() => {
                        setActiveTab("doubts");
                        navigate("/doubts");
                      }}
                      className="mt-2 text-xs text-orange-700 hover:underline"
                    >
                      View Doubts →
                    </button>
                  )}
                </div>
              </div>

              {/* Charts Section */}
              {courseProgressData.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-lg font-semibold mb-4">Course Progress (Lectures)</h2>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={courseProgressData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="lectures" fill="black" radius={[5, 5, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-lg font-semibold mb-4">Student Enrollment</h2>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={enrollData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="enrolled" fill="black" radius={[5, 5, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
              {courseProgressData.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">No courses yet. Create your first course to see statistics!</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "courses" && (
            <div className="text-center py-12">
              <FaBook className="text-6xl text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Course Management</h3>
              <p className="text-gray-600 mb-4">Manage your courses, create new ones, and edit existing courses</p>
              <button
                onClick={() => navigate("/courses")}
                className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800"
              >
                Go to Courses
              </button>
            </div>
          )}
          {activeTab === "assignments" && (
            <div className="text-center py-12">
              <FaClipboardList className="text-6xl text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Assignments</h3>
              <p className="text-gray-600 mb-4">Create and manage assignments for your students</p>
              <button
                onClick={() => navigate("/assignments")}
                className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800"
              >
                Go to Assignments
              </button>
            </div>
          )}
          {activeTab === "students" && (
            <div className="text-center py-12">
              <FaUsers className="text-6xl text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">My Students</h3>
              <p className="text-gray-600 mb-4">View and manage all students enrolled in your courses</p>
              <button
                onClick={() => navigate("/my-students")}
                className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800"
              >
                Go to My Students
              </button>
            </div>
          )}
          {activeTab === "attendance" && (
            <div className="text-center py-12">
              <FaCalendarCheck className="text-6xl text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Attendance</h3>
              <p className="text-gray-600 mb-4">Track and manage student attendance</p>
              <button
                onClick={() => navigate("/attendance")}
                className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800"
              >
                Go to Attendance
              </button>
            </div>
          )}
          {activeTab === "notifications" && (
            <div className="text-center py-12">
              <FaBell className="text-6xl text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Notifications</h3>
              <p className="text-gray-600 mb-4">Create and manage notifications and events for students</p>
              <button
                onClick={() => navigate("/notifications")}
                className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800"
              >
                Go to Notifications
              </button>
            </div>
          )}
          {activeTab === "liveclasses" && (
            <div className="text-center py-12">
              <FaVideo className="text-6xl text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Live Classes</h3>
              <p className="text-gray-600 mb-4">Schedule and manage live classes for your students</p>
              <button
                onClick={() => navigate("/liveclasses")}
                className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800"
              >
                Go to Live Classes
              </button>
            </div>
          )}
          {activeTab === "grades" && (
            <div className="text-center py-12">
              <FaGraduationCap className="text-6xl text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Grades & Marks</h3>
              <p className="text-gray-600 mb-4">Upload and manage student grades and marks</p>
              <button
                onClick={() => navigate("/grades")}
                className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800"
              >
                Go to Grades
              </button>
            </div>
          )}
          {activeTab === "doubts" && (
            <div className="text-center py-12">
              <FaQuestionCircle className="text-6xl text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Doubts & Questions</h3>
              <p className="text-gray-600 mb-4">View and respond to student doubts and questions</p>
              <button
                onClick={() => navigate("/doubts")}
                className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800"
              >
                Go to Doubts
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
  } catch (error) {
    console.error("EducatorDashboard error:", error);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-2">Error loading dashboard</p>
          <p className="text-gray-500 text-sm mb-4">{error.message}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }
}

export default EducatorDashboard;
