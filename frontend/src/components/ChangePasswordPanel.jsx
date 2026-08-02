import { useEffect, useState } from "react";
import axios from "axios";
import { API } from "../api";
import { useAuth } from "../context/AuthContext";
import { getAuthErrorMessage } from "../utils/authErrors";

export default function ChangePasswordPanel() {
  const { user, authHeaders, loadMe, setMessage } = useAuth();
  const [channel, setChannel] = useState("email");
  const [step, setStep] = useState(1);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user?.email) setChannel("email");
    else if (user?.phone) setChannel("phone");
  }, [user]);

  if (!user) return null;

  const canEmail = Boolean(user.email);
  const canPhone = Boolean(user.phone);

  if (!canEmail && !canPhone) {
    return (
      <div className="notice-card" style={{ marginTop: "1.5rem" }}>
        <h3 className="cabinet-section-title" style={{ marginTop: 0 }}>
          Смена пароля
        </h3>
        <p className="empty-text">
          Привяжите почту или телефон, чтобы задать или сменить пароль.
        </p>
      </div>
    );
  }

  const requestCode = async () => {
    setError("");
    setSuccess("");
    setBusy(true);
    try {
      const { data } = await axios.post(
        `${API}/auth/password/change/request`,
        { channel },
        { headers: authHeaders },
      );
      setStep(2);
      setSuccess(
        data.message || "Код отправлен.",
      );
    } catch (err) {
      setError(getAuthErrorMessage(err, "Не удалось отправить код"));
    } finally {
      setBusy(false);
    }
  };

  const confirmChange = async () => {
    setError("");
    setSuccess("");
    if (!code.trim()) {
      setError("Укажите код");
      return;
    }
    if (newPassword.length < 8) {
      setError("Пароль должен содержать не менее 8 символов");
      return;
    }
    setBusy(true);
    try {
      await axios.post(
        `${API}/auth/password/change/confirm`,
        { channel, code: code.trim(), new_password: newPassword },
        { headers: authHeaders },
      );
      setSuccess("Пароль обновлён");
      setMessage("Пароль обновлён");
      setCode("");
      setNewPassword("");
      setStep(1);
      await loadMe();
    } catch (err) {
      setError(getAuthErrorMessage(err, "Не удалось сменить пароль"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="form-panel change-password-panel" style={{ marginTop: "1.5rem" }}>
      <h2 className="cabinet-section-title" style={{ marginTop: 0 }}>
        Смена пароля
      </h2>
      <p className="lead" style={{ marginTop: 0 }}>
        Подтвердите действие кодом на {channel === "email" ? "почту" : "телефон"}.
      </p>

      {error && <p className="auth-feedback auth-feedback-error">{error}</p>}
      {success && <p className="auth-feedback auth-feedback-success">{success}</p>}

      <div className="auth-tabs" role="tablist">
        {canEmail && (
          <button
            type="button"
            className={`auth-tab${channel === "email" ? " is-active" : ""}`}
            onClick={() => {
              setChannel("email");
              setStep(1);
              setError("");
              setSuccess("");
            }}
          >
            Почта
          </button>
        )}
        {canPhone && (
          <button
            type="button"
            className={`auth-tab${channel === "phone" ? " is-active" : ""}`}
            onClick={() => {
              setChannel("phone");
              setStep(1);
              setError("");
              setSuccess("");
            }}
          >
            Телефон
          </button>
        )}
      </div>

      {step === 1 ? (
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy}
          onClick={requestCode}
        >
          {busy ? "Отправляем…" : "Получить код"}
        </button>
      ) : (
        <div className="change-password-fields">
          <div>
            <label className="form-label" htmlFor="change-code">
              Код
            </label>
            <input
              id="change-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Код подтверждения"
            />
          </div>
          <div>
            <label className="form-label" htmlFor="change-password">
              Новый пароль
            </label>
            <input
              id="change-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Новый пароль"
            />
          </div>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={confirmChange}
          >
            {busy ? "Сохраняем…" : "Сохранить пароль"}
          </button>
        </div>
      )}
    </div>
  );
}
