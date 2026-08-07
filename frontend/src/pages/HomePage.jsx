import { Link } from "react-router-dom";
import ContactForm from "../components/ContactForm";
import CtaRegisterBand from "../components/CtaRegisterBand";
import FaqAccordion from "../components/FaqAccordion";
import { useAuth } from "../context/AuthContext";
import pillarMemory from "../assets/home-pillar-memory.png";
import pillarTree from "../assets/home-pillar-tree.png";
import pillarPlaces from "../assets/home-pillar-places.png";
import biographyBot from "../assets/home-biography-bot.png";
import familyTreeBanner from "../assets/home-family-tree-banner.png";
import keepPhoto from "../assets/memory-keep-photo.png";
import keepAudio from "../assets/memory-keep-audio.png";
import keepVideo from "../assets/memory-keep-video.png";
import keepText from "../assets/memory-keep-text.png";
import keepMap from "../assets/memory-keep-map.png";
import keepLink from "../assets/memory-keep-link.png";
import { rasputinExample } from "../data/memorialExamples";
import rasputinPortrait from "../assets/rasputin-portrait.jpg";

const keepItems = [
  {
    title: "Фотографии",
    image: keepPhoto,
    imageAlt: "Старые семейные фотографии на столе",
    text: "Свадьба, двор детства, портрет с полки — в одном альбоме, а не в чатах и старых телефонах.",
  },
  {
    title: "Голос и звук",
    image: keepAudio,
    imageAlt: "Кассета и запись голоса",
    text: "Поздравление с днём рождения или любимая песня. Иногда хватает минуты, чтобы снова узнать голос.",
  },
  {
    title: "Видео",
    image: keepVideo,
    imageAlt: "Семейное видео на планшете",
    text: "Жест, улыбка, как человек говорил — ссылки на ролики рядом с биографией.",
  },
  {
    title: "Текст и даты",
    image: keepText,
    imageAlt: "Записная книжка с датами",
    text: "Эпитафия, даты жизни, короткие истории родных. Биографию можно дописать позже.",
  },
  {
    title: "Место на карте",
    image: keepMap,
    imageAlt: "Карта с отметкой памятного места",
    text: "Кладбище или памятное место — открыть навигацию проще, чем объяснять дорогу по телефону.",
  },
  {
    title: "Связи с родными",
    image: keepLink,
    imageAlt: "Схема семейного древа",
    text: "Страницу можно связать с человеком в семейном древе — внукам понятнее, кто кому кем приходится.",
  },
];

const whyReasons = [
  {
    title: "Фотографии не вечны",
    text: "Телефоны ломаются, компьютеры меняются, старые снимки теряются. Соберите фотографии в одном месте, чтобы их могли увидеть дети, внуки и другие близкие спустя годы.",
  },
  {
    title: "На памятнике невозможно рассказать целую жизнь",
    text: "По QR-коду родственники и друзья смогут узнать больше о человеке: посмотреть фотографии, прочитать воспоминания, услышать голос, увидеть важные моменты его жизни.",
  },
  {
    title: "Пока воспоминания ещё живы",
    text: "Самые ценные истории хранятся в памяти родных. Со временем детали забываются. Запишите воспоминания сейчас, пока их ещё могут рассказать те, кто знал человека.",
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

const trustPoints = [
  {
    title: "Кто владелец страницы",
    text: "Вы. Меняете текст и фото, закрываете доступ и удаляете карточку из кабинета.",
  },
  {
    title: "Кто увидит страницу",
    text: "Только те, кому передадите ссылку или QR-код. В открытый поиск страница сама не попадает.",
  },
  {
    title: "Приватность для семьи",
    text: "Ссылку можно держать в семейном чате. QR-код ставите только там, где решите сами.",
  },
  {
    title: "Данные и закон",
    text: "Хранение на серверах сервиса, обработка по 152-ФЗ. Материалы лежат в вашем аккаунте.",
  },
  {
    title: "Если сервис изменится",
    text: "Ориентируемся на долгое хранение. О существенных изменениях предупредим заранее — чтобы семья успела сохранить копии.",
  },
  {
    title: "Передача родственникам",
    text: "Доступ можно открыть близким по ссылке. Вопросы о наследовании кабинета — через поддержку.",
  },
];

const homeFaq = [
  {
    q: "Сколько это стоит? Есть ли бесплатный тариф?",
    a: "Да. Базовый тариф бесплатный: одна страница памяти, QR-код и базовое семейное древо. Расширенные возможности — по подписке «Семейный».",
  },
  {
    q: "Кто хранит данные и кто владелец страницы?",
    a: "Материалы хранятся в вашем аккаунте на серверах сервиса. Владелец страницы — вы: можете править, закрывать доступ и удалять карточку.",
  },
  {
    q: "Кто увидит страницу? Можно ли сделать приватной?",
    a: "Страницу видят только те, кому вы передадите ссылку или QR-код. Можно не публиковать ссылку и держать её только в семье.",
  },
  {
    q: "Что если сервис закроется или аккаунт удалят?",
    a: "Мы ориентируемся на долгое хранение семейных материалов. О существенных изменениях предупредим заранее. Если аккаунт удалить — данные страницы удаляются вместе с ним; заранее сохраните важные файлы у себя и обсудите с семьёй, кому передать доступ.",
  },
  {
    q: "Можно ли скачать архив или экспортировать данные?",
    a: "Фото и файлы, которые вы загрузили, остаются вашими — их можно сохранить локально. Экспорт древа в .ged уже доступен при работе с родословной; расширенный архив страницы памяти развивается вместе с сервисом.",
  },
  {
    q: "Кто оплачивает хранение через 20–30 лет?",
    a: "Базовый формат рассчитан на долгую жизнь страницы в рамках сервиса. Платные тарифы помогают развивать платформу. Если модель изменится — сообщим заранее и дадим время сохранить материалы.",
  },
  {
    q: "Можно ли передать страницу родственникам?",
    a: "Да: откройте доступ по ссылке или QR-коду. Чтобы другой человек вёл страницу из своего кабинета — напишите в поддержку, поможем с передачей.",
  },
];

const familyQuote = {
  text: "Оставили QR у памятника. Племянник приехал из другого города и сам прочитал, кем был дядя — мы даже не успели всё рассказать.",
  author: "Игорь, Казань",
};

export default function HomePage() {
  const { openAuthModal } = useAuth();

  return (
    <>
      <section className="home-landing-hero" id="home-top">
        <div className="home-landing-hero-visual" aria-hidden="true">
          <img src={pillarMemory} alt="" />
        </div>
        <div className="home-landing-hero-shade" aria-hidden="true" />
        <div className="home-landing-hero-inner">
          <p className="home-landing-brand">ГисМемориал</p>
          <h1>Сохраните семейные фотографии, документы и воспоминания в одном месте</h1>
          <p className="home-landing-lead">
            Страница памяти с фото, голосом и биографией — и QR-код, который
            открывает её у памятника или в семейном чате.
          </p>
          <div className="home-landing-actions">
            <Link to="/memory/create" className="btn btn-primary">
              Создать страницу памяти
            </Link>
            <Link to="/memory/example/rasputin" className="btn btn-secondary">
              Посмотреть пример
            </Link>
          </div>
          <p className="home-landing-note">Базовый формат бесплатный. Регистрация — только при сохранении.</p>
        </div>
      </section>

      <section className="home-proof-band" aria-label="О сервисе кратко">
        <div className="section-inner">
          <ul className="home-proof-list">
            <li>
              <strong>Бесплатный старт</strong>
              <span>страница памяти и QR-код</span>
            </li>
            <li>
              <strong>Для семьи</strong>
              <span>доступ только по вашей ссылке</span>
            </li>
            <li>
              <strong>152-ФЗ</strong>
              <span>хранение персональных данных</span>
            </li>
            <li>
              <strong>На годы вперёд</strong>
              <span>фотографии и документы в одном месте</span>
            </li>
          </ul>
        </div>
      </section>

      <section className="section" id="home-example">
        <div className="section-inner">
          <div className="memory-spotlight">
            <figure className="home-example-card" aria-label="Превью страницы памяти">
              <div className="home-example-portrait home-example-portrait--photo">
                <img
                  src={rasputinExample.photo || rasputinPortrait}
                  alt={rasputinExample.photoAlt || "Валентин Григорьевич Распутин"}
                />
              </div>
              <figcaption>
                <strong>
                  {rasputinExample.lastName}
                  <br />
                  {rasputinExample.firstName} {rasputinExample.middleName}
                </strong>
                <span>{rasputinExample.dates}</span>
                <em>Знаменский монастырь · Иркутск</em>
              </figcaption>
            </figure>
            <div className="memory-spotlight-copy">
              <span className="section-tag">Живой пример</span>
              <p className="memorial-dates">{rasputinExample.dates}</p>
              <h2 className="section-title">{rasputinExample.fullName}</h2>
              <p className="lead">{rasputinExample.homeSpotlight.summary}</p>
              <blockquote className="memory-quote">
                «{rasputinExample.homeSpotlight.quote}»
              </blockquote>
              <div className="hero-actions" style={{ justifyContent: "flex-start" }}>
                <Link to="/memory/example/rasputin" className="btn btn-primary">
                  Открыть страницу Распутина
                </Link>
                <Link to="/memory/museum" className="btn btn-outline">
                  Музей памяти
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-alt" id="home-why">
        <div className="section-inner">
          <h2 className="section-title">История человека не должна исчезнуть со временем</h2>
          <p className="lead">
            Страницу памяти создают не ради технологий. Её создают, чтобы сохранить то, что
            невозможно восстановить позже.
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

      <section className="section home-quote-band" id="home-quote">
        <div className="section-inner narrow">
          <blockquote className="home-family-quote">
            <p>«{familyQuote.text}»</p>
            <footer>{familyQuote.author}</footer>
          </blockquote>
        </div>
      </section>

      <section className="section section-tint" id="home-keep">
        <div className="section-inner">
          <span className="section-tag">Что можно сохранить</span>
          <h2 className="section-title">Не интерфейс. Память.</h2>
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

      <section className="section" id="home-how">
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
              <div className="hero-actions" style={{ justifyContent: "flex-start", marginTop: "1.75rem" }}>
                <Link to="/memory/create" className="btn btn-primary">
                  Начать бесплатно
                </Link>
              </div>
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

      <section className="section section-alt" id="home-trust">
        <div className="section-inner">
          <span className="section-tag">Доверие и безопасность</span>
          <h2 className="section-title">Как мы защищаем ваши данные</h2>
          <p className="lead">
            Перед регистрацией обычно спрашивают про доступ, владельца и долгий срок хранения.
            Коротко — здесь.
          </p>
          <div className="home-trust-grid">
            {trustPoints.map((item) => (
              <article key={item.title} className="home-trust-item">
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
          <div className="hero-actions" style={{ justifyContent: "flex-start", marginTop: "1.75rem" }}>
            <Link to="/pricing" className="btn btn-outline">
              Смотреть тарифы
            </Link>
            <Link to="/faq" className="btn btn-ghost">
              Все вопросы и ответы
            </Link>
          </div>
        </div>
      </section>

      <section className="section home-more-band" id="home-more">
        <div className="section-inner">
          <span className="section-tag">Ещё в сервисе</span>
          <h2 className="section-title">Рядом со страницей памяти</h2>
          <p className="lead">Генеалогическое древо и места захоронения — рядом со страницами памяти.</p>
          <div className="home-more-grid">
            <article className="home-more-card">
              <figure className="home-more-media">
                <img src={pillarTree} alt="Семейное древо" loading="lazy" />
              </figure>
              <div className="home-more-copy">
                <h3>Семейное древо</h3>
                <p>Соберите родословную и свяжите её со страницами памяти родственников.</p>
                <div className="home-more-actions">
                  <Link to="/family-tree#tree-example" className="btn btn-outline btn-sm">
                    Смотреть пример древа
                  </Link>
                  <Link to="/family-tree/create" className="btn btn-primary btn-sm">
                    Создать древо бесплатно
                  </Link>
                </div>
              </div>
            </article>
            <article className="home-more-card">
              <figure className="home-more-media">
                <img src={pillarPlaces} alt="Памятное место в городе" loading="lazy" />
              </figure>
              <div className="home-more-copy">
                <h3>Памятные места</h3>
                <p>История места, карта и QR-код — для жителей и гостей города.</p>
                <div className="home-more-actions">
                  <Link to="/places" className="btn btn-outline btn-sm">
                    Смотреть места
                  </Link>
                  <Link to="/contacts" className="btn btn-primary btn-sm">
                    Подать заявку
                  </Link>
                </div>
              </div>
            </article>
          </div>
          <figure className="home-tree-banner">
            <img src={familyTreeBanner} alt="Семья на фоне семейного древа" loading="lazy" />
          </figure>
        </div>
      </section>

      <section className="section section-tint" id="home-faq">
        <div className="section-inner narrow">
          <h2 className="section-title">Частые вопросы перед регистрацией</h2>
          <p className="lead">
            Стоимость, доступ, экспорт и то, что будет со страницей через годы.
          </p>
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

      <section className="section" id="home-pricing">
        <div className="section-inner home-pricing-band">
          <div>
            <span className="section-tag">Цены</span>
            <h2 className="section-title">Начать можно бесплатно</h2>
            <p className="lead">
              Базовый тариф — страница памяти, QR-код и базовое древо. Расширение — когда понадобится семье.
            </p>
          </div>
          <div className="home-pricing-actions">
            <Link to="/memory/create" className="btn btn-primary">
              Сохранить историю семьи
            </Link>
            <Link to="/pricing" className="btn btn-outline">
              Смотреть тарифы
            </Link>
          </div>
        </div>
      </section>

      <section className="section section-alt" id="home-contacts">
        <div className="section-inner">
          <div className="contact-layout">
            <div>
              <span className="section-tag">Связь</span>
              <h2 className="section-title">Напишите нам</h2>
              <p className="lead">Вопросы про доступ, тарифы и передачу страницы — ответим в рабочее время.</p>
            </div>
            <ContactForm title="Отправить сообщение" compact />
          </div>
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
            <button type="button" className="btn btn-primary" onClick={() => openAuthModal(true)}>
              Начать бесплатно
            </button>
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
