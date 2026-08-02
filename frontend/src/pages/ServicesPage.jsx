import { Link } from "react-router-dom";
import PageHero from "../components/PageHero";

const serviceCards = [
  {
    title: "Изготовление QR-кода",
    text: "Подготовим QR-код для страницы памяти — на табличку или в семейный архив.",
  },
  {
    title: "Поиск места на карте",
    text: "Поможем указать точное место памяти, чтобы родственникам было проще его найти.",
  },
  {
    title: "Уборка и уход",
    text: "Регулярный уход и приведение памятного места в порядок.",
  },
  {
    title: "Памятники и гравировка",
    text: "Подбор памятников, гравировки и оформления с учётом пожеланий семьи.",
  },
  {
    title: "Оградки и благоустройство",
    text: "Оформление территории вокруг места памяти.",
  },
  {
    title: "Сопровождение семьи",
    text: "Помощь с запуском страницы памяти и связью с семейным древом.",
  },
];

const processSteps = [
  "Оставьте запрос через контакты или личный кабинет.",
  "Согласуйте формат помощи и сроки.",
  "Получите результат и рекомендации по уходу.",
];

export default function ServicesPage() {
  return (
    <>
      <PageHero
        title="Услуги"
        subtitle="Помощь со страницами памяти и оформлением памятных мест."
      >
        <div className="hero-actions">
          <Link to="/contacts" className="btn btn-primary">
            Написать нам
          </Link>
          <Link to="/memory/create" className="btn btn-outline">
            Создать страницу памяти
          </Link>
        </div>
      </PageHero>

      <section className="section">
        <div className="section-inner">
          <p className="lead">
            От QR-кода и публикации страницы до благоустройства места памяти.
          </p>
          <div className="service-grid" style={{ marginTop: "1.5rem" }}>
            {serviceCards.map((service) => (
              <article key={service.title} className="service-card">
                <h3>{service.title}</h3>
                <p>{service.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="section-inner">
          <h2 className="section-title">Как получить помощь</h2>
          <ol className="steps-numbered" style={{ marginTop: "1.25rem" }}>
            {processSteps.map((step, index) => (
              <li key={step}>
                <span className="step-num">{index + 1}</span>
                <p style={{ margin: 0 }}>{step}</p>
              </li>
            ))}
          </ol>
          <div className="hero-actions" style={{ justifyContent: "flex-start" }}>
            <Link to="/contacts" className="btn btn-primary">
              Написать нам
            </Link>
            <Link to="/pricing" className="btn btn-outline">
              Смотреть тарифы
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
