import { createBrowserRouter } from "react-router-dom";

import { AppPage } from "./AppPage";
import { LandingPage } from "./LandingPage";
import { LoginPage } from "./LoginPage";
import { RegisterPage } from "./RegisterPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <LandingPage />
  },
  {
    path: "/login",
    element: <LoginPage />
  },
  {
    path: "/register",
    element: <RegisterPage />
  },
  {
    path: "/app/:section?",
    element: <AppPage />
  }
]);
