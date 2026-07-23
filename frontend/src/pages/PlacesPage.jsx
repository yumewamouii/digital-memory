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
    text: "Отметка на карте, фото участка и история рода в одном цифровом профиле.",
  },
  {
    title: "Мемориал или аллея памяти",
    text: "Описание места, дата важных событий и материалы для родственников и гостей города.",
  },
  {
    title: "Городская экскурсия",
    text: "Несколько точек объединяются в маршрут с заглавной страницей и QR-кодами на месте.",
  },
];

const advantages = [
  {
    title: "Память без потерь",
    text: "Данные о месте и истории семьи сохраняются в одном месте и доступны годами.",
  },
  {
    title: "Быстрый доступ",
    text: "Открытие страницы по ссылке или QR-коду прямо на месте — без приложений.",
  },
  {
    title: "Удобно для родных",
    text: "Даже если родственники живут далеко, информация всегда под рукой.",
  },
  {
    title: "Точки притяжения",
    text: "Памятные места становятся понятными для туристов, гостей и местных жителей.",
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
        subtitle="Лучший инструмент для сохранения памяти и создания точек притяжения туристов, гостей и местных жителей в вашем городе."
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
            Страница памятного места помогает сохранить не только точку на карте, но и контекст:
            историю, фотографии, заметки и важные детали для будущих поколений.
          </p>
          <p className="lead">
            Такой формат снижает риск потерять информацию о месте памяти и делает её доступной
            родственникам в любой момент.
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
