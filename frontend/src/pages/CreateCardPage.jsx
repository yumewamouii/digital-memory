import { useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { API } from "../api";
import PageHero from "../components/PageHero";
import { useAuth } from "../context/AuthContext";

export default function CreateCardPage() {
  const { token, authHeaders, openAuthModal, setMessage } = useAuth();
  const [cardForm, setCardForm] = useState({ first_name: "", last_name: "", biography: "" });
  const [saved, setSaved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createCard = async () => {
    try {
      setIsSubmitting(true);
      await axios.post(`${API}/memorial-cards`, cardForm, { headers: authHeaders });
      setCardForm({ first_name: "", last_name: "", biography: "" });
      setSaved(true);
      setMessage("Карточка памяти создана");
    } catch {
      setMessage("Не удалось создать карточку. Попробуйте еще раз.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PageHero
        title="Создание карточки памяти"
        subtitle="Заполните основные сведения — страницу можно дополнить позже в личном кабинете."
      />

      <section className="section">
        <div className="section-inner narrow">
          {!token ? (
            <div className="notice-card">
              <p>Для создания карточки необходимо войти в аккаунт.</p>
              <button type="button" className="btn btn-primary" onClick={() => openAuthModal(false)}>
                Войти
              </button>
            </div>
          ) : (
            <>
              <div className="form-grid">
                <input
                  placeholder="Имя"
                  value={cardForm.first_name}
                  onChange={(e) => setCardForm({ ...cardForm, first_name: e.target.value })}
                />
                <input
                  placeholder="Фамилия"
                  value={cardForm.last_name}
                  onChange={(e) => setCardForm({ ...cardForm, last_name: e.target.value })}
                />
                <textarea
                  placeholder="Краткая биография"
                  rows={5}
                  value={cardForm.biography}
                  onChange={(e) => setCardForm({ ...cardForm, biography: e.target.value })}
                />
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={createCard}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Сохраняем..." : "Создать карточку"}
              </button>
              {saved && (
                <p className="success-text">
                  Карточка сохранена.{" "}
                  <Link to="/cabinet" className="text-link">
                    Перейти в кабинет
                  </Link>
                </p>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}
