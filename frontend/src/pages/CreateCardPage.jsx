import { useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { API } from "../api";
import LocationMapPicker, { buildLocationString } from "../components/LocationMapPicker";
import PageHero from "../components/PageHero";
import { useAuth } from "../context/AuthContext";

const pagePlans = [
  {
    id: "brief",
    title: "Краткая страница",
    subtitle: "Компактная страница памяти с главным о человеке",
    exampleLabel: "Пример краткой страницы",
    exampleTo: "/memory/example/brief",
    features: [
      "Эпитафия",
      "Отметка на карте",
      "Родственные связи",
      "QR-код для печати",
      "Приватность",
    ],
  },
  {
    id: "extended",
    title: "Расширенная страница",
    subtitle: "Полная страница с биографией, медиа и гостевой книгой",
    exampleLabel: "Пример расширенной страницы",
    exampleTo: "/memory/example/extended",
    features: [
      "Всё из краткой страницы",
      "Биография с фото",
      "Фотогалерея",
      "Видео и видеозаписи",
      "Гостевая книга / отзывы",
      "Металлическая табличка с QR-кодом",
    ],
  },
];

const emptyForm = {
  first_name: "",
  last_name: "",
  middle_name: "",
  birth_date: "",
  death_date: "",
  epitaph: "",
  biography: "",
  photo_url: "",
  cemetery_name: "",
  location_address: "",
  location_lat: null,
  location_lng: null,
  is_private: false,
  family_links: "",
  gallery_note: "",
  video_note: "",
  guestbook_enabled: true,
  metal_plaque: false,
};

export default function CreateCardPage() {
  const { token, authHeaders, openAuthModal, setMessage } = useAuth();
  const [step, setStep] = useState("plan");
  const [plan, setPlan] = useState(null);
  const [cardForm, setCardForm] = useState(emptyForm);
  const [saved, setSaved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (field, value) => {
    setCardForm((prev) => ({ ...prev, [field]: value }));
  };

  const selectPlan = (planId) => {
    setPlan(planId);
    setStep("form");
    setSaved(false);
  };

  const backToPlans = () => {
    setStep("plan");
    setPlan(null);
  };

  const createCard = async () => {
    if (!cardForm.first_name.trim() || !cardForm.last_name.trim()) {
      setMessage("Укажите имя и фамилию");
      return;
    }

    const biographyParts = [];
    if (cardForm.epitaph.trim()) {
      biographyParts.push(`Эпитафия: ${cardForm.epitaph.trim()}`);
    }
    if (plan === "extended" && cardForm.biography.trim()) {
      biographyParts.push(cardForm.biography.trim());
    } else if (plan === "brief" && cardForm.epitaph.trim() === "" && cardForm.biography.trim()) {
      biographyParts.push(cardForm.biography.trim());
    }
    if (cardForm.family_links.trim()) {
      biographyParts.push(`Родственные связи: ${cardForm.family_links.trim()}`);
    }
    if (plan === "extended" && cardForm.gallery_note.trim()) {
      biographyParts.push(`Фотогалерея: ${cardForm.gallery_note.trim()}`);
    }
    if (plan === "extended" && cardForm.video_note.trim()) {
      biographyParts.push(`Видео: ${cardForm.video_note.trim()}`);
    }
    biographyParts.push(
      `Тип страницы: ${plan === "extended" ? "расширенная" : "краткая"}`,
    );
    biographyParts.push(`Приватность: ${cardForm.is_private ? "закрытая" : "открытая"}`);
    if (plan === "extended") {
      biographyParts.push(
        `Гостевая книга: ${cardForm.guestbook_enabled ? "включена" : "выключена"}`,
      );
      biographyParts.push(
        `Металлическая табличка с QR: ${cardForm.metal_plaque ? "заказана" : "не заказана"}`,
      );
    }

    const payload = {
      first_name: cardForm.first_name.trim(),
      last_name: cardForm.last_name.trim(),
      middle_name: cardForm.middle_name.trim() || null,
      birth_date: cardForm.birth_date || null,
      death_date: cardForm.death_date || null,
      biography: biographyParts.join("\n\n") || null,
      photo_url: plan === "extended" ? cardForm.photo_url.trim() || null : null,
      cemetery_name: cardForm.cemetery_name.trim() || null,
      cemetery_location:
        buildLocationString({
          address: cardForm.location_address,
          latitude: cardForm.location_lat,
          longitude: cardForm.location_lng,
        }) || null,
    };

    try {
      setIsSubmitting(true);
      await axios.post(`${API}/memorial-cards`, payload, { headers: authHeaders });
      setCardForm(emptyForm);
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
        title="Создание страницы памяти"
        subtitle={
          step === "plan"
            ? "Выберите краткую или расширенную страницу."
            : plan === "extended"
              ? "Заполните данные расширенной страницы."
              : "Заполните данные краткой страницы."
        }
      />

      <section className="section">
        <div className={`section-inner${step === "plan" ? "" : " narrow"}`}>
          {!token ? (
            <div className="notice-card form-panel" style={{ margin: "0 auto" }}>
              <h2>Нужен вход в аккаунт</h2>
              <p className="lead">
                Чтобы создать карточку памяти, войдите или зарегистрируйтесь.
              </p>
              <div className="hero-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => openAuthModal(false)}
                >
                  Войти
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => openAuthModal(true)}
                >
                  Регистрация
                </button>
              </div>
            </div>
          ) : step === "plan" ? (
            <div className="plan-choice">
              <h2 className="section-title" style={{ textAlign: "center" }}>
                Какую страницу создать?
              </h2>
              <p className="lead" style={{ margin: "0 auto 1.75rem", textAlign: "center" }}>
                Краткая — для эпитафии, карты и QR-кода. Расширенная — с биографией, медиа и
                гостевой книгой.
              </p>
              <div className="plan-grid">
                {pagePlans.map((item) => (
                  <article key={item.id} className="plan-card">
                    <span className="plan-badge">
                      {item.id === "brief" ? "Базовый формат" : "Полный формат"}
                    </span>
                    <h3>{item.title}</h3>
                    <p>{item.subtitle}</p>
                    <ul className="plan-features">
                      {item.features.map((feature) => (
                        <li key={feature}>{feature}</li>
                      ))}
                    </ul>
                    <Link to={item.exampleTo} className="text-link">
                      {item.exampleLabel}
                    </Link>
                    <button
                      type="button"
                      className={`btn ${item.id === "extended" ? "btn-primary" : "btn-outline"}`}
                      onClick={() => selectPlan(item.id)}
                    >
                      Выбрать
                    </button>
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <div className="form-panel wide">
              <div className="form-step-bar">
                <button type="button" className="btn btn-ghost btn-sm" onClick={backToPlans}>
                  ← Сменить формат
                </button>
                <span className="plan-selected-label">
                  {plan === "extended" ? "Расширенная страница" : "Краткая страница"}
                </span>
              </div>

              <h2 style={{ marginTop: 0 }}>Основные данные</h2>
              <div className="form-grid">
                <div>
                  <label className="form-label" htmlFor="card-last-name">
                    Фамилия
                  </label>
                  <input
                    id="card-last-name"
                    value={cardForm.last_name}
                    onChange={(e) => updateField("last_name", e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label" htmlFor="card-first-name">
                    Имя
                  </label>
                  <input
                    id="card-first-name"
                    value={cardForm.first_name}
                    onChange={(e) => updateField("first_name", e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label" htmlFor="card-middle-name">
                    Отчество
                  </label>
                  <input
                    id="card-middle-name"
                    value={cardForm.middle_name}
                    onChange={(e) => updateField("middle_name", e.target.value)}
                  />
                </div>
                <div className="form-row-2">
                  <div>
                    <label className="form-label" htmlFor="card-birth">
                      Дата рождения
                    </label>
                    <input
                      id="card-birth"
                      type="date"
                      value={cardForm.birth_date}
                      onChange={(e) => updateField("birth_date", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label" htmlFor="card-death">
                      Дата смерти
                    </label>
                    <input
                      id="card-death"
                      type="date"
                      value={cardForm.death_date}
                      onChange={(e) => updateField("death_date", e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label" htmlFor="card-epitaph">
                    Эпитафия
                  </label>
                  <textarea
                    id="card-epitaph"
                    rows={3}
                    placeholder="Краткое прощальное слово или цитата"
                    value={cardForm.epitaph}
                    onChange={(e) => updateField("epitaph", e.target.value)}
                  />
                </div>

                <div>
                  <label className="form-label" htmlFor="card-cemetery">
                    Отметка на карте — название места
                  </label>
                  <input
                    id="card-cemetery"
                    placeholder="Например: Новодевичье кладбище"
                    value={cardForm.cemetery_name}
                    onChange={(e) => updateField("cemetery_name", e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Адрес или координаты</label>
                  <LocationMapPicker
                    latitude={cardForm.location_lat}
                    longitude={cardForm.location_lng}
                    address={cardForm.location_address}
                    onChange={({ latitude, longitude, address }) =>
                      setCardForm((prev) => ({
                        ...prev,
                        location_lat: latitude,
                        location_lng: longitude,
                        location_address: address,
                      }))
                    }
                  />
                </div>

                <div>
                  <label className="form-label" htmlFor="card-family">
                    Родственные связи
                  </label>
                  <textarea
                    id="card-family"
                    rows={2}
                    placeholder="Супруг(а), дети, родители — кратко"
                    value={cardForm.family_links}
                    onChange={(e) => updateField("family_links", e.target.value)}
                  />
                </div>

                <label className="form-check">
                  <input
                    type="checkbox"
                    checked={cardForm.is_private}
                    onChange={(e) => updateField("is_private", e.target.checked)}
                  />
                  <span>Приватная страница — доступ только по вашей ссылке</span>
                </label>

                <p className="hint-text" style={{ margin: 0 }}>
                  QR-код для печати будет доступен в личном кабинете после создания страницы.
                </p>

                {plan === "extended" && (
                  <>
                    <h2>Расширенные возможности</h2>
                    <div>
                      <label className="form-label" htmlFor="card-bio">
                        Биография
                      </label>
                      <textarea
                        id="card-bio"
                        rows={6}
                        placeholder="Развёрнутая история жизни"
                        value={cardForm.biography}
                        onChange={(e) => updateField("biography", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label" htmlFor="card-photo">
                        Фото для биографии (ссылка)
                      </label>
                      <input
                        id="card-photo"
                        type="url"
                        placeholder="https://..."
                        value={cardForm.photo_url}
                        onChange={(e) => updateField("photo_url", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label" htmlFor="card-gallery">
                        Фотогалерея
                      </label>
                      <textarea
                        id="card-gallery"
                        rows={2}
                        placeholder="Опишите альбом или вставьте ссылки на фото"
                        value={cardForm.gallery_note}
                        onChange={(e) => updateField("gallery_note", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label" htmlFor="card-video">
                        Видео и видеозаписи
                      </label>
                      <textarea
                        id="card-video"
                        rows={2}
                        placeholder="Ссылки на YouTube, Vimeo или описание записей"
                        value={cardForm.video_note}
                        onChange={(e) => updateField("video_note", e.target.value)}
                      />
                    </div>
                    <label className="form-check">
                      <input
                        type="checkbox"
                        checked={cardForm.guestbook_enabled}
                        onChange={(e) => updateField("guestbook_enabled", e.target.checked)}
                      />
                      <span>Гостевая книга / отзывы на странице</span>
                    </label>
                    <label className="form-check">
                      <input
                        type="checkbox"
                        checked={cardForm.metal_plaque}
                        onChange={(e) => updateField("metal_plaque", e.target.checked)}
                      />
                      <span>Металлическая табличка с QR-кодом</span>
                    </label>
                  </>
                )}
              </div>

              <div className="hero-actions" style={{ justifyContent: "flex-start", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={createCard}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Сохраняем..." : "Создать страницу"}
                </button>
                <Link
                  to={plan === "extended" ? "/memory/example/extended" : "/memory/example/brief"}
                  className="btn btn-outline"
                >
                  Смотреть пример этого формата
                </Link>
              </div>

              {saved && (
                <p className="success-text" style={{ marginTop: "1rem" }}>
                  Страница сохранена.{" "}
                  <Link to="/cabinet" className="text-link">
                    Перейти в кабинет
                  </Link>
                </p>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
