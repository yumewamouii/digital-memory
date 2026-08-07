import { Link } from "react-router-dom";
import CtaRegisterBand from "../components/CtaRegisterBand";
import FaqAccordion from "../components/FaqAccordion";
import pillarMemory from "../assets/home-pillar-memory.png";
import biographyBot from "../assets/home-biography-bot.png";
import keepPhoto from "../assets/memory-keep-photo.png";
import keepAudio from "../assets/memory-keep-audio.png";
import keepVideo from "../assets/memory-keep-video.png";
import keepText from "../assets/memory-keep-text.png";
import keepMap from "../assets/memory-keep-map.png";
import keepLink from "../assets/memory-keep-link.png";

const whyReasons = [
  {
    title: "Фото пропадают из телефонов",
    text: "Через годы дети смогут открыть снимки свадьбы, двора или последнего лета — даже если старый телефон давно выбросили.",
  },
  {
    title: "У памятника не всё умещается",
    text: "По QR-коду родственник из другого города узнает, кем был человек: где учился, кого любил, как звучал его голос.",
  },
  {
    title: "Пока родственники рядом",
    text: "После похорон остаётся много историй, которые никто больше не расскажет. Пока тётя или дядя помнят детали — их ещё можно записать.",
  },
];

const keepItems = [
  {
    kind: "photo",
    title: "Фотографии",
    image: keepPhoto,
    imageAlt: "Старые семейные фотографии на столе",
    text: "Свадьба, классный портрет, двор детства — в одном альбоме, а не в пяти чатах.",
  },
  {
    kind: "audio",
    title: "Голос и звук",
    image: keepAudio,
    imageAlt: "Кассета и запись голоса на телефоне",
    text: "Запись поздравления с днём рождения или любимая песня с кассеты. Иногда хватает минуты, чтобы снова узнать голос.",
  },
  {
    kind: "video",
    title: "Видео",
    image: keepVideo,
    imageAlt: "Семейное видео на планшете",
    text: "Ссылки на YouTube или Vimeo — жест, улыбка, как человек говорил.",
  },
  {
    kind: "text",
    title: "Текст и даты",
    image: keepText,
    imageAlt: "Записная книжка с датами и короткими записями",
    text: "Эпитафия на несколько строк, даты жизни. Биографию можно дописать позже, когда найдутся слова.",
  },
  {
    kind: "map",
    title: "Место на карте",
    image: keepMap,
    imageAlt: "Карта с отметкой памятного места",
    text: "Кладбище или памятное место — проще доехать без долгих объяснений по телефону.",
  },
  {
    kind: "link",
    title: "Связи с родными",
    image: keepLink,
    imageAlt: "Схема семейного древа на бумаге",
    text: "Страницу можно привязать к человеку в семейном древе. Тогда внукам понятнее, кто кому кем приходится — без путаницы в фамилиях.",
  },
];

const createSteps = [
  {
    title: "Укажите имя и даты",
    text: "Хватит фамилии, имени и пары дат. Остальное можно дописать позже.",
  },
  {
    title: "Добавьте то, что есть под рукой",
    text: "Одно фото, короткая эпитафия, заметка от сестры — страница уже живая.",
  },
  {
    title: "Решите, кому открыть",
    text: "Оставьте ссылку в семье или разместите QR-код у памятника. Доступ задаёте вы.",
  },
];

const reviews = [
  {
    quote:
      "Сначала думала, что получится просто страница с фотографиями. А теперь внуки сами открывают её и спрашивают про бабушку.",
    author: "Елена, Новосибирск",
  },
  {
    quote:
      "Поставили табличку с кодом у памятника. Племянник из Питера приехал и сам прочитал, кем был дядя — мы даже не успели всё рассказать.",
    author: "Игорь, Казань",
  },
  {
    quote:
      "Писали биографию урывками, по вечерам. Через неделю вернулись к черновику — всё на месте, ничего не потерялось.",
    author: "Марина, Воронеж",
  },
];

const memoryFaq = [
  {
    q: "Кто увидит страницу?",
    a: "Только те, кому вы передадите ссылку или QR-код. Страница не появляется в открытом поиске сама по себе.",
  },
  {
    q: "Можно ли сделать страницу только для семьи?",
    a: "Да. Ссылку можно не публиковать и держать в семейном чате. QR-код тоже ставите только там, где решите сами.",
  },
  {
    q: "Где хранятся данные и что будет через годы?",
    a: "Материалы лежат в вашем аккаунте на серверах сервиса. Пока аккаунт активен, страница доступна вам и тем, кому вы открыли доступ. Обработка данных — по 152-ФЗ.",
  },
  {
    q: "Кто владелец данных?",
    a: "Вы. Можете менять текст и фото, закрывать доступ к ссылке и удалять карточку из кабинета.",
  },
  {
    q: "Что если сервис закроется?",
    a: "Мы ориентируемся на долгое хранение семейных материалов. При существенных изменениях сервиса предупредим заранее — чтобы семья успела сохранить копии важных файлов у себя.",
  },
  {
    q: "Сложно ли написать биографию?",
    a: "Не обязательно писать сразу всё. Можно начать с пяти предложений: кем был человек, кого любил, чем занимался. Помощник подскажет структуру, если слова не находятся.",
  },
];

export default function MemoryPage() {
  return (
    <>
      <section className="memory-hero">
        <div className="memory-hero-inner">
          <h1>Страница, которую дети откроют через двадцать лет</h1>
          <p className="memory-hero-lead">
            Не только даты на памятнике. Голос, фотографии, письма и документы —
            всё в одном месте.
          </p>
          <div className="memory-hero-actions">
            <Link to="/memory/create" className="btn btn-primary">
              Создать страницу памяти бесплатно
            </Link>
            <Link to="/memory/example" className="btn btn-secondary">
              Посмотреть пример
            </Link>
          </div>
          <p className="memory-hero-note">
            Базовый формат бесплатный. Регистрация понадобится только при сохранении.
          </p>
        </div>
      </section>

      <section className="section section-alt" id="memory-view">
        <div className="section-inner">
          <div className="memory-spotlight">
            <figure className="memory-spotlight-media">
              <img
                src={pillarMemory}
                alt="Семейный альбом и фотографии разных лет"
                loading="lazy"
              />
            </figure>
            <div className="memory-spotlight-copy">
              <span className="section-tag">Пример</span>
              <p className="memorial-dates">1928 — 2019</p>
              <h2 className="section-title">Иванова Мария Петровна</h2>
              <p className="lead">
                Учительница, мать троих детей. На странице — классный портрет 1954 года,
                запись голоса с дня рождения внучки и заметка от дочери: «Мама всегда
                читала вслух перед сном».
              </p>
              <blockquote className="memory-quote">
                «Пусть откроют эту страницу, когда захотят просто услышать её снова.»
              </blockquote>
              <div className="hero-actions" style={{ justifyContent: "flex-start" }}>
                <Link to="/memory/example" className="btn btn-primary">
                  Открыть пример страницы
                </Link>
                <Link to="/memory/museum" className="btn btn-outline">
                  Музей памяти
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="memory-why">
        <div className="section-inner">
          <span className="section-tag">Зачем это нужно</span>
          <h2 className="section-title">Почему семьи начинают страницу</h2>
          <p className="lead">
            Обычно не из-за «функций», а потому что что-то уже почти потерялось.
          </p>
          <div className="memory-why-list">
            {whyReasons.map((item) => (
              <article key={item.title} className="memory-why-item">
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-tint" id="memory-services">
        <div className="section-inner">
          <span className="section-tag">Что хранится</span>
          <h2 className="section-title">Что обычно кладут на страницу</h2>
          <p className="lead">
            Добавляйте то, что есть сейчас. Потом дополните, когда найдёте ещё одно письмо
            или фото из старого альбома.
          </p>
          <div className="memory-keep-grid">
            {keepItems.map((item) => (
              <article key={item.title} className="memory-keep-card">
                <div className="memory-keep-preview">
                  <img src={item.image} alt={item.imageAlt} loading="lazy" />
                </div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="memory-look">
        <div className="section-inner">
          <div className="memory-split">
            <div>
              <span className="section-tag">Как выглядит</span>
              <h2 className="section-title">Как выглядит страница</h2>
              <p className="lead">
                Даты, портрет, эпитафия, место на карте, альбом и короткие слова родных.
                С телефона у памятника открывается нормально — крупно и без лишних кнопок.
              </p>
              <ul className="memory-look-points">
                <li>Ссылка для семьи и отдельный QR-код для таблички</li>
                <li>Связь с человеком в семейном древе</li>
                <li>Черновик в кабинете — правите, когда готовы</li>
              </ul>
              <Link to="/memory/example" className="btn btn-outline">
                Посмотреть, как это выглядит
              </Link>
            </div>
            <aside className="memory-look-aside">
              <p className="memorial-dates">1960 — 2021</p>
              <h3>Поликарпов Владимир Владимирович</h3>
              <p>
                На странице — фото с рыбалки, карта участка и три коротких воспоминания
                от друзей. Без длинных речей — только то, что семья хочет оставить.
              </p>
              <Link to="/memory/example" className="text-link">
                Смотреть эту страницу
              </Link>
            </aside>
          </div>
        </div>
      </section>

      <section className="section section-alt" id="memory-how">
        <div className="section-inner">
          <div className="memory-split memory-split--bio">
            <div>
              <span className="section-tag">Как создать</span>
              <h2 className="section-title">Три шага — без спешки</h2>
              <ol className="memory-steps">
                {createSteps.map((step, index) => (
                  <li key={step.title}>
                    <span className="memory-steps-num">{index + 1}</span>
                    <div>
                      <h3>{step.title}</h3>
                      <p>{step.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <figure className="memory-bio-figure">
              <img
                src={biographyBot}
                alt="Черновик биографии: можно начать с короткого сообщения"
                loading="lazy"
              />
              <figcaption>
                Если слова не находятся — начните с голосового сообщения или пяти строк.
                Структуру подскажем, править будете сами.
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section className="section" id="memory-reviews">
        <div className="section-inner">
          <span className="section-tag">Отзывы</span>
          <h2 className="section-title">Как об этом говорят семьи</h2>
          <div className="memory-reviews-grid">
            {reviews.map((item) => (
              <figure key={item.author} className="memory-review">
                <blockquote>«{item.quote}»</blockquote>
                <figcaption>{item.author}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-tint" id="memory-faq">
        <div className="section-inner narrow">
          <h2 className="section-title">Частые вопросы</h2>
          <p className="lead">
            Про доступ, владельца данных и то, что волнует до первой публикации.
          </p>
          <FaqAccordion items={memoryFaq} />
        </div>
      </section>

      <section className="section">
        <div className="section-inner narrow">
          <div className="memory-final-cta">
            <h2 className="section-title">Оставьте детям то, чего нет на памятнике</h2>
            <p className="lead">
              Имя, одно фото и несколько строк — уже достаточно, чтобы страница жила.
              Остальное семья дополнит позже.
            </p>
            <Link to="/memory/create" className="btn btn-primary">
              Начать сохранять историю семьи
            </Link>
          </div>
        </div>
      </section>

      <CtaRegisterBand
        title="Сохраните черновик в кабинете"
        text="Зарегистрируйтесь, чтобы вернуться к фотографиям и тексту в любой день."
      />
    </>
  );
}
