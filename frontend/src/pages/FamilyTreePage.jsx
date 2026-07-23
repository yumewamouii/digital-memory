import { Link } from "react-router-dom";
import CtaRegisterBand from "../components/CtaRegisterBand";
import FaqAccordion from "../components/FaqAccordion";
import PageHero from "../components/PageHero";
import { useAuth } from "../context/AuthContext";

const advantages = [
  {
    title: "Неограниченное число персон",
    text: "Добавляйте родственников без ограничений и постепенно расширяйте родословную.",
  },
  {
    title: "Биография для каждого",
    text: "Связывайте узлы древа со страницами памяти: фото, аудио, видео и тексты.",
  },
  {
    title: "Бесплатный старт",
    text: "Постройте семейное древо онлайн и начните хранить цифровую историю семьи уже сегодня.",
  },
  {
    title: "Доступ к архиву",
    text: "Используйте Музей памяти как источник вдохновения и примеров семейных историй.",
  },
  {
    title: "Создавайте вместе",
    text: "Делитесь древом с родными по ссылке — собирайте историю семьи сообща.",
  },
  {
    title: "Полная история родственников",
    text: "Интерактивные страницы с QR-кодом для размещения ссылки на любом носителе.",
  },
];

const treeFaq = [
  {
    q: "Что такое «МемориалГис»?",
    a: "Онлайн-платформа для страниц памяти, генеалогических древ и описания памятных мест.",
  },
  {
    q: "Насколько просто создать древо?",
    a: "Достаточно зарегистрироваться, задать название древа и начать добавлять родственников и связи.",
  },
  {
    q: "Что даёт подписка на генеалогическое древо?",
    a: "Расширенный тариф — для семей, которым нужно больше древьев, карточек и приоритетная поддержка.",
  },
  {
    q: "Можно ли загрузить древо файлом в формате GEDCOM?",
    a: "Пока древо создаётся онлайн. Импорт GEDCOM планируется в следующих обновлениях.",
  },
  {
    q: "Кто-то сможет увидеть моё древо?",
    a: "По умолчанию древо доступно вам в личном кабинете. Вы сами решаете, с кем поделиться ссылкой.",
  },
];

export default function FamilyTreePage() {
  const { openAuthModal } = useAuth();

  return (
    <>
      <PageHero
        title="Генеалогическое древо своей семьи онлайн"
        subtitle="Загляните в прошлое и создайте полную картину вашей родословной. Бесплатно постройте генеалогическое древо семьи онлайн в МемориалГис."
      >
        <div className="hero-actions">
          <Link to="/family-tree/create" className="btn btn-primary">
            Создать древо бесплатно
          </Link>
          <button type="button" className="btn btn-outline" onClick={() => openAuthModal(true)}>
            Регистрация
          </button>
        </div>
      </PageHero>

      <section className="section section-compact">
        <div className="section-inner">
          <ul className="trust-list">
            <li>Бесконечное количество персон в семейном древе</li>
            <li>Биография для каждого родственника на странице памяти</li>
            <li>Бесплатный старт и долгосрочное хранение</li>
          </ul>
        </div>
      </section>

      <section className="section section-alt" id="tree-example">
        <div className="section-inner">
          <div className="project-section">
            <div className="project-copy">
              <span className="section-tag">Пример</span>
              <h2 className="section-title">Посмотрите демо-древо семьи</h2>
              <p className="lead">
                Погрузитесь в структуру семейной истории: узлы с родственниками, датами и
                краткими биографиями на одной схеме. Узнайте, как выглядит готовое древо, и
                создайте своё.
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
          <h2 className="section-title">Преимущества</h2>
          <p className="lead">
            МемориалГис — не только конструктор родственного древа, но и сервис по сохранению
            памяти о людях.
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
          <h2 className="section-title">Создать семейное древо просто</h2>
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
          <h2>Подписка</h2>
          <p className="lead">
            Для активной семейной работы можно подключить расширенный тариф: больше древьев,
            карточек и инструментов для долгосрочного хранения данных.
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
        title="Начните семейное древо сегодня"
        text="Зарегистрируйтесь и создайте генеалогическое древо бесплатно."
      />
    </>
  );
}
