import { Link } from "react-router-dom";
import CtaRegisterBand from "../components/CtaRegisterBand";
import FaqAccordion from "../components/FaqAccordion";
import PageHero from "../components/PageHero";
import { useAuth } from "../context/AuthContext";

const advantages = [
  {
    title: "Много родственников",
    text: "Добавляйте людей без жёстких ограничений и расширяйте родословную постепенно.",
  },
  {
    title: "Биография для каждого",
    text: "Связывайте людей со страницами памяти: фото, аудио, видео и тексты.",
  },
  {
    title: "Бесплатный старт",
    text: "Начните семейное древо бесплатно и сохраняйте историю семьи.",
  },
  {
    title: "Музей памяти",
    text: "Смотрите примеры семейных историй и оформляйте свои страницы.",
  },
  {
    title: "Создавайте вместе",
    text: "Делитесь древом с родными по ссылке.",
  },
  {
    title: "Страницы с QR-кодом",
    text: "У каждого родственника может быть страница памяти со ссылкой на любом носителе.",
  },
];

const treeFaq = [
  {
    q: "Что такое «ГисМемориал»?",
    a: "Сервис для страниц памяти, семейных древ и описаний памятных мест.",
  },
  {
    q: "Насколько просто создать древо?",
    a: "Зарегистрируйтесь, задайте название и добавьте родственников со связями.",
  },
  {
    q: "Что даёт расширенный тариф?",
    a: "Больше древ и карточек, а также приоритетная поддержка.",
  },
  {
    q: "Можно ли загрузить готовое древо из файла?",
    a: "Да. При создании древа можно импортировать файл родословной (.ged).",
  },
  {
    q: "Кто-то сможет увидеть моё древо?",
    a: "По умолчанию древо доступно только вам. Вы сами решаете, с кем поделиться ссылкой.",
  },
];

export default function FamilyTreePage() {
  const { openAuthModal } = useAuth();

  return (
    <>
      <PageHero
        title="Семейное древо"
        subtitle="Соберите родословную и сохраните историю семьи. Начать можно бесплатно."
      >
        <div className="hero-actions">
          <Link to="/family-tree/create" className="btn btn-primary">
            Создать древо бесплатно
          </Link>
          <Link to="/family-tree/demo" className="btn btn-secondary">
            Смотреть пример
          </Link>
          <button type="button" className="btn btn-outline" onClick={() => openAuthModal(true)}>
            Регистрация
          </button>
        </div>
      </PageHero>

      <section className="section section-compact">
        <div className="section-inner">
          <ul className="trust-list">
            <li>Родственники и связи на одной схеме</li>
            <li>Биография для каждого на странице памяти</li>
            <li>Бесплатный старт и долгое хранение</li>
          </ul>
        </div>
      </section>

      <section className="section section-alt" id="tree-example">
        <div className="section-inner">
          <div className="project-section">
            <div className="project-copy">
              <span className="section-tag">Пример</span>
              <h2 className="section-title">Пример семейного древа</h2>
              <p className="lead">
                Родственники, даты и краткие биографии — на одной схеме.
                Посмотрите пример и создайте своё древо.
              </p>
              <div className="project-actions">
                <Link to="/family-tree/create" className="btn btn-primary">
                  Создать своё древо
                </Link>
                <Link to="/memory/museum" className="btn btn-outline">
                  Перейти в архив
                </Link>
              </div>
            </div>
            <aside className="project-aside">
              <h3>Семья в 3–4 поколениях</h3>
              <p>
                Узлы с родственниками, связями и страницами памяти. Каждый человек может иметь
                карточку с датами, фото и историей.
              </p>
              <div className="project-actions">
                <Link to="/cabinet" className="btn btn-sm btn-outline">
                  Открыть кабинет
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="section" id="tree-advantages">
        <div className="section-inner">
          <h2 className="section-title">Возможности</h2>
          <p className="lead">
            Семейное древо и страницы памяти — рядом, в одном сервисе.
          </p>
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

      <section className="section section-alt" id="tree-create">
        <div className="section-inner">
          <h2 className="section-title">Как создать древо</h2>
          <ol className="steps-numbered" style={{ marginTop: "1.25rem" }}>
            <li>
              <span className="step-num">1</span>
              <h3 style={{ margin: "0 0 0.4rem", fontSize: "1rem" }}>Зарегистрируйтесь</h3>
              <p style={{ margin: 0 }}>Создайте аккаунт в сервисе.</p>
            </li>
            <li>
              <span className="step-num">2</span>
              <h3 style={{ margin: "0 0 0.4rem", fontSize: "1rem" }}>Создайте карточки</h3>
              <p style={{ margin: 0 }}>Добавьте родственников и настройте связи.</p>
            </li>
            <li>
              <span className="step-num">3</span>
              <h3 style={{ margin: "0 0 0.4rem", fontSize: "1rem" }}>Поделитесь с родными</h3>
              <p style={{ margin: 0 }}>Отправьте ссылку членам семьи.</p>
            </li>
          </ol>
          <div className="hero-actions" style={{ justifyContent: "flex-start" }}>
            <Link to="/family-tree/create" className="btn btn-primary">
              Создать древо
            </Link>
          </div>
        </div>
      </section>

      <section className="section" id="tree-subscription">
        <div className="section-inner narrow">
          <h2>Расширенный тариф</h2>
          <p className="lead">
            Больше древ и карточек, если семье нужны дополнительные возможности.
          </p>
          <Link to="/pricing" className="btn btn-outline">
            Смотреть тарифы
          </Link>
        </div>
      </section>

      <section className="section section-alt" id="tree-faq">
        <div className="section-inner narrow">
          <h2 className="section-title">Вопросы и ответы</h2>
          <FaqAccordion items={treeFaq} />
          <div className="faq-actions">
            <Link to="/faq" className="btn btn-outline">
              Смотреть все вопросы
            </Link>
            <Link to="/contacts" className="btn btn-primary">
              Написать нам
            </Link>
          </div>
        </div>
      </section>

      <CtaRegisterBand
        title="Начните семейное древо"
        text="Зарегистрируйтесь и создайте древо бесплатно."
      />
    </>
  );
}
