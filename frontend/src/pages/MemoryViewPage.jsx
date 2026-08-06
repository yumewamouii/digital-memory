import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { usePermissions } from "../auth/usePermissions";
import { Permission } from "../auth/permissions";
import { createOwnershipClaim, getMemorial, getMemorialQrBlob } from "../api/memorials";
import { mediaUrl } from "../api/trees";
import MemorialLocationMap from "../components/MemorialLocationMap";
import MemorialVideoPlayer from "../components/memorial/MemorialVideoPlayer";
import { exportMemorialPdf } from "../utils/exportMemorialPdf";
import { safeHttpUrl } from "../utils/safeUrl";

function yearFromDate(value) {
  if (!value) return null;
  const m = String(value).match(/^(\d{4})/);
  return m ? m[1] : null;
}

function formatLifeYears(birth, death, { deceased = false } = {}) {
  const b = yearFromDate(birth);
  const d = deceased ? yearFromDate(death) : null;
  if (b && d) return `${b}—${d}`;
  if (b) return `${b}—`;
  if (d) return `—${d}`;
  return "";
}

function deriveMemorialDeceased(card) {
  if (!card) return false;
  if (card.life_status === "deceased") return true;
  if (card.life_status === "alive" || card.life_status === "unknown") {
    return Boolean(card.death_date);
  }
  return Boolean(
    card.death_date ||
      card.cemetery_name ||
      card.cemetery_location ||
      (card.cemetery_lat != null && card.cemetery_lng != null),
  );
}

function formatFullDate(value) {
  if (!value) return "";
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return String(value);
  return `${m[3]}.${m[2]}.${m[1]}`;
}

function biographyParagraphs(biography) {
  if (!biography) return [];
  return biography
    .split(/\n+/)
    .map((p) => p.trim())
    .filter((p) => {
      if (!p) return false;
      if (
        /^(Тип страницы|Приватность|Гостевая книга|Металлическая|Эпитафия|Родственные связи|Фотогалерея|Видео):/i.test(
          p,
        )
      ) {
        return false;
      }
      return true;
    });
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
      aria-label={item.caption || "Просмотр фотографии"}
      onClick={onClose}
    >
      <button type="button" className="memorial-lightbox-close" onClick={onClose} aria-label="Закрыть">
        ×
      </button>
      <figure className="memorial-lightbox-figure" onClick={(event) => event.stopPropagation()}>
        <img src={item.src} alt={item.caption || ""} />
        {item.caption ? <figcaption>{item.caption}</figcaption> : null}
      </figure>
    </div>
  );
}

function MemorialNav({ sections }) {
  if (!sections.length) return null;
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

export default function MemoryViewPage() {
  const { cardId } = useParams();
  const { authHeaders, token, openAuthModal, setMessage, user } = useAuth();
  const { has } = usePermissions();
  const [card, setCard] = useState(null);
  const [claimMessage, setClaimMessage] = useState("");
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [qrUrl, setQrUrl] = useState("");
  const [lightboxItem, setLightboxItem] = useState(null);

  useEffect(() => {
    getMemorial(cardId, authHeaders)
      .then(setCard)
      .catch(() => setError("Карточка не найдена или недоступна"));
  }, [cardId, token]);

  useEffect(() => {
    let objectUrl = "";
    let cancelled = false;
    if (!cardId) return undefined;
    getMemorialQrBlob(cardId, authHeaders)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setQrUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setQrUrl("");
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [cardId, token]);

  const onClaim = async (e) => {
    e.preventDefault();
    if (!token) {
      openAuthModal(false);
      return;
    }
    try {
      await createOwnershipClaim(cardId, claimMessage, authHeaders);
      setMessage("Запрос на владение отправлен");
      setClaimMessage("");
    } catch {
      setMessage("Не удалось отправить запрос");
    }
  };

  const onExportPdf = async () => {
    if (!card) return;
    setExporting(true);
    try {
      await exportMemorialPdf(card, { authHeaders });
      setMessage("PDF сохранён");
    } catch {
      setMessage("Не удалось сформировать PDF");
    } finally {
      setExporting(false);
    }
  };

  const isDeceased = useMemo(() => deriveMemorialDeceased(card), [card]);
  const lifeYears = useMemo(
    () =>
      card
        ? formatLifeYears(card.birth_date, card.death_date, { deceased: isDeceased })
        : "",
    [card, isDeceased],
  );
  const bioParas = useMemo(
    () => (card ? biographyParagraphs(card.biography) : []),
    [card],
  );

  if (error) {
    return (
      <div className="page-shell" style={{ padding: "3rem 1.5rem" }}>
        <p>{error}</p>
        <Link to="/memory">К разделу памяти</Link>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="page-shell" style={{ padding: "3rem 1.5rem" }}>
        <p>Загрузка…</p>
      </div>
    );
  }

  const fullName = [card.last_name, card.first_name, card.middle_name]
    .filter(Boolean)
    .join(" ");
  const photo = mediaUrl(card.photo_url);
  const relatives = card.relatives || [];
  const gallery = card.gallery || [];
  const videos = card.videos || [];
  const audioClips = card.audio || [];
  const documents = card.documents || [];
  const links = (card.external_links || [])
    .map((link) => ({ ...link, safeUrl: safeHttpUrl(link.url) }))
    .filter((link) => link.safeUrl);
  const hasCemetery =
    isDeceased &&
    Boolean(
      card.cemetery_name || card.cemetery_location || card.cemetery_lat || card.cemetery_lng,
    );

  const docCategoryLabel = {
    diploma: "Диплом",
    military: "Военный билет",
    letter: "Письма",
    award: "Награды",
    other: "Документ",
  };

  const isExtended =
    card.page_kind === "extended" ||
    Boolean(card.biography) ||
    gallery.length > 0 ||
    videos.length > 0 ||
    audioClips.length > 0 ||
    documents.length > 0 ||
    hasCemetery ||
    links.length > 0;

  const treeId = card.family_tree_id;
  const treePersonId = card.tree_person_id;
  const treeHref = treeId
    ? `${card.family_tree_can_edit ? `/family-tree/${treeId}/edit` : `/family-tree/${treeId}`}${
        treePersonId ? `?person=${treePersonId}` : ""
      }`
    : null;

  const epitaph =
    card.epitaph ||
    (() => {
      const match = (card.biography || "").match(/^Эпитафия:\s*(.+)$/m);
      return match ? match[1].trim() : "";
    })();

  const navSections = [];
  if (epitaph) navSections.push({ id: "epitaph", label: "Эпитафия" });
  if (bioParas.length) navSections.push({ id: "biography", label: "Биография" });
  if (gallery.length) navSections.push({ id: "gallery", label: "Фотогалерея" });
  if (videos.length) navSections.push({ id: "videos", label: "Видео" });
  if (audioClips.length) navSections.push({ id: "audio", label: "Аудио" });
  if (documents.length) navSections.push({ id: "documents", label: "Документы" });
  if (relatives.length) navSections.push({ id: "relatives", label: "Родственники" });
  if (hasCemetery) navSections.push({ id: "location", label: "Местонахождение" });
  if (links.length) navSections.push({ id: "links", label: "Ссылки" });
  navSections.push({ id: "qr", label: "QR-код" });

  const claimForm =
    has(Permission.MEMORIAL_CLAIM_REQUEST) &&
    user &&
    user.id !== card.owner_id &&
    !card.deleted_at ? (
      <form className="stack-form" onSubmit={onClaim} style={{ marginTop: "2rem" }}>
        <h3>Запросить права владельца</h3>
        <textarea
          value={claimMessage}
          onChange={(e) => setClaimMessage(e.target.value)}
          placeholder="Кратко опишите основание"
          rows={3}
        />
        <button type="submit" className="btn-primary">
          Отправить запрос
        </button>
      </form>
    ) : null;

  const actions = (
    <div className="memorial-view-actions">
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        disabled={exporting}
        onClick={onExportPdf}
      >
        {exporting ? "Формируем PDF..." : "Скачать PDF"}
      </button>
      {card.can_edit ? (
        <Link to="/cabinet" className="btn btn-outline btn-sm">
          Управление в кабинете
        </Link>
      ) : null}
    </div>
  );

  if (!isExtended) {
    return (
      <div className="page-shell memorial-page">
        <section className="content-section memorial-brief">
          {actions}
          <div className="memorial-brief-layout">
            <div className="memorial-brief-main">
              <header className="memorial-brief-header">
                <figure className={`memorial-brief-photo${photo ? "" : " is-empty"}`}>
                  {photo ? <img src={photo} alt="" /> : <span>Портрет</span>}
                </figure>
                <div className="memorial-brief-identity">
                  <h1 className="memorial-brief-name">{fullName}</h1>
                  {lifeYears ? <p className="memorial-brief-years">{lifeYears}</p> : null}
                  {card.birth_place ? (
                    <p className="memorial-brief-place">
                      <span className="memorial-brief-place-label">Место рождения</span>
                      {card.birth_place}
                    </p>
                  ) : null}
                  {epitaph ? (
                    <blockquote className="memorial-brief-epitaph">{epitaph}</blockquote>
                  ) : null}
                </div>
              </header>

              {relatives.length ? (
                <section className="memorial-brief-relatives" id="relatives">
                  <h2>Родственники</h2>
                  <ul>
                    {relatives.map((item, index) => (
                      <li key={`${item.role}-${item.name}-${index}`}>
                        <span className="memorial-relative-role">{item.role}</span>
                        <span className="memorial-relative-name">{item.name}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {treeHref ? (
                <div className="memorial-tree-link-card">
                  <h3 className="memorial-tree-link-title">Семейное древо</h3>
                  <p className="memorial-tree-link-text">
                    Этот человек есть в генеалогическом древе
                    {card.family_tree_title ? ` «${card.family_tree_title}»` : ""}.
                  </p>
                  <Link className="btn btn-secondary btn-sm" to={treeHref}>
                    Открыть в древе
                  </Link>
                </div>
              ) : null}
            </div>

            <aside className="memorial-brief-aside" id="qr">
              {qrUrl ? (
                <div className="memorial-qr-card">
                  <img src={qrUrl} alt="QR-код страницы памяти" />
                  <p>QR-код для печати</p>
                  <a className="text-link" href={qrUrl} download={`memory-${card.id}-qr.png`}>
                    Скачать
                  </a>
                </div>
              ) : null}
            </aside>
          </div>
          {claimForm}
        </section>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <article className="memorial-page">
        {actions}
        <header className="memorial-page-header">
          <div className="memorial-hero-extended">
            <figure className={`memorial-portrait${photo ? " memorial-portrait--photo" : ""}`}>
              {photo ? <img src={photo} alt="" /> : <span>Портрет</span>}
            </figure>
            <div>
              <h1>
                {card.last_name}
                <br />
                {[card.first_name, card.middle_name].filter(Boolean).join(" ")}
              </h1>
              <div className="memorial-page-dates">
                <span>{formatFullDate(card.birth_date)}</span>
                <strong>{lifeYears || "—"}</strong>
                <span>{isDeceased ? formatFullDate(card.death_date) : ""}</span>
              </div>
              {card.birth_place ? (
                <p className="hint-text" style={{ marginBottom: 0 }}>
                  Место рождения: {card.birth_place}
                </p>
              ) : null}
            </div>
          </div>
        </header>

        <MemorialNav sections={navSections} />

        {epitaph ? (
          <section className="memorial-block" id="epitaph">
            <blockquote className="memorial-epitaph">
              <p>{epitaph}</p>
            </blockquote>
          </section>
        ) : null}

        {bioParas.length ? (
          <section className="memorial-block" id="biography">
            <h2>Биография</h2>
            {bioParas.map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </section>
        ) : null}

        {gallery.length ? (
          <section className="memorial-block" id="gallery">
            <h2>Фотогалерея</h2>
            <p className="hint-text" style={{ marginTop: 0 }}>
              Нажмите на фото, чтобы открыть его целиком.
            </p>
            <div className="memorial-gallery-grid">
              {gallery.map((item) => {
                const src = mediaUrl(item.url);
                return (
                  <div key={item.id} className="memorial-gallery-item">
                    <button
                      type="button"
                      className="memorial-gallery-thumb"
                      onClick={() =>
                        setLightboxItem({
                          src,
                          caption: item.caption || "",
                        })
                      }
                      aria-label={`Открыть фото: ${item.caption || "фотография"}`}
                    >
                      <img src={src} alt={item.caption || ""} loading="lazy" />
                    </button>
                    {item.caption ? <span>{item.caption}</span> : null}
                  </div>
                );
              })}
            </div>
            <GalleryLightbox item={lightboxItem} onClose={() => setLightboxItem(null)} />
          </section>
        ) : null}

        {videos.length ? (
          <section className="memorial-block" id="videos">
            <h2>Видео и видеозаписи</h2>
            <div className="memorial-video-grid">
              {videos.map((video) => (
                <MemorialVideoPlayer key={video.id} video={video} />
              ))}
            </div>
          </section>
        ) : null}

        {audioClips.length ? (
          <section className="memorial-block" id="audio">
            <h2>Аудиозаписи</h2>
            <div className="memorial-audio-list">
              {audioClips.map((clip) => (
                <article key={clip.id} className="memorial-audio-card">
                  <h3>{clip.title || "Запись голоса"}</h3>
                  <audio controls preload="metadata" src={mediaUrl(clip.url)}>
                    Ваш браузер не поддерживает аудио.
                  </audio>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {documents.length ? (
          <section className="memorial-block" id="documents">
            <h2>Документы</h2>
            <ul className="memorial-documents-list">
              {documents.map((doc) => (
                <li key={doc.id}>
                  <span className="memorial-meta-label">
                    {docCategoryLabel[doc.category] || "Документ"}
                  </span>
                  <a
                    href={mediaUrl(doc.url)}
                    className="text-link"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {doc.title || doc.original_name || "Открыть документ"}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {relatives.length ? (
          <section className="memorial-block" id="relatives">
            <h2>Родственники</h2>
            <ul className="memorial-relatives">
              {relatives.map((item, index) => (
                <li key={`${item.role}-${item.name}-${index}`}>
                  <span className="memorial-meta-label">{item.role}</span>
                  <strong>{item.name}</strong>
                </li>
              ))}
            </ul>
            {treeHref ? (
              <Link className="btn btn-secondary btn-sm" to={treeHref}>
                Открыть в семейном древе
              </Link>
            ) : null}
          </section>
        ) : null}

        {hasCemetery ? (
          <section className="memorial-block" id="location">
            <h2>Как найти захоронение</h2>
            <div className="memorial-location">
              {card.cemetery_name ? (
                <p>
                  <strong>{card.cemetery_name}</strong>
                </p>
              ) : null}
              {card.cemetery_location ? (
                <p>
                  <span className="memorial-meta-label">Адрес</span>
                  <br />
                  {card.cemetery_location}
                </p>
              ) : null}
              {card.cemetery_lat != null && card.cemetery_lng != null ? (
                <>
                  <p>
                    <span className="memorial-meta-label">Координаты</span>
                    <br />
                    {card.cemetery_lat}, {card.cemetery_lng}
                  </p>
                  <MemorialLocationMap
                    latitude={card.cemetery_lat}
                    longitude={card.cemetery_lng}
                    label={card.cemetery_name || card.cemetery_location || "Место захоронения"}
                  />
                </>
              ) : null}
            </div>
          </section>
        ) : null}

        {links.length ? (
          <section className="memorial-block" id="links">
            <h2>Внешние ссылки</h2>
            <div className="memorial-links">
              {links.map((link) => (
                <a
                  key={`${link.label}-${link.safeUrl}`}
                  href={link.safeUrl}
                  className="btn btn-outline btn-sm"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </section>
        ) : null}

        <section className="memorial-block" id="qr">
          <h2>QR-код для этой страницы</h2>
          {card.metal_plaque ? (
            <p className="lead">Можно заказать металлическую табличку с этим QR-кодом.</p>
          ) : null}
          {qrUrl ? (
            <div className="memorial-qr-card" style={{ maxWidth: 220 }}>
              <img src={qrUrl} alt="QR-код страницы памяти" />
              <a className="text-link" href={qrUrl} download={`memory-${card.id}-qr.png`}>
                Скачать
              </a>
            </div>
          ) : (
            <p className="hint-text">QR-код будет доступен после загрузки страницы.</p>
          )}
        </section>

        {claimForm}
      </article>
    </div>
  );
}
