import { Link, Navigate, useParams } from "react-router-dom";
import { briefExample, extendedExample } from "../data/memorialExamples";

function ExampleNav({ type }) {
  const sections =
    type === "brief"
      ? [
          { id: "epitaph", label: "Эпитафия" },
          { id: "location", label: "Местонахождение" },
          { id: "relatives", label: "Родственные связи" },
          { id: "qr", label: "QR-код" },
        ]
      : [
          { id: "biography", label: "Биография" },
          { id: "gallery", label: "Фотогалерея" },
          { id: "videos", label: "Видео" },
          { id: "guestbook", label: "Слова близких" },
          { id: "location", label: "Местонахождение" },
          { id: "links", label: "Ссылки" },
          { id: "qr", label: "QR-код" },
        ];

  return (
    <nav className="memorial-page-nav" aria-label="Разделы страницы">
      {sections.map((section) => (
        <a key={section.id} href={`#${section.id}`}>
          {section.label}
        </a>
      ))}
    </nav>
  );
}

function QrPlaceholder() {
  return (
    <div className="memorial-qr" aria-hidden="true">
      <div className="memorial-qr-grid" />
      <span>QR-код страницы</span>
    </div>
  );
}

function BriefMemorial({ data }) {
  return (
    <article className="memorial-page">
      <header className="memorial-page-header">
        <p className="memorial-page-kicker">Пример краткой страницы · МемориалГис</p>
        <h1>
          {data.lastName}
          <br />
          {data.firstName} {data.middleName}
        </h1>
        <div className="memorial-page-dates">
          <span>{data.birthDay}</span>
          <strong>{data.dates}</strong>
          <span>{data.deathDay}</span>
        </div>
      </header>

      <ExampleNav type="brief" />

      <section className="memorial-block" id="epitaph">
        <blockquote className="memorial-epitaph">
          <p>{data.epitaph}</p>
          <footer>— {data.epitaphAuthor}</footer>
        </blockquote>
      </section>

      <section className="memorial-block" id="location">
        <h2>Как найти захоронение</h2>
        <div className="memorial-location">
          <p>
            <strong>{data.cemetery.name}</strong>
            <br />
            {data.cemetery.plot}
          </p>
          <p>
            <span className="memorial-meta-label">Адрес</span>
            <br />
            {data.cemetery.address}
          </p>
          <p>
            <span className="memorial-meta-label">Координаты</span>
            <br />
            {data.cemetery.coords}
          </p>
          <p>{data.cemetery.directions}</p>
          <div className="memorial-map-placeholder">Отметка на карте</div>
        </div>
      </section>

      <section className="memorial-block" id="relatives">
        <h2>Родственные связи</h2>
        <ul className="memorial-relatives">
          {data.relatives.map((person) => (
            <li key={person.name}>
              <span>{person.role}</span>
              <strong>{person.name}</strong>
            </li>
          ))}
        </ul>
        <p className="hint-text">{data.privacy}</p>
      </section>

      <section className="memorial-block" id="qr">
        <h2>QR-код для этой страницы</h2>
        <p className="lead">Можно распечатать и разместить на табличке или в семейном архиве.</p>
        <QrPlaceholder />
      </section>
    </article>
  );
}

function ExtendedMemorial({ data }) {
  return (
    <article className="memorial-page">
      <header className="memorial-page-header">
        <p className="memorial-page-kicker">Пример расширенной страницы · МемориалГис</p>
        <div className="memorial-hero-extended">
          <div className="memorial-portrait" aria-hidden="true">
            <span>{data.photoPlaceholder}</span>
          </div>
          <div>
            <h1>
              {data.lastName}
              <br />
              {data.firstName} {data.middleName}
            </h1>
            <div className="memorial-page-dates">
              <span>{data.birthDay}</span>
              <strong>{data.dates}</strong>
              <span>{data.deathDay}</span>
            </div>
          </div>
        </div>
      </header>

      <ExampleNav type="extended" />

      <section className="memorial-block" id="epitaph">
        <blockquote className="memorial-epitaph">
          <p>{data.epitaph}</p>
          <footer>— {data.epitaphAuthor}</footer>
        </blockquote>
      </section>

      <section className="memorial-block" id="biography">
        <h2>Биография</h2>
        <p className="lead">{data.biographyIntro}</p>
        {data.biographySections.map((section) => (
          <div key={section.title} className="memorial-bio-section">
            <h3>{section.title}</h3>
            <p>{section.text}</p>
          </div>
        ))}
      </section>

      <section className="memorial-block" id="gallery">
        <h2>Фотогалерея</h2>
        <div className="memorial-gallery-grid">
          {data.gallery.map((item) => (
            <div key={item.id} className="memorial-gallery-item">
              <div className="memorial-gallery-ph" aria-hidden="true" />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="memorial-block" id="videos">
        <h2>Видео и видеозаписи</h2>
        <div className="info-grid">
          {data.videos.map((video) => (
            <article key={video.id} className="info-card">
              <div className="memorial-video-ph" aria-hidden="true">
                ▶
              </div>
              <h3>{video.title}</h3>
              <p>{video.note}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="memorial-block" id="guestbook">
        <h2>Слова близких</h2>
        <div className="memorial-guestbook">
          {data.guestbook.map((entry) => (
            <blockquote key={entry.author}>
              <p>«{entry.text}»</p>
              <footer>— {entry.author}</footer>
            </blockquote>
          ))}
        </div>
      </section>

      <section className="memorial-block" id="location">
        <h2>Как найти захоронение</h2>
        <div className="memorial-location">
          <p>
            <strong>{data.cemetery.name}</strong>
            <br />
            {data.cemetery.plot}
          </p>
          <p>
            <span className="memorial-meta-label">Адрес</span>
            <br />
            {data.cemetery.address}
          </p>
          <p>
            <span className="memorial-meta-label">Координаты</span>
            <br />
            {data.cemetery.coords}
          </p>
          <p>{data.cemetery.directions}</p>
          <div className="memorial-map-placeholder">Отметка на карте</div>
        </div>
      </section>

      <section className="memorial-block" id="links">
        <h2>Внешние ссылки</h2>
        <div className="memorial-links">
          {data.links.map((link) => (
            <Link key={link.to} to={link.to} className="btn btn-outline btn-sm">
              {link.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="memorial-block" id="qr">
        <h2>QR-код для этой страницы</h2>
        <p className="lead">{data.metalPlaque}</p>
        <p className="hint-text">{data.privacy}</p>
        <QrPlaceholder />
      </section>
    </article>
  );
}

export default function MemoryExamplePage() {
  const { type } = useParams();

  if (!type) {
    return (
      <section className="section">
        <div className="section-inner">
          <div className="plan-choice">
            <h1 className="section-title" style={{ textAlign: "center" }}>
              Примеры страниц памяти
            </h1>
            <p className="lead" style={{ margin: "0 auto 1.75rem", textAlign: "center" }}>
              Посмотрите, как выглядят краткая и расширенная страница в МемориалГис.
            </p>
            <div className="plan-grid">
              <article className="plan-card">
                <span className="plan-badge">Краткая</span>
                <h3>{briefExample.fullName}</h3>
                <p>Эпитафия, место на карте, родственные связи и QR-код для печати.</p>
                <Link to="/memory/example/brief" className="btn btn-outline">
                  Открыть пример
                </Link>
              </article>
              <article className="plan-card">
                <span className="plan-badge">Расширенная</span>
                <h3>{extendedExample.fullName}</h3>
                <p>Биография, фото, видео, слова близких, ссылки и табличка с QR-кодом.</p>
                <Link to="/memory/example/extended" className="btn btn-primary">
                  Открыть пример
                </Link>
              </article>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (type !== "brief" && type !== "extended") {
    return <Navigate to="/memory/example" replace />;
  }

  const data = type === "brief" ? briefExample : extendedExample;

  return (
    <section className="section memorial-example-section">
      <div className="section-inner narrow">
        {type === "brief" ? <BriefMemorial data={data} /> : <ExtendedMemorial data={data} />}

        <div className="hero-actions" style={{ marginTop: "2rem" }}>
          <Link to="/memory/create" className="btn btn-primary">
            Создать свою страницу
          </Link>
          <Link
            to={type === "brief" ? "/memory/example/extended" : "/memory/example/brief"}
            className="btn btn-outline"
          >
            {type === "brief" ? "Смотреть расширенную" : "Смотреть краткую"}
          </Link>
          <Link to="/memory/example" className="btn btn-ghost">
            Все примеры
          </Link>
        </div>
      </div>
    </section>
  );
}
