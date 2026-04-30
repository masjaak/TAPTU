import { createBrowserRouter } from "react-router-dom";

import { AppPage } from "./AppPage";
import { LandingPage } from "./LandingPage";
import { LoginPage } from "./LoginPage";

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
    path: "/app",
    element: <AppPage />
  }
]);
