import React, { useEffect, useState } from "react";
import axios from "axios";
import { serverUrl } from "../App";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { FaArrowLeftLong } from "react-icons/fa6";

function EnrolledCourse() {
  const navigate = useNavigate();
  const { userData } = useSelector((state) => state.user);

  const [courses, setCourses] = useState([]);
  const [progress, setProgress] = useState({});

  // Load enrolled courses
  useEffect(() => {
    axios.get(`${serverUrl}/api/user/enrolled`, { withCredentials: true })
      .then((res) => setCourses(res.data))
      .catch((err) => console.log("Enrolled fetch error", err));
  }, []);

  // Fetch progress for each enrolled course
  useEffect(() => {
    if (!courses.length || !userData?._id) return;

    courses.forEach((c) => {
      axios.get(`${serverUrl}/api/progress/get/${userData._id}/${c._id}`)
        .then((res) => {
          setProgress(prev => ({
            ...prev,
            [c._id]: res.data?.completion ?? 0
          }))
        })
        .catch(() => {});
    });
  }, [courses]);

  return (
    <div className="min-h-screen px-6 py-10 bg-gray-50">

      <FaArrowLeftLong className="absolute left-6 top-6 text-xl cursor-pointer"
        onClick={() => navigate("/")}
      />

      <h1 className="text-3xl text-center font-bold mb-6">
        {userData?.role === "educator" || userData?.role === "admin" 
          ? "My Created Courses" 
          : "My Enrolled Courses"}
      </h1>

      {courses.length === 0 ? (
        <p className="text-center text-gray-500">
          {userData?.role === "educator" || userData?.role === "admin"
            ? "No courses created yet."
            : "No enrolled courses found."}
        </p>
      ) : (
        <div className="flex flex-wrap justify-center gap-6">
          {courses.map((course) => (
            <div key={course._id}
              className="bg-white w-[270px] shadow rounded-xl overflow-hidden">

              <img src={course.thumbnail} className="w-full h-40 object-cover" />

              {/* Progress Bar */}
              <div className="w-full bg-gray-300 h-2 mt-2 rounded">
                <div
                  style={{ width: `${progress[course._id] ?? 0}%` }}
                  className="h-2 bg-green-600 rounded">
                </div>
              </div>

              <p className="text-center text-sm font-semibold mt-1">
                {progress[course._id] ?? 0}% Completed
              </p>

              <div className="p-4 text-center">
                <h2 className="font-bold">{course.title}</h2>
                <p className="text-gray-500 text-sm">{course.category}</p>

                {(userData?.role === "educator" || userData?.role === "admin") ? (
                  <button
                    className="w-full bg-blue-600 text-white py-2 mt-3 rounded hover:bg-blue-700"
                    onClick={() => navigate(`/addcourses/${course._id}`)}
                  >
                    Manage Course
                  </button>
                ) : (
                  <button
                    className="w-full bg-black text-white py-2 mt-3 rounded hover:bg-gray-800"
                    onClick={() => navigate(`/viewlecture/${course._id}`)}
                  >
                    Continue Learning
                  </button>
                )}
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default EnrolledCourse;
