import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import AuthModal from "./AuthModal";
import Footer from "./Footer";
import Header from "./Header";
import { useAuth } from "../context/AuthContext";

export default function Layout() {
  const { message, setMessage } = useAuth();
  const location = useLocation();

  useEffect(() => {
    setMessage("");
  }, [location.pathname, setMessage]);

  useEffect(() => {
    if (!location.hash) {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      return;
    }
    const element = document.querySelector(location.hash);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [location.pathname, location.hash]);

  return (
    <div className="app-shell">
      <Header />
      {message && <div className="toast">{message}</div>}
      <main className="main-content">
        <Outlet />
      </main>
      <Footer />
      <AuthModal />
    </div>
  );
}
