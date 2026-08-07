import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { searchMemorials } from "../api/memorials";
import { mediaUrl } from "../api/trees";
import PageHero from "../components/PageHero";

const PAGE_SIZE = 12;

const museumValues = [
  {
    title: "Открытые страницы",
    text: "Здесь собраны опубликованные карточки: фотографии, даты и краткие биографии.",
  },
  {
    title: "Удобный просмотр",
    text: "Читайте примеры и оформляйте свои страницы по образцу — без сложных инструкций.",
  },
  {
    title: "Связь с древом",
    text: "Каждую страницу можно привязать к человеку в генеалогическом древе.",
  },
];

function yearFromDate(value) {
  if (!value) return null;
  const m = String(value).match(/^(\d{4})/);
  return m ? m[1] : null;
}

function formatLifeYears(card) {
  const birth = yearFromDate(card.birth_date);
  const death =
    card.life_status === "alive" ? null : yearFromDate(card.death_date);
  if (birth && death) return `${birth} — ${death}`;
  if (birth) return `${birth} —`;
  if (death) return `— ${death}`;
  return "";
}

function fullName(card) {
  return [card.last_name, card.first_name, card.middle_name]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function initials(card) {
  const parts = [card.last_name, card.first_name].filter(Boolean);
  return parts
    .map((part) => part[0]?.toUpperCase() || "")
    .join("")
    .slice(0, 2);
}

function rangeLabel(page, pageSize, total) {
  if (!total) return "";
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return `Показано ${from}–${to} из ${total}`;
}

function PaginationBar({ page, pageSize, total, onPageChange, disabled }) {
  const totalPages = Math.max(1, Math.ceil((total || 0) / pageSize));
  if (!total) return null;
  return (
    <div className="admin-pagination" style={{ marginTop: "1.5rem" }}>
      <span className="admin-pagination-label">{rangeLabel(page, pageSize, total)}</span>
      <div className="admin-pagination-actions">
        <button
          type="button"
          className="btn btn-sm btn-outline"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Назад
        </button>
        <span className="admin-pagination-page">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          className="btn btn-sm btn-outline"
          disabled={disabled || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Далее
        </button>
      </div>
    </div>
  );
}

export default function MemoryMuseumPage() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await searchMemorials(debouncedQuery, {
          page,
          pageSize: PAGE_SIZE,
        });
        if (cancelled) return;
        setItems(data.items || []);
        setTotal(data.total || 0);
        if (data.page && data.page !== page) setPage(data.page);
      } catch (err) {
        if (cancelled) return;
        setItems([]);
        setTotal(0);
        setError("Не удалось загрузить музей памяти. Попробуйте позже.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, page]);

  const emptyMessage = debouncedQuery
    ? "По вашему запросу ничего не найдено."
    : "Пока нет публичных страниц памяти.";

  return (
    <>
      <PageHero
        title="Музей памяти"
        subtitle="Каталог публичных страниц памяти: фотографии, годы жизни и краткие описания."
      >
        <div className="hero-actions">
          <Link to="/memory/create" className="btn btn-primary">
            Создать страницу
          </Link>
          <Link to="/memory/example" className="btn btn-outline">
            Смотреть пример
          </Link>
        </div>
      </PageHero>

      <section className="section">
        <div className="section-inner narrow">
          <p className="lead">
            Музей памяти — открытый каталог опубликованных страниц. Сюда автоматически
            попадают только публичные карточки; приватные, черновики и страницы на
            модерации здесь не отображаются.
          </p>
        </div>
      </section>

      <section className="section section-alt">
        <div className="section-inner">
          <div className="info-grid">
            {museumValues.map((item) => (
              <article key={item.title} className="info-card">
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-inner">
          <div className="museum-catalog-head">
            <h2 className="section-title" style={{ marginBottom: 0 }}>
              Страницы в музее памяти
            </h2>
            <label className="museum-search">
              <input
                type="search"
                placeholder="Поиск по фамилии, имени, отчеству…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoComplete="off"
                aria-label="Поиск по ФИО"
              />
            </label>
          </div>

          {error ? <p className="memorial-field-error" style={{ marginTop: "1rem" }}>{error}</p> : null}

          {loading ? (
            <p className="hint-text" style={{ marginTop: "1.25rem" }}>
              Загружаем страницы…
            </p>
          ) : items.length === 0 ? (
            <p className="hint-text" style={{ marginTop: "1.25rem" }}>
              {emptyMessage}
            </p>
          ) : (
            <>
              <div className="people-grid" style={{ marginTop: "1.25rem" }}>
                {items.map((card) => {
                  const photo = mediaUrl(card.photo_url);
                  const name = fullName(card);
                  const years = formatLifeYears(card);
                  return (
                    <article key={card.id} className="people-card">
                      <div className="people-card-photo">
                        {photo ? (
                          <img src={photo} alt={name} loading="lazy" />
                        ) : (
                          <span aria-hidden="true">{initials(card) || "?"}</span>
                        )}
                      </div>
                      {years ? <p className="memorial-dates">{years}</p> : null}
                      <h3>{name || "Без имени"}</h3>
                      {card.short_description ? (
                        <p style={{ marginBottom: "0.75rem" }}>{card.short_description}</p>
                      ) : null}
                      <Link to={`/memory/${card.id}`} className="btn btn-outline btn-sm">
                        Открыть страницу
                      </Link>
                    </article>
                  );
                })}
              </div>
              <PaginationBar
                page={page}
                pageSize={PAGE_SIZE}
                total={total}
                onPageChange={setPage}
                disabled={loading}
              />
            </>
          )}
        </div>
      </section>

      <section className="section section-alt">
        <div className="section-inner narrow">
          <div className="notice-card">
            <h2>Добавьте свою страницу в музей памяти</h2>
            <p className="lead">
              Создайте страницу с фотографиями и биографией и выберите видимость
              «Публичная» — карточка появится в музее без дополнительных действий.
            </p>
            <div className="hero-actions">
              <Link to="/memory/create" className="btn btn-primary">
                Создать страницу
              </Link>
              <Link to="/memory/example" className="btn btn-outline">
                Смотреть пример
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
