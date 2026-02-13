import { useEffect } from 'react'
import { serverUrl } from '../App'
import axios from 'axios'
import { setCreatorCourseData } from '../redux/courseSlice'
import { useDispatch, useSelector } from 'react-redux'
import { toast } from 'react-toastify'

const getCreatorCourseData = () => {
    const dispatch = useDispatch()
    const {userData} = useSelector(state=>state.user)
    
    useEffect(()=>{
        if (!userData || (userData.role !== "educator" && userData.role !== "admin")) {
            return;
        }
        
        const getCreatorData = async () => {
            try {
                const result = await axios.get(serverUrl + "/api/course/getcreatorcourses" , {withCredentials:true})
                await dispatch(setCreatorCourseData(result.data))
                console.log("Creator courses loaded:", result.data)
            } catch (error) {
                console.log("Error loading creator courses:", error)
                if (error.response?.data?.message) {
                    toast.error(error.response.data.message)
                }
            }
        }
        getCreatorData()
    },[userData])
}

export default getCreatorCourseData
