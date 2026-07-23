import { useState } from "react";
import { Link } from "react-router-dom";
import PageHero from "../components/PageHero";

const museumValues = [
  {
    title: "Публичная память",
    text: "Музей памяти объединяет открытые страницы, чтобы сохранить историю людей и семей в одном пространстве.",
  },
  {
    title: "Удобный просмотр",
    text: "Читайте истории, даты и краткие биографии — и создавайте свои страницы по примеру.",
  },
  {
    title: "Семейная связь",
    text: "Каждая страница может быть частью генеалогического древа и передаваться следующим поколениям.",
  },
];

const museumExamples = [
  {
    name: "Поликарпов Владимир Владимирович",
    dates: "1960 — 2021",
    text: "Пример семейной страницы с биографией и светлой памятью.",
    category: "Семья",
  },
  {
    name: "Иванова Мария Петровна",
    dates: "1928 — 2019",
    text: "Учительница и бабушка — история нескольких поколений в одной карточке.",
    category: "Семья",
  },
  {
    name: "История семьи на карте",
    dates: "Памятное место",
    text: "Страницы можно связать с местами памяти и маршрутами города.",
    category: "Места",
  },
];

export default function MemoryMuseumPage() {
  const [seed, setSeed] = useState(0);
  const items = museumExamples.map(
    (_, index) => museumExamples[(index + seed) % museumExamples.length],
  );

  return (
    <>
      <PageHero
        title="Музей памяти"
        subtitle="Открытое пространство страниц памяти, где можно читать истории и сохранять семейное наследие."
      >
        <div className="hero-actions">
          <Link to="/memory/create" className="btn btn-primary">
            Создать страницу
          </Link>
          <button type="button" className="btn btn-outline" onClick={() => setSeed((v) => v + 1)}>
            Обновить
          </button>
        </div>
      </PageHero>

      <section className="section">
        <div className="section-inner narrow">
          <p className="lead">
            Музей памяти — раздел с примерами и опубликованными страницами. Он помогает семьям
            бережно хранить историю близких людей и делиться ею с родственниками.
          </p>
        </div>
      </section>

      <section className="section section-alt">
        <div className="section-inner">
          <div className="info-grid">
            {museumValues.map((item) => (
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
          <h2 className="section-title">Страницы в музее памяти</h2>
          <div className="people-grid" style={{ marginTop: "1.25rem" }}>
            {items.map((item) => (
              <article key={`${item.name}-${seed}`} className="people-card">
                <p className="memorial-dates">{item.dates}</p>
                <h3>{item.name}</h3>
                <p style={{ marginBottom: "0.75rem" }}>{item.text}</p>
                <p className="hint-text" style={{ marginBottom: "1rem" }}>
                  {item.category}
                </p>
                <Link to="/memory/example" className="btn btn-outline btn-sm">
                  Смотреть страницу
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="section-inner narrow">
          <div className="notice-card">
            <h2>Добавьте свою страницу в музей памяти</h2>
            <p className="lead">
              Создайте страницу о близком человеке и при желании откройте её для просмотра другим
              родственникам и будущим поколениям.
            </p>
            <div className="hero-actions">
              <Link to="/memory/create" className="btn btn-primary">
                Создать страницу
              </Link>
              <Link to="/memory/example" className="btn btn-outline">
                Смотреть пример
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
