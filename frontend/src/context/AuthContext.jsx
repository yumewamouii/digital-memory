import { createContext, useContext, useMemo, useState } from "react";
import axios from "axios";
import { API } from "../api";
import {
  getAuthErrorMessage,
  validateLoginForm,
  validateRegisterForm,
} from "../utils/authErrors";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState({ email: "", password: "", full_name: "" });
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [message, setMessage] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [isRegister, setIsRegister] = useState(false);

  const authHeaders = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : {}),
    [token],
  );

  const clearAuthFeedback = () => {
    setAuthError("");
    setAuthSuccess("");
  };

  const openAuthModal = (register = false) => {
    setIsRegister(register);
    clearAuthFeedback();
    setModalOpen(true);
  };

  const closeAuthModal = () => {
    setModalOpen(false);
    clearAuthFeedback();
  };

  const switchAuthMode = (register) => {
    setIsRegister(register);
    clearAuthFeedback();
  };

  const register = async () => {
    clearAuthFeedback();

    const validationError = validateRegisterForm(auth);
    if (validationError) {
      setAuthError(validationError);
      return;
    }

    try {
      await axios.post(`${API}/auth/register`, auth);
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
      localStorage.setItem("token", data.access_token);
      setToken(data.access_token);
      setMessage("Вход выполнен");
      setAuth({ ...auth, password: "" });
      closeAuthModal();
    } catch (error) {
      setAuthError(getAuthErrorMessage(error, "Не удалось выполнить вход"));
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken("");
    setMessage("Вы вышли из аккаунта");
  };

  const value = {
    auth,
    setAuth,
    token,
    message,
    setMessage,
    authError,
    authSuccess,
    authHeaders,
    modalOpen,
    isRegister,
    openAuthModal,
    closeAuthModal,
    switchAuthMode,
    register,
    login,
    logout,
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
