import { Link } from "react-router-dom";
import PageHero from "../components/PageHero";
import pillarPlaces from "../assets/home-pillar-places.png";

const benefits = [
  {
    title: "Делитесь местом",
    text: "Любой желающий может поделиться памятным местом.",
  },
  {
    title: "Больше информации по QR",
    text: "Отсканировав QR-код, любой желающий может получить больше информации о памятном месте.",
  },
  {
    title: "Польза для города",
    text: "Улучшение городской среды, повышение информативности города, туристической привлекательности.",
  },
];

const advantages = [
  "Хранение данных неограниченно",
  "Удобное и простое пополнение",
  "Бесплатная регистрация",
  "Можно заказать табличку с QR-кодом",
];

export default function PlacesPage() {
  return (
    <>
      <PageHero
        title="Памятные места"
        subtitle="В каждом регионе, городе и населённом пункте у местных жителей есть свои памятные места — со своей исторической, культурной или общественной значимостью."
      >
        <div className="hero-actions">
          <Link to="/contacts" className="btn btn-primary">
            Создать памятное место
          </Link>
          <Link to="/services" className="btn btn-outline">
            Услуги
          </Link>
        </div>
      </PageHero>

      <section className="section" id="places-example">
        <div className="section-inner">
          <div className="memory-spotlight">
            <figure className="memory-spotlight-media">
              <img src={pillarPlaces} alt="Памятное место" loading="lazy" />
            </figure>
            <div className="memory-spotlight-copy">
              <span className="section-tag">Пример</span>
              <h2 className="section-title">Пример памятного места</h2>
              <p className="lead">
                ГисМемориал позволяет бесплатно создавать и хранить официальные
                оцифрованные исторические страницы, связанные с конкретными физическими
                объектами. Такая страница хранит историю места: описание, архивные
                материалы, фотографии, юридические сведения и координаты.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-alt" id="places-who">
        <div className="section-inner narrow">
          <p className="lead">
            Инициировать создание страницы памятного места может физическое лицо
            или организация — все, кто ценит сохранение и передачу памяти.
          </p>
          <div className="hero-actions" style={{ justifyContent: "flex-start" }}>
            <Link to="/contacts" className="btn btn-primary">
              Создать памятное место
            </Link>
          </div>
        </div>
      </section>

      <section className="section" id="places-benefits">
        <div className="section-inner">
          <span className="section-tag">Польза</span>
          <h2 className="section-title">Кому и зачем это нужно</h2>
          <div className="info-grid" style={{ marginTop: "1.25rem" }}>
            {benefits.map((item) => (
              <article key={item.title} className="info-card">
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-alt" id="places-advantages">
        <div className="section-inner">
          <span className="section-tag">Преимущество</span>
          <h2 className="section-title">Почему это удобно</h2>
          <ul className="trust-list" style={{ marginTop: "1.25rem" }}>
            {advantages.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
          <div
            className="hero-actions"
            style={{ justifyContent: "flex-start", marginTop: "1.5rem" }}
          >
            <Link to="/contacts" className="btn btn-primary">
              Создать памятное место
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
