import { createBrowserRouter, RouterProvider } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Register from "./pages/register";
import Login from "./pages/login";

const router = createBrowserRouter([
    {
        path: "/",
        element: (
            <ProtectedRoute>
                <div>Home Page - Protected</div>
            </ProtectedRoute>
        ),
    },
    {
        path: "/register",
        element: <Register />,
    },
    {
        path: "/login",
        element: <Login />,
    }
]);

export default function Routes() {
    return <RouterProvider router={router} />;
};