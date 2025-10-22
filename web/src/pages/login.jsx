import { useStore } from "../libs/globalState";
import { useFormik } from "formik";
import * as Yup from "yup";
import logo from "../assets/icon.png";
import { login } from "../libs/requests";
import { useNavigate } from "react-router-dom";

export default function Login() {
    const navigate = useNavigate();
    const { setUser, setToken } = useStore();

    const formik = useFormik({
        initialValues: {
            email: "",
            password: "",
        },
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
                setToken(response.accessToken);
                navigate("/");
            };
        },
    });

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
                    Login
                </button>
            </form>
        </div>
    </div>
};