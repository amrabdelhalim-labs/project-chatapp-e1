import React from "react";
import { useStore } from "../libs/globalState";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute(props) {
  const { token } = useStore();

  if (token) {
    return props.children;
  } else {
    return <Navigate to="/login" />;
  };
};