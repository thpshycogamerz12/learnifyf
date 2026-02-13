import { useEffect } from "react";
import getCurrentUser from "../customHooks/getCurrentUser";
import getCouseData from "../customHooks/getCouseData";
import getCreatorCourseData from "../customHooks/getCreatorCourseData";
import getAllReviews from "../customHooks/getAllReviews";
import useActivityPing from "../customHooks/useActivityPing";

// This component loads all necessary data
function DataLoader() {
  getCurrentUser();
  getCouseData();
  getCreatorCourseData();
  getAllReviews();
  useActivityPing();
  
  return null; // This component doesn't render anything
}

export default DataLoader;

