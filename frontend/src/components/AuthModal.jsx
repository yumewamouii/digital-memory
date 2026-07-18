import { useEffect, useRef } from "react";
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

  if (!modalOpen) return null;

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        closeAuthModal();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeAuthModal]);

  const handleOverlayMouseDown = (e) => {
    overlayPressStarted.current = e.target === e.currentTarget;
  };

  const handleOverlayMouseUp = (e) => {
    if (overlayPressStarted.current && e.target === e.currentTarget) {
      closeAuthModal();
    }
    overlayPressStarted.current = false;
  };

  return (
    <div
      className="modal-overlay"
      onMouseDown={handleOverlayMouseDown}
      onMouseUp={handleOverlayMouseUp}
    >
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
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

        <input
          placeholder="Email"
          type="email"
          autoComplete="email"
          value={auth.email}
          onChange={(e) => setAuth({ ...auth, email: e.target.value })}
        />

        {isRegister && (
          <input
            placeholder="ФИО"
            autoComplete="name"
            value={auth.full_name}
            onChange={(e) => setAuth({ ...auth, full_name: e.target.value })}
          />
        )}

        <input
          placeholder="Пароль"
          type="password"
          autoComplete={isRegister ? "new-password" : "current-password"}
          value={auth.password}
          onChange={(e) => setAuth({ ...auth, password: e.target.value })}
        />

        {isRegister ? (
          <button type="button" className="btn btn-primary" onClick={register}>
            Зарегистрироваться
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={login}>
            Войти
          </button>
        )}

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
      </div>
    </div>
  );
}
