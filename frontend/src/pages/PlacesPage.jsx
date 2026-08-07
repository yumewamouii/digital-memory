import { Link } from "react-router-dom";
import PageHero from "../components/PageHero";

const trustPoints = [
  "Привязка к карте и маршруту",
  "Семейный архив фото и описаний",
  "Быстрый доступ через QR-код",
  "Удобно для родственников из других городов",
];

const examples = [
  {
    title: "Семейное захоронение",
    text: "Точка на карте, фото участка и история рода — в одном месте.",
  },
  {
    title: "Мемориал или аллея памяти",
    text: "Описание места, важные даты и материалы для родственников и гостей.",
  },
  {
    title: "Городской маршрут",
    text: "Несколько точек объединяются в маршрут с общей страницей и QR-кодами.",
  },
];

const advantages = [
  {
    title: "Память без потерь",
    text: "Сведения о месте, фото участка и контакты хранятся долго и в одном архиве.",
  },
  {
    title: "Быстрый доступ",
    text: "Страница открывается по ссылке или QR-коду — без приложений.",
  },
  {
    title: "Удобно для родных",
    text: "Даже если родственники живут далеко, информация всегда под рукой.",
  },
  {
    title: "Для города и гостей",
    text: "Памятные места понятны жителям, гостям и туристам.",
  },
];

const steps = [
  "Добавьте место памяти и краткое описание.",
  "Укажите точку на карте и сохраните маршрут.",
  "Прикрепите фото, историю и полезные контакты.",
  "Поделитесь ссылкой с близкими или через QR-код.",
];

export default function PlacesPage() {
  return (
    <>
      <PageHero
        title="Памятные места"
        subtitle="Описание, карта и QR-код — чтобы память о месте была доступна жителям и гостям."
      >
        <div className="hero-actions">
          <Link to="/contacts" className="btn btn-primary">
            Подать заявку
          </Link>
          <Link to="/services" className="btn btn-outline">
            Услуги
          </Link>
        </div>
      </PageHero>

      <section className="section section-compact">
        <div className="section-inner">
          <ul className="trust-list">
            {trustPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section section-alt" id="places-benefits">
        <div className="section-inner narrow">
          <span className="section-tag">Польза</span>
          <h2 className="section-title">Зачем описывать памятное место</h2>
          <p className="lead">
            Не только точка на карте, но и история, фото и важные детали —
            чтобы сведения не потерялись и были доступны родственникам.
          </p>
        </div>
      </section>

      <section className="section" id="places-examples">
        <div className="section-inner">
          <h2 className="section-title">Примеры</h2>
          <div className="feature-grid" style={{ marginTop: "1.25rem" }}>
            {examples.map((item) => (
              <article key={item.title} className="feature-card">
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-alt" id="places-advantages">
        <div className="section-inner">
          <h2 className="section-title">Преимущества</h2>
          <div className="info-grid" style={{ marginTop: "1.25rem" }}>
            {advantages.map((item) => (
              <article key={item.title} className="info-card">
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-inner">
          <h2 className="section-title">Как добавить памятное место</h2>
          <ol className="steps-numbered" style={{ marginTop: "1.25rem" }}>
            {steps.map((step, index) => (
              <li key={step}>
                <span className="step-num">{index + 1}</span>
                <p style={{ margin: 0 }}>{step}</p>
              </li>
            ))}
          </ol>
          <div className="hero-actions" style={{ justifyContent: "flex-start" }}>
            <Link to="/memory/create" className="btn btn-primary">
              Создать страницу памяти
            </Link>
            <Link to="/contacts" className="btn btn-outline">
              Нужна помощь
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
