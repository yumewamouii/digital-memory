import { Link } from "react-router-dom";
import ContactForm from "../components/ContactForm";
import CtaRegisterBand from "../components/CtaRegisterBand";
import FaqAccordion from "../components/FaqAccordion";
import ProjectSection from "../components/ProjectSection";
import StatPillarCard from "../components/StatPillarCard";
import { useAuth } from "../context/AuthContext";
import pillarMemory from "../assets/home-pillar-memory.png";
import pillarTree from "../assets/home-pillar-tree.png";
import pillarPlaces from "../assets/home-pillar-places.png";
import biographyBot from "../assets/home-biography-bot.png";
import familyTreeBanner from "../assets/home-family-tree-banner.png";

const homeFaq = [
  {
    q: "Что такое «МемориалГис»?",
    a: "Это сервис для сохранения памяти о людях: страницы памяти, генеалогические древа и описания памятных мест с QR-кодами.",
  },
  {
    q: "Почему важно создавать страницы памяти о своих предках?",
    a: "Цифровая страница помогает семье сохранить биографию, фото и голос близкого человека и передать эту память следующим поколениям.",
  },
  {
    q: "Где хранится вся информация?",
    a: "Данные хранятся на серверах платформы в личном кабинете пользователя. Хранение персональных данных осуществляется в соответствии с 152-ФЗ.",
  },
  {
    q: "Что даёт подписка на генеалогическое древо?",
    a: "Расширенный тариф открывает больше возможностей для семейной работы: дополнительные древа, карточки и приоритетную поддержку.",
  },
  {
    q: "Можно ли загрузить древо файлом в формате GEDCOM?",
    a: "В текущей версии древо создаётся онлайн в личном кабинете. Импорт GEDCOM планируется в следующих обновлениях.",
  },
];

const people = [
  {
    name: "Поликарпов Владимир Владимирович",
    dates: "1960 — 2021",
    text: "Светлый, работящий и неутомимый человек — пример того, как страница памяти сохраняет живой образ для семьи.",
  },
  {
    name: "Иванова Мария Петровна",
    dates: "1928 — 2019",
    text: "Учительница, мать и бабушка — на странице собраны даты, фотографии и короткие истории родных.",
  },
];

const museumPlaceholders = [
  { id: 1, initials: "ПВ", label: "Поликарпов В. В.", dates: "1960 — 2021" },
  { id: 2, initials: "ИМ", label: "Иванова М. П.", dates: "1928 — 2019" },
  { id: 3, initials: "СК", label: "Смирнов К. А.", dates: "1945 — 2015" },
  { id: 4, initials: "АН", label: "Алексеева Н. И.", dates: "1932 — 2008" },
  { id: 5, initials: "ОР", label: "Орлов Р. С.", dates: "1958 — 2020" },
  { id: 6, initials: "ВЛ", label: "Волкова Л. Д.", dates: "1940 — 2017" },
];

const tours = [
  {
    title: "Цифровой маршрут «Аллея памяти»",
    text: "Самостоятельная прогулка по мемориальным точкам города: у каждой точки — QR-код со страницей, фотографиями и историей места.",
    quote:
      "Такой формат помогает жителям и гостям города узнать историю памятных мест в удобном цифровом виде.",
    author: "Куратор городского проекта",
    role: "Культурная программа",
  },
  {
    title: "Программа «Семейный маршрут»",
    text: "Объединяет семейные захоронения и памятные места в один маршрут с описанием и заглавной страницей.",
    quote:
      "Важно беречь память о людях и местах, связанных с историей нашей семьи и родного края.",
    author: "Участник программы",
    role: "Семейный архив",
  },
];

export default function HomePage() {
  const { openAuthModal } = useAuth();

  return (
    <>
      <section className="home-hero-band" id="home-top">
        <div className="home-hero-title">
          <h1>МемориалГис: сервис по сохранению памяти о людях</h1>
          <p>
            Страницы памяти, генеалогические древа и памятные места — в одном спокойном
            цифровом пространстве для семьи и близких.
          </p>
        </div>

        <div className="stat-pillar-grid">
          <StatPillarCard
            id="home-memory"
            image={pillarMemory}
            imageAlt="Семейный альбом и воспоминания"
            value="0"
            unit="Страниц уже создано"
            label="Страницы памяти"
            title="Сохраните воспоминания и историю близкого человека"
            text="Интерактивная страница в сети, на которой можно собрать биографию, фото, видео и место памяти — с доступом через QR-код."
            primary={{ label: "Создать страницу", to: "/memory/create" }}
            secondary={{ label: "Регистрация", onClick: () => openAuthModal(true) }}
          />
          <StatPillarCard
            id="home-tree"
            image={pillarTree}
            imageAlt="Генеалогическое древо семьи"
            value="0"
            unit="Персон создали пользователи в древе"
            label="Генеалогическое древо"
            title="Соберите полную картину вашей родословной"
            text="Бесплатно постройте генеалогическое древо семьи онлайн и свяжите его со страницами памяти родственников."
            primary={{ label: "Создать древо бесплатно", to: "/family-tree/create" }}
            secondary={{ label: "Регистрация", onClick: () => openAuthModal(true) }}
          />
          <StatPillarCard
            id="home-places"
            image={pillarPlaces}
            imageAlt="Памятное место в городе"
            value="0"
            unit="Памятных мест описаны с QR-кодом"
            label="Памятные места"
            title="Создавайте точки притяжения памяти в вашем городе"
            text="Лучший инструмент для сохранения памяти о местах: описание, история, карта и QR-код для жителей и гостей."
            primary={{ label: "Смотреть места", to: "/places" }}
            secondary={{ label: "Подать заявку", to: "/contacts" }}
          />
        </div>
      </section>

      <section className="section">
        <div className="section-inner">
          <div className="mission-band">
            <p>
              Наш сервис помогает сохранить родовую историю для будущих поколений, формируя
              уважительное отношение к своей семье и укрепляя ценность сохранения памяти. Мы
              также способствуем сохранению исторического наследия, фиксируя информацию о
              памятных местах и значимых событиях прошлого.
            </p>
            <p className="mission-legal">
              Хранение персональных данных осуществляется в соответствии с Федеральным законом
              «О персональных данных» от 27.07.2006 N 152-ФЗ.
            </p>
          </div>
        </div>
      </section>

      <ProjectSection
        id="home-museum"
        tag="01 · Проекты"
        title="Музей памяти"
        text="Читайте страницы с интересными историями и создавайте страницы памяти для своих близких. Это современный способ сохранить о них воспоминания."
        actions={[
          { label: "Перейти в Музей памяти", to: "/memory/museum" },
          { label: "Пример страницы", to: "/memory/example", variant: "btn-outline" },
        ]}
        asideTitle="Открытый архив историй"
        asideText="Публичные страницы помогают семьям делиться памятью и находить вдохновение для собственных карточек."
        asideActions={[{ label: "На страницу проекта", to: "/memory/museum" }]}
        alt
      />

      <section className="section section-alt" id="home-museum-gallery">
        <div className="section-inner">
          <div className="museum-gallery">
            {museumPlaceholders.map((item) => (
              <Link
                key={item.id}
                to="/memory/example"
                className="museum-gallery-item"
                aria-label={item.label}
              >
                <div className="museum-gallery-placeholder" aria-hidden="true">
                  <span>{item.initials}</span>
                </div>
                <div className="museum-gallery-caption">
                  <strong>{item.label}</strong>
                  <span>{item.dates}</span>
                </div>
              </Link>
            ))}
          </div>

          <div className="biography-bot-block">
            <div className="biography-bot-copy">
              <span className="section-tag">Биография с помощником</span>
              <h2 className="section-title">Помощник для написания биографии</h2>
              <p className="lead">
                Запишите аудио или отправьте сообщение о близком человеке — помощник поможет
                скомпоновать информацию и подготовить текст для публикации на странице памяти.
              </p>
              <Link to="/memory/create" className="btn btn-primary">
                Начать создание страницы
              </Link>
            </div>
            <figure className="biography-bot-figure">
              <img
                src={biographyBot}
                alt="Пример: аудио или текстовое сообщение для подготовки биографии"
                loading="lazy"
              />
            </figure>
          </div>
        </div>
      </section>

      <ProjectSection
        id="home-places-project"
        tag="02 · Проекты"
        title="Памятные места"
        text="Лучший инструмент для сохранения памяти и создания точек притяжения для туристов, гостей и местных жителей в вашем городе."
        actions={[
          { label: "Смотреть места", to: "/places" },
          { label: "Услуги", to: "/services", variant: "btn-outline" },
        ]}
        asideTitle="Карта, история и QR-код"
        asideText="Опишите место, добавьте фото и сделайте доступ к информации простым — по ссылке или QR-коду на месте."
        asideActions={[{ label: "На страницу проекта", to: "/places" }]}
        reverse
      />

      <ProjectSection
        id="home-tree-project"
        tag="03 · Проекты"
        title="Генеалогическое древо"
        text="Древо памяти — сервис для создания генеалогического древа онлайн. Расскажите историю своей семьи и свяжите поколения."
        actions={[
          { label: "Смотреть пример древа", to: "/family-tree#tree-example" },
          { label: "Создать своё древо", to: "/family-tree/create", variant: "btn-outline" },
        ]}
        asideTitle="Посмотрите демо-древо семьи"
        asideText="Погрузитесь в структуру семейной истории: узлы, даты, связи и карточки родственников на одной схеме."
        asideActions={[
          { label: "Смотреть древо", to: "/family-tree#tree-example" },
          { label: "Создать своё", to: "/family-tree/create", variant: "btn-primary" },
        ]}
        alt
      />

      <section className="section section-alt" id="home-tree-banner">
        <div className="section-inner">
          <figure className="tree-banner-figure">
            <img
              src={familyTreeBanner}
              alt="Историческая семья на фоне цифрового генеалогического древа"
              loading="lazy"
            />
          </figure>
          <div className="tree-banner-actions">
            <Link to="/family-tree#tree-example" className="btn btn-primary">
              Смотреть пример древа
            </Link>
            <Link to="/family-tree/create" className="btn btn-outline">
              Создать своё древо
            </Link>
          </div>
        </div>
      </section>

      <section className="section section-tint" id="home-contacts">
        <div className="section-inner">
          <div className="contact-layout">
            <div>
              <span className="section-tag">Связь</span>
              <h2 className="section-title">МемориалГис всегда на связи</h2>
              <p className="lead">
                Ваши вопросы, предложения и отзывы помогают нам сохранять память лучше.
                Напишите нам — мы обязательно ответим.
              </p>
            </div>
            <ContactForm title="Отправить сообщение" compact />
          </div>
        </div>
      </section>

      <section className="section" id="home-tours">
        <div className="section-inner">
          <span className="section-tag">04 · Проекты</span>
          <h2 className="section-title">Экскурсии</h2>
          <p className="lead">
            Памятные места можно объединить в единую экскурсию с маршрутом, описанием и
            заглавной страницей.
          </p>
          <div className="tour-grid" style={{ marginTop: "1.5rem" }}>
            {tours.map((tour) => (
              <article key={tour.title} className="tour-card">
                <h3>{tour.title}</h3>
                <p>{tour.text}</p>
                <blockquote>«{tour.quote}»</blockquote>
                <p className="tour-author">
                  {tour.author}
                  <span className="tour-role">{tour.role}</span>
                </p>
                <Link to="/places" className="btn btn-outline btn-sm">
                  Узнать больше
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="section-inner">
          <h2 className="section-title">Страницы памяти</h2>
          <p className="lead">Примеры того, как может выглядеть готовая страница о человеке.</p>
          <div className="people-grid" style={{ marginTop: "1.25rem" }}>
            {people.map((person) => (
              <article key={person.name} className="people-card">
                <p className="memorial-dates">{person.dates}</p>
                <h3>{person.name}</h3>
                <p style={{ marginBottom: "1rem" }}>{person.text}</p>
                <Link to="/memory/example" className="btn btn-outline btn-sm">
                  Смотреть страницу
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="home-faq">
        <div className="section-inner narrow">
          <h2 className="section-title">Частые вопросы</h2>
          <FaqAccordion items={homeFaq} />
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

      <section className="section section-alt" id="home-pricing">
        <div className="section-inner narrow" style={{ textAlign: "center" }}>
          <span className="section-tag">Цены</span>
          <h2 className="section-title">Прозрачные тарифы</h2>
          <p className="lead" style={{ marginLeft: "auto", marginRight: "auto" }}>
            Можно начать бесплатно и перейти на расширенный тариф, когда понадобится больше
            возможностей для семьи.
          </p>
          <Link to="/pricing" className="btn btn-outline">
            Открыть страницу с тарифами
          </Link>
        </div>
      </section>

      <CtaRegisterBand />
    </>
  );
}
