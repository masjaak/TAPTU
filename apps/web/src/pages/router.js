import { jsx as _jsx } from "react/jsx-runtime";
import { createBrowserRouter } from "react-router-dom";
import { AppPage } from "./AppPage";
import { LandingPage } from "./LandingPage";
import { LoginPage } from "./LoginPage";
export const router = createBrowserRouter([
    {
        path: "/",
        element: _jsx(LandingPage, {})
    },
    {
        path: "/login",
        element: _jsx(LoginPage, {})
    },
    {
        path: "/app",
        element: _jsx(AppPage, {})
    }
]);
