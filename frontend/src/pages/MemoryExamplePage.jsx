import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import MemorialLocationMap from "../components/MemorialLocationMap";
import {
  briefExample,
  extendedExample,
  rasputinExample,
} from "../data/memorialExamples";
import rasputinPortrait from "../assets/rasputin-portrait.jpg";
import { exportExampleMemorialPdf } from "../utils/exportMemorialPdf";
import { useAuth } from "../context/AuthContext";

const examplesBySlug = {
  brief: briefExample,
  extended: extendedExample,
  rasputin: rasputinExample,
};

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

function GalleryLightbox({ item, onClose }) {
  useEffect(() => {
    if (!item) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [item, onClose]);

  if (!item) return null;

  return (
    <div
      className="memorial-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={item.label || "Просмотр фотографии"}
      onClick={onClose}
    >
      <button type="button" className="memorial-lightbox-close" onClick={onClose} aria-label="Закрыть">
        ×
      </button>
      <figure className="memorial-lightbox-figure" onClick={(event) => event.stopPropagation()}>
        <img src={item.image} alt={item.imageAlt || item.label || ""} />
        {item.label ? <figcaption>{item.label}</figcaption> : null}
      </figure>
    </div>
  );
}

function videoEmbedSrc(video) {
  if (video.rutubeId) return `https://rutube.ru/play/embed/${video.rutubeId}`;
  if (video.vkOid && video.vkId) {
    return `https://vk.com/video_ext.php?oid=${video.vkOid}&id=${video.vkId}&hd=2`;
  }
  if (video.youtubeId) return `https://www.youtube.com/embed/${video.youtubeId}`;
  return null;
}

function videoWatchHref(video) {
  if (video.rutubeId) return `https://rutube.ru/video/${video.rutubeId}/`;
  if (video.vkOid && video.vkId) return `https://vk.com/video${video.vkOid}_${video.vkId}`;
  if (video.youtubeId) return `https://www.youtube.com/watch?v=${video.youtubeId}`;
  return null;
}

function videoWatchLabel(video) {
  if (video.rutubeId) return "Смотреть на Rutube";
  if (video.vkOid && video.vkId) return "Смотреть во ВКонтакте";
  if (video.youtubeId) return "Смотреть на YouTube";
  return "Открыть видео";
}

function MemorialLink({ link }) {
  if (link.href) {
    return (
      <a
        href={link.href}
        className="btn btn-outline btn-sm"
        target="_blank"
        rel="noopener noreferrer"
      >
        {link.label}
      </a>
    );
  }

  return (
    <Link to={link.to} className="btn btn-outline btn-sm">
      {link.label}
    </Link>
  );
}

function BriefMemorial({ data }) {
  return (
    <article className="memorial-page">
      <header className="memorial-page-header">
        <p className="memorial-page-kicker">Пример краткой страницы · ГисМемориал</p>
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

function ExtendedMemorial({ data, kicker = "Пример расширенной страницы · ГисМемориал" }) {
  const [lightboxItem, setLightboxItem] = useState(null);

  return (
    <article className="memorial-page">
      <header className="memorial-page-header">
        <p className="memorial-page-kicker">{kicker}</p>
        <div className="memorial-hero-extended">
          {data.photo || data.slug === "rasputin" ? (
            <figure className="memorial-portrait memorial-portrait--photo">
              <img
                src={data.photo || rasputinPortrait}
                alt={data.photoAlt || data.fullName}
              />
              {data.photoCredit ? (
                <figcaption className="memorial-photo-credit">
                  Фото:{" "}
                  <a href={data.photoCredit.href} target="_blank" rel="noopener noreferrer">
                    {data.photoCredit.author}
                  </a>
                  , {data.photoCredit.license}
                </figcaption>
              ) : null}
            </figure>
          ) : (
            <div className="memorial-portrait" aria-hidden="true">
              <span>{data.photoPlaceholder}</span>
            </div>
          )}
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
        <p className="hint-text" style={{ marginTop: 0 }}>
          Нажмите на фото, чтобы открыть его целиком.
        </p>
        <div className="memorial-gallery-grid">
          {data.gallery.map((item) => (
            <div key={item.id} className="memorial-gallery-item">
              {item.image ? (
                <button
                  type="button"
                  className="memorial-gallery-thumb"
                  onClick={() => setLightboxItem(item)}
                  aria-label={`Открыть фото: ${item.label || item.imageAlt || "фотография"}`}
                >
                  <img src={item.image} alt={item.imageAlt || item.label} loading="lazy" />
                </button>
              ) : (
                <div className="memorial-gallery-ph" aria-hidden="true" />
              )}
              <span>{item.label}</span>
            </div>
          ))}
        </div>
        <GalleryLightbox item={lightboxItem} onClose={() => setLightboxItem(null)} />
      </section>

      <section className="memorial-block" id="videos">
        <h2>Видео и видеозаписи</h2>
        <div className="memorial-video-grid">
          {data.videos.map((video) => {
            const embedSrc = videoEmbedSrc(video);
            const watchHref = videoWatchHref(video);

            return (
              <article key={video.id} className="memorial-video-card">
                {embedSrc ? (
                  <div className="memorial-video-frame">
                    <iframe
                      src={embedSrc}
                      title={video.title}
                      allow="clipboard-write; autoplay; fullscreen; picture-in-picture; encrypted-media"
                      allowFullScreen
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="memorial-video-ph" aria-hidden="true">
                    ▶
                  </div>
                )}
                <h3>{video.title}</h3>
                <p>{video.note}</p>
                {watchHref ? (
                  <a
                    className="text-link"
                    href={watchHref}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {videoWatchLabel(video)}
                  </a>
                ) : null}
              </article>
            );
          })}
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
          <MemorialLocationMap
            latitude={data.cemetery.latitude}
            longitude={data.cemetery.longitude}
            label={data.cemetery.mapLabel || data.cemetery.name}
          />
        </div>
      </section>

      <section className="memorial-block" id="links">
        <h2>Внешние ссылки</h2>
        <div className="memorial-links">
          {data.links.map((link) => (
            <MemorialLink key={link.label} link={link} />
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
  const { setMessage } = useAuth();
  const [exporting, setExporting] = useState(false);

  if (!type) {
    return (
      <section className="section">
        <div className="section-inner">
          <div className="plan-choice plan-choice--wide">
            <h1 className="section-title" style={{ textAlign: "center" }}>
              Примеры страниц памяти
            </h1>
            <p className="lead" style={{ margin: "0 auto 1.75rem", textAlign: "center" }}>
              Посмотрите, как выглядят страница известного человека и шаблоны краткой и расширенной карточки.
            </p>
            <div className="plan-grid plan-grid--examples">
              <article className="plan-card plan-card--featured">
                <span className="plan-badge">Живой пример</span>
                <h3>{rasputinExample.fullName}</h3>
                <p>{rasputinExample.homeSpotlight.summary}</p>
                <Link to="/memory/example/rasputin" className="btn btn-primary">
                  Открыть страницу Распутина
                </Link>
              </article>
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
                <Link to="/memory/example/extended" className="btn btn-outline">
                  Открыть пример
                </Link>
              </article>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const data = examplesBySlug[type];
  if (!data) {
    return <Navigate to="/memory/example" replace />;
  }

  const isBrief = type === "brief";
  const isRasputin = type === "rasputin";

  const onExportPdf = async () => {
    setExporting(true);
    try {
      await exportExampleMemorialPdf(data, { slug: type });
      setMessage("PDF сохранён");
    } catch {
      setMessage("Не удалось сформировать PDF");
    } finally {
      setExporting(false);
    }
  };

  return (
    <section className="section memorial-example-section">
      <div className="section-inner narrow">
        {isBrief ? (
          <BriefMemorial data={data} />
        ) : (
          <ExtendedMemorial
            data={data}
            kicker={
              isRasputin
                ? "Живой пример страницы памяти · ГисМемориал"
                : "Пример расширенной страницы · ГисМемориал"
            }
          />
        )}

        <div className="hero-actions" style={{ marginTop: "2rem" }}>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={exporting}
            onClick={onExportPdf}
          >
            {exporting ? "Формируем PDF..." : "Скачать PDF"}
          </button>
          <Link to="/memory/create" className="btn btn-primary">
            Создать свою страницу
          </Link>
          {!isRasputin && (
            <Link
              to={isBrief ? "/memory/example/extended" : "/memory/example/brief"}
              className="btn btn-outline"
            >
              {isBrief ? "Смотреть расширенную" : "Смотреть краткую"}
            </Link>
          )}
          {isRasputin && (
            <Link to="/memory/example/extended" className="btn btn-outline">
              Другие шаблоны
            </Link>
          )}
          <Link to="/memory/example" className="btn btn-ghost">
            Все примеры
          </Link>
        </div>
      </div>
    </section>
  );
}
