import { Link } from "react-router-dom";

const trustPoints = [
  "Защита персональных данных",
  "Связь со страницей в семейном древе",
  "Долгосрочное хранение информации",
  "Помощь в написании биографии",
];

const saveTypes = [
  {
    title: "Видео",
    text: "Ролики с YouTube, Vimeo и других видеосервисов — чтобы снова услышать голос и увидеть близкого человека.",
  },
  {
    title: "Аудиозаписи",
    text: "Записанный голос, любимые песни или фрагменты семейных мероприятий.",
  },
  {
    title: "Фотографии",
    text: "Загружайте столько снимков, сколько нужно: детство, семья, праздники, важные моменты жизни.",
  },
  {
    title: "Текстовые описания",
    text: "Эпитафия, краткое описание, биография и истории из жизни — всё в одном месте.",
  },
  {
    title: "Ссылки",
    text: "Страницы родственников, социальные сети, публикации и другие важные материалы.",
  },
  {
    title: "Карты",
    text: "Отметьте место захоронения или памятное место — родственникам будет проще его найти.",
  },
];

const shareSteps = [
  "Зарегистрируйтесь в сервисе",
  "Наполните страницу данными за несколько минут",
  "Добавьте страницу в семейное древо",
  "Поделитесь ссылкой с родными и близкими",
];

const familyTips = [
  {
    title: "Научите ребёнка хранить память предков",
    text: "Покажите, как открыть страницу памяти и расскажите семейные истории вместе.",
  },
  {
    title: "Вспомните семейные моменты",
    text: "Соберите фотографии и воспоминания, пока они ещё свежи в памяти близких.",
  },
  {
    title: "Разместите табличку с QR-кодом",
    text: "У могилы или дома — чтобы любой мог быстро открыть страницу с телефона.",
  },
];

const examples = [
  {
    name: "Иванова Мария Петровна",
    dates: "1928 — 2019",
    excerpt:
      "Учительница начальных классов, мать троих детей и бабушка, которую помнят за тепло, доброту и любовь к книгам. Светлая память.",
  },
  {
    name: "Поликарпов Владимир Владимирович",
    dates: "1960 — 2021 (61 год жизни)",
    excerpt:
      "Запомните этого светлого, работящего и неутомимого человека таким, каким знали его родные и друзья. Земля ему пухом.",
  },
];

export default function MemoryPage() {
  return (
    <>
      <section className="memory-hero">
        <div className="memory-hero-inner">
          <h1>Страница памяти умерших людей</h1>
          <p className="memory-hero-lead">
            Лучший способ сохранить память о близком человеке — создать о нём страницу памяти
          </p>
          <div className="memory-hero-actions">
            <Link to="/memory/example" className="btn btn-secondary">
              Смотреть пример
            </Link>
            <Link to="/memory/create" className="btn btn-primary">
              Создать страницу
            </Link>
          </div>
          <p className="memory-hero-note">
            Страницы памяти помогают семьям бережно хранить историю и передавать её следующим
            поколениям
          </p>
        </div>
      </section>

      <section className="section section-compact">
        <div className="section-inner">
          <ul className="trust-list">
            {trustPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section section-pillars" id="memory-view">
        <div className="section-inner">
          <article className="memorial-feature">
            <p className="memorial-dates">1931 — 2022</p>
            <h2>Горбачёв Михаил Сергеевич</h2>
            <p>
              Историческая, масштабная личность. На странице памяти можно собрать биографию,
              фотографии, воспоминания родных и важные даты — чтобы память о человеке жила
              дольше одного поколения.
            </p>
            <Link to="/memory/example" className="btn btn-outline btn-sm">
              Смотреть страницу
            </Link>
          </article>
        </div>
      </section>

      <section className="section" id="memory-how">
        <div className="section-inner narrow">
          <h2>Что такое «Страница памяти»?</h2>
          <p className="lead">
            Это интерактивная страница в сети, на которой вы сможете сохранить воспоминания и
            историю близкого человека. Данные хранятся долго, а доступ к ним можно открыть через
            QR-код.
          </p>
          <p className="lead">
            Так вы сможете увидеть близкого человека, услышать его голос, почувствовать духовную
            связь — и пронести память о нём сквозь поколения.
          </p>
        </div>
      </section>

      <section className="section section-pillars" id="memory-services">
        <div className="section-inner">
          <h2>Что можно сохранить на странице памяти?</h2>
          <p className="lead">Запечатлейте лучшие моменты из жизни близкого человека</p>
          <div className="info-grid">
            {saveTypes.map((item) => (
              <article key={item.title} className="info-card">
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-inner narrow">
          <span className="section-tag">Биография</span>
          <h2>Помощь в написании биографии</h2>
          <p className="lead">
            Если сложно подобрать слова, сервис подскажет структуру текста: краткое описание,
            эпитафию или развёрнутую биографию. Можно начать с черновика и дополнить страницу
            позже в личном кабинете.
          </p>
          <Link to="/memory/create" className="btn btn-primary">
            Начать создание
          </Link>
        </div>
      </section>

      <section className="section section-pillars" id="memory-museum">
        <div className="section-inner">
          <h2>Примеры страниц памяти</h2>
          <div className="cards">
            {examples.map((example) => (
              <article key={example.name} className="memorial-preview">
                <p className="memorial-dates">{example.dates}</p>
                <h3>{example.name}</h3>
                <p>{example.excerpt}</p>
                <Link to="/memory/example" className="btn btn-outline btn-sm">
                  Смотреть страницу
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-inner">
          <div className="feature-grid">
            {familyTips.map((tip) => (
              <article key={tip.title} className="feature-card">
                <h3>{tip.title}</h3>
                <p>{tip.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-pillars">
        <div className="section-inner narrow">
          <h2>Делиться воспоминаниями просто</h2>
          <ol className="steps-list">
            {shareSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section memory-cta">
        <div className="section-inner narrow">
          <div className="notice-card">
            <h2>Поделитесь памятью о близком человеке</h2>
            <p className="lead">
              Создайте страницу памяти сегодня — это займёт несколько минут, а для семьи
              останется на долгие годы.
            </p>
            <Link to="/memory/create" className="btn btn-primary">
              Создать страницу
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
