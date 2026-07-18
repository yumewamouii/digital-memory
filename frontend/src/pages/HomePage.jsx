import { Link } from "react-router-dom";

const pillars = [
  {
    label: "Страницы памяти",
    title: "Сохраните воспоминания о близком человеке",
    text: "Интерактивная страница с биографией, фотографиями и местом памяти — доступной родным из любой точки мира.",
    primary: { label: "Создать страницу", to: "/memory/create" },
    secondary: { label: "Как работает", to: "/memory" },
  },
  {
    label: "Генеалогическое древо",
    title: "Соберите историю своей семьи",
    text: "Постройте древо онлайн, сохраните связи между поколениями и передайте родовую память дальше.",
    primary: { label: "Создать древо", to: "/family-tree/create" },
    secondary: { label: "Пример древа", to: "/family-tree" },
  },
  {
    label: "Памятные места",
    title: "Опишите места, важные для памяти",
    text: "Кладбища, мемориалы и точки притяжения — с описанием, историей и QR-кодом для быстрого доступа.",
    primary: { label: "Смотреть места", to: "/places" },
    secondary: { label: "Услуги", to: "/services" },
  },
];

export default function HomePage() {
  return (
    <>
      <section className="home-hero" id="home-top">
        <div className="home-hero-inner">
          <h1>МемориалГис: сервис по сохранению памяти о людях</h1>
          <p className="home-hero-lead">
            Памятные страницы, генеалогические древа и QR-коды — в спокойном светлом
            пространстве для семьи и близких.
          </p>
        </div>
      </section>

      <section className="section section-pillars">
        <div className="section-inner">
          <div className="pillar-grid">
            {pillars.map((pillar) => (
              <article
                key={pillar.label}
                className="pillar-card"
                id={
                  pillar.label === "Страницы памяти"
                    ? "home-memory"
                    : pillar.label === "Памятные места"
                      ? "home-places"
                      : "home-tree"
                }
              >
                <span className="pillar-label">{pillar.label}</span>
                <h2>{pillar.title}</h2>
                <p>{pillar.text}</p>
                <div className="pillar-actions">
                  <Link to={pillar.primary.to} className="btn btn-primary">
                    {pillar.primary.label}
                  </Link>
                  <Link to={pillar.secondary.to} className="btn btn-outline">
                    {pillar.secondary.label}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-quote">
        <div className="section-inner narrow">
          <div className="quote-card">
            <p>
              Сервис помогает сохранить родовую историю для будущих поколений, формируя
              бережное отношение к семье и укрепляя ценность памяти о близких людях и
              значимых местах.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-inner">
          <span className="section-tag">01 · Проекты</span>
          <h2 className="section-title">Музей памяти</h2>
          <p className="lead">
            Читайте страницы с историями и создавайте памятные страницы для своих близких —
            современный способ сохранить о них воспоминания.
          </p>
          <Link to="/memory/example" className="btn btn-primary">
            Перейти к примеру страницы
          </Link>
        </div>
      </section>

      <section className="section section-pillars" id="home-pricing">
        <div className="section-inner">
          <span className="section-tag">02 · Цена</span>
          <h2 className="section-title">Прозрачные тарифы</h2>
          <p className="lead">Можно начать бесплатно и перейти на расширенный тариф при необходимости.</p>
          <Link to="/pricing" className="btn btn-outline">
            Открыть страницу с тарифами
          </Link>
        </div>
      </section>

      <section className="section" id="home-faq">
        <div className="section-inner">
          <span className="section-tag">03 · Вопросы и ответы</span>
          <h2 className="section-title">Популярные вопросы</h2>
          <p className="lead">Собрали ответы о регистрации, создании страниц памяти и работе с древом семьи.</p>
          <Link to="/faq" className="btn btn-outline">
            Перейти к FAQ
          </Link>
        </div>
      </section>

      <section className="section section-pillars" id="home-contacts">
        <div className="section-inner">
          <span className="section-tag">04 · Контакты</span>
          <h2 className="section-title">Мы на связи</h2>
          <p className="lead">Напишите нам, если нужна помощь с созданием страницы памяти или настройкой сервиса.</p>
          <Link to="/contacts" className="btn btn-outline">
            Открыть контакты
          </Link>
        </div>
      </section>
    </>
  );
}
