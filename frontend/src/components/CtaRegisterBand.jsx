import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function CtaRegisterBand({
  title = "Лучший способ сохранить воспоминания",
  text = "Создайте страницу памяти вашего близкого или напишите собственную историю. Сохраните историю вашей семьи прямо сейчас.",
}) {
  const { openAuthModal, auth, setAuth, register, setMessage } = useAuth();
  const [agree, setAgree] = useState(false);

  const handleRegister = async (event) => {
    event.preventDefault();
    if (!agree) {
      setMessage("Нужно согласие на обработку персональных данных");
      return;
    }
    openAuthModal(true);
    await register();
  };

  return (
    <section className="section section-dark" id="home-cta">
      <div className="section-inner">
        <div className="cta-register">
          <div className="cta-register-copy">
            <h2>{title}</h2>
            <p>{text}</p>
          </div>
          <form className="form-panel" onSubmit={handleRegister}>
            <h3 style={{ marginTop: 0 }}>Регистрация</h3>
            <div className="form-grid">
              <input
                type="email"
                placeholder="Email"
                autoComplete="email"
                value={auth.email}
                onChange={(e) => setAuth({ ...auth, email: e.target.value })}
              />
              <input
                placeholder="ФИО"
                autoComplete="name"
                value={auth.full_name}
                onChange={(e) => setAuth({ ...auth, full_name: e.target.value })}
              />
              <input
                type="password"
                placeholder="Пароль"
                autoComplete="new-password"
                value={auth.password}
                onChange={(e) => setAuth({ ...auth, password: e.target.value })}
              />
            </div>
            <label className="form-check">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
              />
              <span>
                Я согласен с{" "}
                <Link to="/about#about-privacy">политикой обработки персональных данных</Link>
              </span>
            </label>
            <button type="submit" className="btn btn-primary" disabled={!agree}>
              Зарегистрироваться
            </button>
            <p className="switch-auth">
              У вас уже есть аккаунт?{" "}
              <button type="button" className="link-btn" onClick={() => openAuthModal(false)}>
                Войти в ЛК
              </button>
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
