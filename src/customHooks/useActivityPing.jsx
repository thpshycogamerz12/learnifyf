import { useEffect } from "react";
import axios from "axios";
import { serverUrl } from "../App";
import { useSelector } from "react-redux";

const useActivityPing = () => {
  const { userData } = useSelector((state) => state.user);

  useEffect(() => {
    if (!userData) return;
    const send = () =>
      axios
        .post(
          `${serverUrl}/api/user/activity`,
          { minutes: 1 },
          { withCredentials: true }
        )
        .catch(() => {});

    send(); // initial ping
    const id = setInterval(send, 60 * 1000);
    return () => clearInterval(id);
  }, [userData]);
};

export default useActivityPing;

