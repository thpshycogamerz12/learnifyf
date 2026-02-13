import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import { ToastContainer} from 'react-toastify';
import ForgotPassword from './pages/ForgotPassword'
import { useSelector } from 'react-redux'
import Profile from './pages/Profile'
import EditProfile from './pages/EditProfile'
import Dashboard from './pages/admin/Dashboard'
import EducatorDashboard from './pages/admin/EducatorDashboard'
import Courses from './pages/admin/Courses'
import AllCouses from './pages/AllCouses'
import AddCourses from './pages/admin/AddCourses'
import CreateCourse from './pages/admin/CreateCourse'
import CreateLecture from './pages/admin/CreateLecture'
import EditLecture from './pages/admin/EditLecture'
import ViewCourse from './pages/ViewCourse'
import ScrollToTop from './components/ScrollToTop'
import DataLoader from './components/DataLoader'
import EnrolledCourse from './pages/EnrolledCourse'
import ViewLecture from './pages/ViewLecture'
import SearchWithAi from './pages/SearchWithAi'
import StudentDashboard from './pages/StudentDashboard'
import Assignments from './pages/admin/Assignments'
import AdminUsers from './pages/admin/AdminUsers'
import MyStudents from './pages/admin/MyStudents'
import Attendance from './pages/admin/Attendance'
import Notifications from './pages/admin/Notifications'
import LiveClasses from './pages/admin/LiveClasses'
import Grades from './pages/admin/Grades'
import Doubts from './pages/Doubts'

export const serverUrl = "http://localhost:8000"

function App() {
  
  let {userData} = useSelector(state=>state.user)

  return (
    <>
      <DataLoader />
      <ToastContainer />
      <ScrollToTop/>
      <Routes>
        <Route path='/' element={<Home/>}/>
        <Route path='/login' element={<Login/>}/>
        <Route path='/signup' element={!userData?<SignUp/>:<Navigate to={"/"}/>}/>
        <Route path='/profile' element={userData?<Profile/>:<Navigate to={"/signup"}/>}/>
        <Route path='/allcourses' element={userData?<AllCouses/>:<Navigate to={"/signup"}/>}/>
        <Route path='/viewcourse/:courseId' element={userData?<ViewCourse/>:<Navigate to={"/signup"}/>}/>
        <Route path='/editprofile' element={userData?<EditProfile/>:<Navigate to={"/signup"}/>}/>
        <Route path='/enrolledcourses' element={userData?<EnrolledCourse/>:<Navigate to={"/signup"}/>}/>
         <Route path='/viewlecture/:courseId' element={userData?<ViewLecture/>:<Navigate to={"/signup"}/>}/>
         <Route path='/searchwithai' element={userData?<SearchWithAi/>:<Navigate to={"/signup"}/>}/>
         <Route path='/student-dashboard' element={userData?<StudentDashboard/>:<Navigate to={"/signup"}/>}/>
        
        
        <Route path='/dashboard' element={
          userData?.role === "educator" || userData?.role === "admin" 
            ? <EducatorDashboard/> 
            : userData 
              ? <Navigate to={"/student-dashboard"}/> 
              : <Navigate to={"/signup"}/>
        }/>
        <Route path='/dashboard-old' element={userData?.role === "educator"?<Dashboard/>:<Navigate to={"/signup"}/>}/>
        <Route path='/courses' element={userData?.role === "educator"?<Courses/>:<Navigate to={"/signup"}/>}/>
        <Route path='/addcourses/:courseId' element={userData?.role === "educator"?<AddCourses/>:<Navigate to={"/signup"}/>}/>
        <Route path='/createcourses' element={userData?.role === "educator"?<CreateCourse/>:<Navigate to={"/signup"}/>}/>
        <Route path='/createlecture/:courseId' element={userData?.role === "educator"?<CreateLecture/>:<Navigate to={"/signup"}/>}/>
        <Route path='/editlecture/:courseId/:lectureId' element={userData?.role === "educator"?<EditLecture/>:<Navigate to={"/signup"}/>}/>
        <Route path='/assignments' element={userData?.role === "educator"?<Assignments/>:<Navigate to={"/signup"}/>}/>
        <Route path='/my-students' element={userData?.role === "educator"?<MyStudents/>:<Navigate to={"/signup"}/>}/>
        <Route path='/attendance' element={(userData?.role === "educator" || userData?.role==="admin")?<Attendance/>:<Navigate to={"/signup"}/>}/>
        <Route path='/notifications' element={(userData?.role === "educator" || userData?.role==="admin")?<Notifications/>:<Navigate to={"/signup"}/>}/>
        <Route path='/liveclasses' element={(userData?.role === "educator" || userData?.role==="admin")?<LiveClasses/>:<Navigate to={"/signup"}/>}/>
        <Route path='/grades' element={(userData?.role === "educator" || userData?.role==="admin")?<Grades/>:<Navigate to={"/signup"}/>}/>
        <Route path='/doubts' element={userData?<Doubts/>:<Navigate to={"/signup"}/>}/>
        <Route path='/admin/users' element={userData?.role === "admin"?<AdminUsers/>:<Navigate to={"/signup"}/>}/>
        <Route path='/forgotpassword' element={<ForgotPassword/>}/>
         </Routes>

         </>
   
  )
}

export default App
