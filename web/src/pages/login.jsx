import { useEffect } from "react";
import { useStore } from "../libs/globalState";
import { useFormik } from "formik";
import * as Yup from "yup";
import logo from "../assets/icon.png";
import { login } from "../libs/requests";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
    const navigate = useNavigate();
    const { setUser, setAccessToken } = useStore();

    const formik = useFormik({
        initialValues: {
            email: "",
            password: "",
        },
        validateOnBlur: false,
        validateOnChange: false,
        validationSchema: Yup.object({
            email: Yup.string()
                .email("Invalid email format")
                .required("Email is required"),
            password: Yup.string()
                .min(6, "Password must be at least 6 characters")
                .required("Password is required"),
        }),

        async onSubmit(values) {
            const response = await login(values);

            if (response.error) {
                alert(response.error);
            } else {
                setUser(response.user);
                setAccessToken(response.accessToken);
                navigate("/");
            };
        },
    });

    useEffect(() => {
        const errors = Object.values(formik.errors);
        if (errors.length > 0) {
            alert(errors.join("\n"));
        }
    }, [formik.errors]);

    return <div className="h-screen bg-[#111821]">
        <div className="flex flex-col space-y-8 justify-center h-full max-w-lg mx-auto px-8">
            <img src={logo} alt="Logo" className="w-64 mx-auto" />
            <form onSubmit={formik.handleSubmit}>
                <input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="Email"
                    className="w-full p-3 rounded-md bg-[#192734] text-white mb-4"
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    value={formik.values.email}
                />

                <input
                    type="password"
                    id="password"
                    name="password"
                    placeholder="Password"
                    className="w-full p-3 rounded-md bg-[#192734] text-white mb-4"
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    value={formik.values.password}
                />

                <button
                    type="submit"
                    className="w-full bg-blue-500 hover:bg-blue-600 p-3 rounded-md text-white font-semibold"
                >
                    {formik.isSubmitting ? "Loading..." : "Login"}
                </button>
                <div className="mt-2 space-x-2">
                    <span className="text-white">Don't have an account?</span>
                    <Link to="/register" className="text-blue-500">
                        Register
                    </Link>
                </div>
            </form>
        </div>
    </div>
};