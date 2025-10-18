import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Register from "./pages/register";

const router = createBrowserRouter([
    {
        path: "/",
        element: <h1>Home Page</h1>,
    },
    {
        path: "/register",
        element: <Register />,
    },
]);

export default function Routes() {
    return <RouterProvider router={router} />;
};