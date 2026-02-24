import { useStore } from "../libs/globalState";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const { accessToken } = useStore();

  // Check if token exists and is not null or "null" string
  if (accessToken && accessToken !== "null" && accessToken !== "undefined") {
    return children;
  }

  return <Navigate to="/login" />;
}