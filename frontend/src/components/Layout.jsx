import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import AuthModal from "./AuthModal";
import Footer from "./Footer";
import Header from "./Header";
import { useAuth } from "../context/AuthContext";

const TOAST_VISIBLE_MS = 5000;
const TOAST_FADE_MS = 450;

export default function Layout() {
  const { message, setMessage } = useAuth();
  const location = useLocation();
  const [toastText, setToastText] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [toastFading, setToastFading] = useState(false);

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

  useEffect(() => {
    if (!message) return undefined;

    setToastText(message);
    setToastVisible(true);
    setToastFading(false);

    const fadeTimer = window.setTimeout(() => setToastFading(true), TOAST_VISIBLE_MS);
    const clearTimer = window.setTimeout(() => {
      setToastVisible(false);
      setToastFading(false);
      setToastText("");
      setMessage("");
    }, TOAST_VISIBLE_MS + TOAST_FADE_MS);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(clearTimer);
    };
  }, [message, setMessage]);

  return (
    <div className="app-shell">
      <Header />
      {toastVisible && toastText ? (
        <div className={`toast${toastFading ? " toast--fade-out" : ""}`}>{toastText}</div>
      ) : null}
      <main className="main-content">
        <Outlet />
      </main>
      <Footer />
      <AuthModal />
    </div>
  );
}
