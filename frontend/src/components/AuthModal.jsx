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
    authMethod,
    setAuthMethod,
    authView,
    setAuthView,
    forgotStep,
    phoneStep,
    setPhoneStep,
    requestPhoneCode,
    verifyPhone,
    requestForgotCode,
    resetPassword,
    oauthProviders,
    providerLabels,
    startOAuth,
    clearAuthFeedback,
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

  const title =
    authView === "forgot"
      ? "Восстановление пароля"
      : isRegister
        ? "Регистрация"
        : "Вход";

  const handleSubmit = (event) => {
    event.preventDefault();
    if (authView === "forgot") {
      if (forgotStep === 1) requestForgotCode();
      else resetPassword();
      return;
    }
    if (authMethod === "phone") {
      if (phoneStep === 1) requestPhoneCode();
      else verifyPhone();
      return;
    }
    if (isRegister) register();
    else login();
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
          <h2>{title}</h2>
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

        {authView === "auth" && oauthProviders.length > 0 && (
          <div className="auth-oauth">
            {oauthProviders.map((provider) => (
              <button
                key={provider}
                type="button"
                className="btn btn-outline auth-oauth-btn"
                onClick={() => startOAuth(provider)}
              >
                {providerLabels[provider] || provider}
              </button>
            ))}
          </div>
        )}

        <div className="auth-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            className={`auth-tab${authMethod === "email" ? " is-active" : ""}`}
            aria-selected={authMethod === "email"}
            onClick={() => {
              setAuthMethod("email");
              setPhoneStep(1);
              clearAuthFeedback();
            }}
          >
            Почта
          </button>
          <button
            type="button"
            role="tab"
            className={`auth-tab${authMethod === "phone" ? " is-active" : ""}`}
            aria-selected={authMethod === "phone"}
            onClick={() => {
              setAuthMethod("phone");
              setPhoneStep(1);
              clearAuthFeedback();
            }}
          >
            Телефон
          </button>
        </div>

        {authView === "forgot" ? (
          <>
            {authMethod === "email" ? (
              <div>
                <label className="form-label" htmlFor="auth-email">
                  Почта
                </label>
                <input
                  id="auth-email"
                  placeholder="Почта"
                  type="email"
                  autoComplete="email"
                  value={auth.email}
                  onChange={(e) => setAuth({ ...auth, email: e.target.value })}
                />
              </div>
            ) : (
              <div>
                <label className="form-label" htmlFor="auth-phone">
                  Телефон
                </label>
                <input
                  id="auth-phone"
                  placeholder="+7 900 123-45-67"
                  type="tel"
                  autoComplete="tel"
                  value={auth.phone}
                  onChange={(e) => setAuth({ ...auth, phone: e.target.value })}
                />
              </div>
            )}

            {forgotStep === 2 && (
              <>
                <div>
                  <label className="form-label" htmlFor="auth-code">
                    Код
                  </label>
                  <input
                    id="auth-code"
                    placeholder="Код из письма или смс"
                    value={auth.code}
                    onChange={(e) => setAuth({ ...auth, code: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label" htmlFor="auth-new-password">
                    Новый пароль
                  </label>
                  <input
                    id="auth-new-password"
                    placeholder="Новый пароль"
                    type="password"
                    autoComplete="new-password"
                    value={auth.new_password}
                    onChange={(e) => setAuth({ ...auth, new_password: e.target.value })}
                  />
                </div>
              </>
            )}

            <button type="submit" className="btn btn-primary">
              {forgotStep === 1 ? "Получить код" : "Сохранить пароль"}
            </button>

            <p className="switch-auth">
              <button
                type="button"
                className="link-btn"
                onClick={() => {
                  setAuthView("auth");
                  clearAuthFeedback();
                }}
              >
                Вернуться ко входу
              </button>
            </p>
          </>
        ) : authMethod === "phone" ? (
          <>
            <div>
              <label className="form-label" htmlFor="auth-phone">
                Телефон
              </label>
              <input
                id="auth-phone"
                placeholder="+7 900 123-45-67"
                type="tel"
                autoComplete="tel"
                value={auth.phone}
                onChange={(e) => setAuth({ ...auth, phone: e.target.value })}
              />
            </div>

            {phoneStep === 2 && (
              <div>
                <label className="form-label" htmlFor="auth-code">
                  Код из смс
                </label>
                <input
                  id="auth-code"
                  placeholder="Код"
                  value={auth.code}
                  onChange={(e) => setAuth({ ...auth, code: e.target.value })}
                />
              </div>
            )}

            {isRegister && phoneStep === 2 && (
              <p className="hint-text" style={{ margin: 0, fontSize: "0.85rem" }}>
                Регистрируясь, вы соглашаетесь с{" "}
                <Link to="/about#about-privacy" onClick={closeAuthModal}>
                  политикой обработки персональных данных
                </Link>
                .
              </p>
            )}

            <button type="submit" className="btn btn-primary">
              {phoneStep === 1
                ? "Получить код"
                : isRegister
                  ? "Зарегистрироваться"
                  : "Войти"}
            </button>
          </>
        ) : (
          <>
            <div>
              <label className="form-label" htmlFor="auth-email">
                Почта
              </label>
              <input
                id="auth-email"
                placeholder="Почта"
                type="email"
                autoComplete="email"
                value={auth.email}
                onChange={(e) => setAuth({ ...auth, email: e.target.value })}
              />
            </div>

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
          </>
        )}

        {authView === "auth" && (
          <>
            {!isRegister && (
              <p className="switch-auth">
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => {
                    setAuthView("forgot");
                    clearAuthFeedback();
                  }}
                >
                  Забыли пароль?
                </button>
              </p>
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
          </>
        )}
      </form>
    </div>
  );
}
