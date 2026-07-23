import { Link } from "react-router-dom";
import PageHero from "../components/PageHero";

const serviceCards = [
  {
    title: "Генерация и изготовление QR",
    text: "Подготовим QR-код для страницы памяти, который удобно разместить на табличке или в семейном архиве.",
  },
  {
    title: "Поиск места и навигация",
    text: "Помогаем указать точное место памяти на карте, чтобы родственники могли легко его найти.",
  },
  {
    title: "Уборка и уход",
    text: "Организуем регулярный уход и приведение памятного места в порядок.",
  },
  {
    title: "Каталог памятников и гравировка",
    text: "Подбор решений по памятникам, гравировке и оформлению с учётом семейных пожеланий.",
  },
  {
    title: "Оградки, плитка и благоустройство",
    text: "Комплексное оформление территории вокруг места памяти, включая дополнительные принадлежности.",
  },
  {
    title: "Сопровождение семьи",
    text: "Консультации по запуску страницы памяти, наполнению контентом и объединению с семейным древом.",
  },
];

const processSteps = [
  "Оставьте запрос через контакты или личный кабинет.",
  "Согласуйте нужный формат помощи и сроки.",
  "Получите готовый результат и рекомендации по дальнейшему уходу.",
];

export default function ServicesPage() {
  return (
    <>
      <PageHero
        title="Услуги"
        subtitle="Сопровождение по цифровым страницам памяти и оформлению памятных мест."
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
            В этом разделе собраны услуги, которые чаще всего нужны семьям: от QR-кода и
            публикации страницы памяти до благоустройства места памяти и консультаций.
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
