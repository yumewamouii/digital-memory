import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { applyToken, setMessage } = useAuth();
  const [status, setStatus] = useState("Завершаем вход…");
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return undefined;
    handled.current = true;

    // Prefer hash fragment only — query tokens leak via Referer/history/logs.
    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    const hashParams = new URLSearchParams(hash);
    const queryParams = new URLSearchParams(window.location.search);
    const token = hashParams.get("token");
    const error = queryParams.get("error") || hashParams.get("error");

    if (window.location.hash || queryParams.has("token")) {
      window.history.replaceState(null, "", window.location.pathname);
    }

    if (error) {
      setStatus("Не удалось войти через соцсеть");
      setMessage(typeof error === "string" ? error : "Ошибка авторизации");
      const timer = setTimeout(() => navigate("/cabinet", { replace: true }), 1500);
      return () => clearTimeout(timer);
    }

    if (token) {
      applyToken(token);
      setMessage("Вход выполнен");
      navigate("/cabinet", { replace: true });
      return undefined;
    }

    setStatus("Токен не получен");
    const timer = setTimeout(() => navigate("/cabinet", { replace: true }), 1500);
    return () => clearTimeout(timer);
  }, [applyToken, navigate, setMessage]);

  return (
    <section className="section">
      <div className="section-inner">
        <div className="notice-card form-panel" style={{ margin: "0 auto" }}>
          <h2>Авторизация</h2>
          <p className="lead">{status}</p>
        </div>
      </div>
    </section>
  );
}
