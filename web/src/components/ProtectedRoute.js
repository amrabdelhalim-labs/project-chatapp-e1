import React from "react";
import { useStore } from "../libs/globalState";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute(props) {
  const { accessToken } = useStore();

  // Check if token exists and is not null or "null" string
  if (accessToken && accessToken !== "null" && accessToken !== "undefined") {
    return props.children;
  } else {
    return <Navigate to="/login" />;
  };
};