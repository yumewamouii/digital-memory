import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AuthModal() {
  const overlayPressStarted = useRef(false);

  const {
    modalOpen,
    closeAuthModal,
    isRegister,
    switchAuthMode,
    auth,
    setAuth,
    authError,
    authSuccess,
    register,
    login,
  } = useAuth();

  useEffect(() => {
    if (!modalOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        closeAuthModal();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modalOpen, closeAuthModal]);

  if (!modalOpen) return null;

  const handleOverlayMouseDown = (e) => {
    overlayPressStarted.current = e.target === e.currentTarget;
  };

  const handleOverlayMouseUp = (e) => {
    if (overlayPressStarted.current && e.target === e.currentTarget) {
      closeAuthModal();
    }
    overlayPressStarted.current = false;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isRegister) {
      register();
    } else {
      login();
    }
  };

  return (
    <div
      className="modal-overlay"
      onMouseDown={handleOverlayMouseDown}
      onMouseUp={handleOverlayMouseUp}
    >
      <form
        className="modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="modal-top">
          <h2>{isRegister ? "Регистрация" : "Вход"}</h2>
          <button
            type="button"
            className="modal-close"
            aria-label="Закрыть окно авторизации"
            onClick={closeAuthModal}
          >
            ×
          </button>
        </div>

        {authError && <p className="auth-feedback auth-feedback-error">{authError}</p>}
        {authSuccess && <p className="auth-feedback auth-feedback-success">{authSuccess}</p>}

        <div>
          <label className="form-label" htmlFor="auth-email">
            Email
          </label>
          <input
            id="auth-email"
            placeholder="Email"
            type="email"
            autoComplete="email"
            value={auth.email}
            onChange={(e) => setAuth({ ...auth, email: e.target.value })}
          />
        </div>

        {isRegister && (
          <div>
            <label className="form-label" htmlFor="auth-name">
              ФИО
            </label>
            <input
              id="auth-name"
              placeholder="ФИО"
              autoComplete="name"
              value={auth.full_name}
              onChange={(e) => setAuth({ ...auth, full_name: e.target.value })}
            />
          </div>
        )}

        <div>
          <label className="form-label" htmlFor="auth-password">
            Пароль
          </label>
          <input
            id="auth-password"
            placeholder="Пароль"
            type="password"
            autoComplete={isRegister ? "new-password" : "current-password"}
            value={auth.password}
            onChange={(e) => setAuth({ ...auth, password: e.target.value })}
          />
        </div>

        {isRegister && (
          <p className="hint-text" style={{ margin: 0, fontSize: "0.85rem" }}>
            Регистрируясь, вы соглашаетесь с{" "}
            <Link to="/about#about-privacy" onClick={closeAuthModal}>
              политикой обработки персональных данных
            </Link>
            .
          </p>
        )}

        <button type="submit" className="btn btn-primary">
          {isRegister ? "Зарегистрироваться" : "Войти"}
        </button>

        <p className="switch-auth">
          {isRegister ? "Уже есть аккаунт?" : "У вас еще нет аккаунта?"}
          <button
            type="button"
            className="link-btn"
            onClick={() => switchAuthMode(!isRegister)}
          >
            {isRegister ? " Войти" : " Регистрация"}
          </button>
        </p>
      </form>
    </div>
  );
}
