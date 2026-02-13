import axios from "axios";
import { serverUrl } from "../App";
import { useDispatch } from "react-redux";
import { setCourseData } from "../redux/courseSlice";
import { useEffect } from "react";

export default function getCouseData() {
  const dispatch = useDispatch();

  useEffect(() => {
    axios.get(`${serverUrl}/api/course/getallcourse`)
      .then(res => {
        dispatch(setCourseData(res.data));
        console.log("COURSES LOADED:", res.data);
      })
      .catch(err => console.log("COURSE FETCH ERROR:", err));
  }, []);
}
