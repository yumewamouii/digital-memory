import { createContext, useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { API } from "../api";
import {
  getAuthErrorMessage,
  validateLoginForm,
  validateRegisterForm,
} from "../utils/authErrors";

const AuthContext = createContext(null);

const PROVIDER_LABELS = {
  google: "Google",
  vk: "VK",
  mailru: "Mail.ru",
};

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "",
    code: "",
    new_password: "",
  });
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [authMethod, setAuthMethod] = useState("email"); // email | phone
  const [authView, setAuthView] = useState("auth"); // auth | forgot
  const [forgotStep, setForgotStep] = useState(1);
  const [phoneStep, setPhoneStep] = useState(1);
  const [oauthProviders, setOauthProviders] = useState([]);

  const authHeaders = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : {}),
    [token],
  );

  const clearAuthFeedback = () => {
    setAuthError("");
    setAuthSuccess("");
  };

  const resetModalFlow = () => {
    setAuthMethod("email");
    setAuthView("auth");
    setForgotStep(1);
    setPhoneStep(1);
    setAuth((prev) => ({ ...prev, code: "", new_password: "", phone: prev.phone }));
  };

  const openAuthModal = (register = false) => {
    setIsRegister(register);
    clearAuthFeedback();
    resetModalFlow();
    setModalOpen(true);
  };

  const closeAuthModal = () => {
    setModalOpen(false);
    clearAuthFeedback();
    resetModalFlow();
  };

  const switchAuthMode = (register) => {
    setIsRegister(register);
    clearAuthFeedback();
    setPhoneStep(1);
    setAuthView("auth");
    setForgotStep(1);
  };

  const applyToken = (accessToken) => {
    localStorage.setItem("token", accessToken);
    setToken(accessToken);
    // Claim guest trees created before login.
    import("../api/trees")
      .then(({ claimGuestTrees }) =>
        claimGuestTrees({ Authorization: `Bearer ${accessToken}` }),
      )
      .catch(() => {});
  };

  const loadMe = async (headers = authHeaders) => {
    if (!headers.Authorization) {
      setUser(null);
      return null;
    }
    try {
      const { data } = await axios.get(`${API}/auth/me`, { headers });
      setUser(data);
      return data;
    } catch {
      setUser(null);
      return null;
    }
  };

  useEffect(() => {
    if (token) {
      loadMe({ Authorization: `Bearer ${token}` }).catch(() => {});
    } else {
      setUser(null);
    }
  }, [token]);

  useEffect(() => {
    axios
      .get(`${API}/auth/oauth/providers`)
      .then(({ data }) => setOauthProviders(data.providers || []))
      .catch(() => setOauthProviders([]));
  }, []);

  const register = async () => {
    clearAuthFeedback();

    const validationError = validateRegisterForm(auth);
    if (validationError) {
      setAuthError(validationError);
      return;
    }

    try {
      await axios.post(`${API}/auth/register`, {
        email: auth.email,
        password: auth.password,
        full_name: auth.full_name,
      });
      setAuthSuccess("Регистрация успешна. Теперь выполните вход.");
      setIsRegister(false);
      setAuth({ ...auth, password: "" });
    } catch (error) {
      setAuthError(getAuthErrorMessage(error, "Не удалось зарегистрироваться"));
    }
  };

  const login = async () => {
    clearAuthFeedback();

    const validationError = validateLoginForm(auth);
    if (validationError) {
      setAuthError(validationError);
      return;
    }

    try {
      const form = new URLSearchParams();
      form.append("username", auth.email.trim());
      form.append("password", auth.password);
      const { data } = await axios.post(`${API}/auth/login`, form, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      applyToken(data.access_token);
      setMessage("Вход выполнен");
      setAuth({ ...auth, password: "" });
      closeAuthModal();
    } catch (error) {
      setAuthError(getAuthErrorMessage(error, "Не удалось выполнить вход"));
    }
  };

  const requestPhoneCode = async () => {
    clearAuthFeedback();
    if (!auth.phone.trim()) {
      setAuthError("Укажите номер телефона");
      return;
    }
    try {
      await axios.post(`${API}/auth/phone/request-code`, {
        phone: auth.phone.trim(),
        purpose: isRegister ? "register" : "login",
      });
      setPhoneStep(2);
      setAuthSuccess("Код отправлен. В режиме разработки смотрите лог backend.");
    } catch (error) {
      setAuthError(getAuthErrorMessage(error, "Не удалось отправить код"));
    }
  };

  const verifyPhone = async () => {
    clearAuthFeedback();
    if (!auth.code.trim()) {
      setAuthError("Укажите код из SMS");
      return;
    }
    if (isRegister && auth.full_name.trim().length < 2) {
      setAuthError("Укажите ФИО");
      return;
    }
    try {
      const payload = {
        phone: auth.phone.trim(),
        code: auth.code.trim(),
      };
      if (isRegister) {
        payload.full_name = auth.full_name.trim();
      }
      const { data } = await axios.post(`${API}/auth/phone/verify`, payload);
      applyToken(data.access_token);
      setMessage(isRegister ? "Регистрация выполнена" : "Вход выполнен");
      setAuth({ ...auth, code: "" });
      closeAuthModal();
    } catch (error) {
      setAuthError(getAuthErrorMessage(error, "Не удалось подтвердить код"));
    }
  };

  const startOAuth = async (provider) => {
    clearAuthFeedback();
    try {
      const { data } = await axios.get(`${API}/auth/oauth/${provider}/start`);
      window.location.href = data.redirect_url;
    } catch (error) {
      setAuthError(getAuthErrorMessage(error, "OAuth недоступен"));
    }
  };

  const requestForgotCode = async () => {
    clearAuthFeedback();
    const body =
      authMethod === "email"
        ? { email: auth.email.trim() }
        : { phone: auth.phone.trim() };
    if (authMethod === "email" && !auth.email.trim()) {
      setAuthError("Укажите email");
      return;
    }
    if (authMethod === "phone" && !auth.phone.trim()) {
      setAuthError("Укажите телефон");
      return;
    }
    try {
      const { data } = await axios.post(`${API}/auth/password/forgot`, body);
      setForgotStep(2);
      setAuthSuccess(
        data.message || "Код отправлен. В режиме разработки смотрите лог backend.",
      );
    } catch (error) {
      setAuthError(getAuthErrorMessage(error, "Не удалось отправить код"));
    }
  };

  const resetPassword = async () => {
    clearAuthFeedback();
    if (!auth.code.trim()) {
      setAuthError("Укажите код");
      return;
    }
    if (!auth.new_password || auth.new_password.length < 8) {
      setAuthError("Новый пароль должен содержать не менее 8 символов");
      return;
    }
    const body = {
      code: auth.code.trim(),
      new_password: auth.new_password,
      ...(authMethod === "email"
        ? { email: auth.email.trim() }
        : { phone: auth.phone.trim() }),
    };
    try {
      await axios.post(`${API}/auth/password/reset`, body);
      setAuthSuccess("Пароль обновлён. Теперь выполните вход.");
      setAuthView("auth");
      setIsRegister(false);
      setForgotStep(1);
      setAuth({ ...auth, code: "", new_password: "", password: "" });
    } catch (error) {
      setAuthError(getAuthErrorMessage(error, "Не удалось сбросить пароль"));
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken("");
    setUser(null);
    setMessage("Вы вышли из аккаунта");
  };

  const value = {
    auth,
    setAuth,
    token,
    user,
    loadMe,
    message,
    setMessage,
    authError,
    authSuccess,
    authHeaders,
    modalOpen,
    isRegister,
    authMethod,
    setAuthMethod,
    authView,
    setAuthView,
    forgotStep,
    phoneStep,
    setPhoneStep,
    oauthProviders,
    providerLabels: PROVIDER_LABELS,
    openAuthModal,
    closeAuthModal,
    switchAuthMode,
    register,
    login,
    requestPhoneCode,
    verifyPhone,
    startOAuth,
    requestForgotCode,
    resetPassword,
    applyToken,
    logout,
    clearAuthFeedback,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
