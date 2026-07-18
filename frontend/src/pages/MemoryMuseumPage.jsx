import { Link } from "react-router-dom";
import PageHero from "../components/PageHero";

const museumValues = [
  {
    title: "Публичная память",
    text: "Музей памяти объединяет открытые страницы, чтобы сохранить историю людей и семей в одном пространстве.",
  },
  {
    title: "Удобный поиск",
    text: "Находите страницы по имени, датам и ключевым фактам биографии.",
  },
  {
    title: "Семейная связь",
    text: "Каждая страница может быть частью генеалогического древа и передаваться следующим поколениям.",
  },
];

const museumExamples = [
  {
    title: "История семьи",
    text: "Подборка страниц нескольких поколений с фотографиями, датами и воспоминаниями.",
  },
  {
    title: "Памятные личности",
    text: "Страницы людей, оставивших заметный след в истории города, профессии или сообщества.",
  },
  {
    title: "Семейные архивы",
    text: "Материалы, которые раньше хранились в альбомах, становятся доступными родным в цифровом виде.",
  },
];

export default function MemoryMuseumPage() {
  return (
    <>
      <PageHero
        title="Музей памяти"
        subtitle="Открытое пространство страниц памяти, где можно читать истории и сохранять семейное наследие."
      />

      <section className="section">
        <div className="section-inner narrow">
          <p className="lead">
            Музей памяти - это раздел с примерами и опубликованными страницами, который помогает
            семьям бережно хранить историю близких людей и делиться ею с родственниками.
          </p>
        </div>
      </section>

      <section className="section section-pillars">
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
          <h2>Что можно увидеть в музее памяти</h2>
          <div className="feature-grid">
            {museumExamples.map((item) => (
              <article key={item.title} className="feature-card">
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-pillars">
        <div className="section-inner narrow">
          <div className="notice-card">
            <h2>Добавьте свою страницу в музей памяти</h2>
            <p className="lead">
              Создайте страницу о близком человеке и при желании откройте ее для просмотра другим
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
