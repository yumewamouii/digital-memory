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
    text: "Описание места, дата важных событий и материалы для родственников.",
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
        subtitle="Отдельная страница памяти места: карта, описание, история и удобный доступ для семьи."
      />

      <section className="section section-compact">
        <div className="section-inner">
          <ul className="trust-list">
            {trustPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section section-pillars" id="places-benefits">
        <div className="section-inner narrow">
          <h2>Польза</h2>
          <p className="lead">
            Страница памятного места помогает семье сохранить не только точку на карте, но и
            контекст: историю, фотографии, заметки и важные детали для будущих поколений.
          </p>
          <p className="lead">
            Такой формат снижает риск потерять информацию о месте памяти и делает ее доступной
            родственникам в любой момент.
          </p>
        </div>
      </section>

      <section className="section" id="places-examples">
        <div className="section-inner">
          <h2>Примеры</h2>
          <div className="feature-grid">
            {examples.map((item) => (
              <article key={item.title} className="feature-card">
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-pillars" id="places-advantages">
        <div className="section-inner">
          <h2>Преимущества</h2>
          <div className="info-grid">
            <article className="info-card">
              <h3>Память без потерь</h3>
              <p>Данные о месте и истории семьи сохраняются в одном месте.</p>
            </article>
            <article className="info-card">
              <h3>Быстрый доступ</h3>
              <p>Открытие страницы по ссылке или QR-коду прямо на месте.</p>
            </article>
            <article className="info-card">
              <h3>Удобно для родных</h3>
              <p>Даже если родственники живут далеко, информация всегда под рукой.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-inner narrow">
          <h2>Как добавить памятное место</h2>
          <ol className="steps-list">
            {steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <div className="hero-actions">
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
