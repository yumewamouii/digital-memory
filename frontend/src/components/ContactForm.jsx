import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ContactForm({ title = "Написать нам", compact = false }) {
  const { setMessage } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", message: "", agree: false });
  const [sending, setSending] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setMessage("Заполните все поля формы");
      return;
    }
    if (!form.agree) {
      setMessage("Нужно согласие на обработку персональных данных");
      return;
    }
    setSending(true);
    window.setTimeout(() => {
      setSending(false);
      setForm({ name: "", email: "", message: "", agree: false });
      setMessage("Сообщение принято. Мы ответим в рабочее время.");
    }, 400);
  };

  return (
    <form className={`form-panel${compact ? "" : " wide"}`} onSubmit={handleSubmit}>
      {title && <h3 style={{ marginTop: 0 }}>{title}</h3>}
      <div className="form-grid">
        <input
          placeholder="Ваше имя"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          type="email"
          placeholder="Почта"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <textarea
          rows={compact ? 4 : 5}
          placeholder="Сообщение"
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
        />
      </div>
      <label className="form-check">
        <input
          type="checkbox"
          checked={form.agree}
          onChange={(e) => setForm({ ...form, agree: e.target.checked })}
        />
        <span>
          Я согласен с{" "}
          <Link to="/about#about-privacy">политикой обработки персональных данных</Link>
        </span>
      </label>
      <button type="submit" className="btn btn-primary" disabled={sending}>
        {sending ? "Отправляем..." : "Отправить сообщение"}
      </button>
    </form>
  );
}
