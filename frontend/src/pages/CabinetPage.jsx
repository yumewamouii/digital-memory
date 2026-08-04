import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { API } from "../api";
import { deleteTree, listTrees, updateTree } from "../api/trees";
import PageHero from "../components/PageHero";
import { useAuth } from "../context/AuthContext";
import { usePermissions } from "../auth/usePermissions";
import { Permission } from "../auth/permissions";
import { deleteMemorial } from "../api/memorials";
import { personDisplayName, personSearchText } from "../utils/treeGraph";

function formatTreeDate(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

const VISIBILITY_LABELS = {
  private: "личное",
  link: "по ссылке",
  public: "открытое",
};

function formatVisibility(value) {
  if (!value) return "";
  return VISIBILITY_LABELS[value] || value;
}

export default function CabinetPage() {
  const { token, authHeaders, openAuthModal, setMessage } = useAuth();
  const { hasAny } = usePermissions();
  const [cards, setCards] = useState([]);
  const [trees, setTrees] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [qrLoadingId, setQrLoadingId] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [busyTreeId, setBusyTreeId] = useState(null);
  const [peopleQuery, setPeopleQuery] = useState("");
  const [expandedTreeId, setExpandedTreeId] = useState(null);
  const [expandedPeople, setExpandedPeople] = useState([]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [cardsRes, treesData] = await Promise.all([
        axios.get(`${API}/memorial-cards`, { headers: authHeaders }),
        listTrees(authHeaders),
      ]);
      setCards(cardsRes.data);
      setTrees(treesData);
    } catch {
      setMessage("Не удалось загрузить данные кабинета");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadData().catch(() => {});
  }, [token]);

  const removeCard = async (card) => {
    if (!window.confirm(`Удалить карточку «${card.last_name} ${card.first_name}»?`)) return;
    try {
      await deleteMemorial(card.id, authHeaders);
      setCards((prev) => prev.filter((item) => item.id !== card.id));
      setMessage("Карточка удалена");
    } catch {
      setMessage("Не удалось удалить карточку");
    }
  };

  const openQr = async (cardId) => {
    try {
      setQrLoadingId(cardId);
      const { data } = await axios.get(`${API}/memorial-cards/${cardId}/qr`, {
        headers: authHeaders,
        responseType: "blob",
      });
      const url = URL.createObjectURL(data);
      window.open(url, "_blank");
    } catch {
      setMessage("Не удалось открыть QR-код");
    } finally {
      setQrLoadingId(null);
    }
  };

  const startRename = (tree) => {
    setRenamingId(tree.id);
    setRenameTitle(tree.title || "");
  };

  const saveRename = async (treeId) => {
    if (!renameTitle.trim() || renameTitle.trim().length < 2) {
      setMessage("Название древа — минимум 2 символа");
      return;
    }
    try {
      setBusyTreeId(treeId);
      const data = await updateTree(treeId, { title: renameTitle.trim() }, authHeaders);
      setTrees((prev) => prev.map((tree) => (tree.id === treeId ? { ...tree, ...data } : tree)));
      setRenamingId(null);
      setMessage("Древо обновлено");
    } catch {
      setMessage("Не удалось обновить древо");
    } finally {
      setBusyTreeId(null);
    }
  };

  const removeTree = async (tree) => {
    if (!window.confirm(`Удалить древо «${tree.title}»?`)) return;
    try {
      setBusyTreeId(tree.id);
      await deleteTree(tree.id, authHeaders);
      setTrees((prev) => prev.filter((item) => item.id !== tree.id));
      setMessage("Древо удалено");
    } catch {
      setMessage("Не удалось удалить древо");
    } finally {
      setBusyTreeId(null);
    }
  };

  const openPeople = async (tree) => {
    if (expandedTreeId === tree.id) {
      setExpandedTreeId(null);
      setExpandedPeople([]);
      return;
    }
    try {
      setBusyTreeId(tree.id);
      const { getTree } = await import("../api/trees");
      const detail = await getTree(tree.id, authHeaders);
      setExpandedTreeId(tree.id);
      setExpandedPeople(detail.persons || []);
      setPeopleQuery("");
    } catch {
      setMessage("Не удалось загрузить список людей");
    } finally {
      setBusyTreeId(null);
    }
  };

  const filteredPeople = useMemo(() => {
    const q = peopleQuery.trim().toLowerCase();
    if (!q) return expandedPeople;
    return expandedPeople.filter((p) => personSearchText(p).includes(q));
  }, [expandedPeople, peopleQuery]);

  return (
    <>
      <PageHero
        title="Личный кабинет"
        subtitle="Карточки памяти и семейные древа — в одном месте."
      />

      <section className="section">
        <div className="section-inner">
          {!token ? (
            <div className="notice-card form-panel" style={{ margin: "0 auto" }}>
              <h2>Войдите в аккаунт</h2>
              <p className="lead">
                Чтобы видеть сохранённые материалы, страницы памяти и семейные древа.
              </p>
              <div className="hero-actions">
                <button type="button" className="btn btn-primary" onClick={() => openAuthModal(false)}>
                  Войти
                </button>
                <button type="button" className="btn btn-outline" onClick={() => openAuthModal(true)}>
                  Регистрация
                </button>
              </div>
            </div>
          ) : (
            <>
              {(hasAny(
                Permission.ORG_READ,
                Permission.ORG_CREATE,
                Permission.MEMORIAL_CREATE_ORG,
              ) ||
                hasAny(Permission.ADMIN_ACCESS, Permission.USER_MANAGE, Permission.AUDIT_READ)) && (
                <div className="cabinet-workspaces">
                  <h2 className="cabinet-section-title">Рабочие пространства</h2>
                  <ul className="cabinet-workspace-list">
                    {hasAny(
                      Permission.ORG_READ,
                      Permission.ORG_CREATE,
                      Permission.MEMORIAL_CREATE_ORG,
                    ) && (
                      <li>
                        <Link to="/partner" className="cabinet-workspace-link">
                          <strong>Кабинет партнёра</strong>
                          <span>Организация, сотрудники и карточки клиентов</span>
                        </Link>
                      </li>
                    )}
                    {hasAny(
                      Permission.ADMIN_ACCESS,
                      Permission.USER_MANAGE,
                      Permission.AUDIT_READ,
                    ) && (
                      <li>
                        <Link to="/admin" className="cabinet-workspace-link">
                          <strong>Админ-панель</strong>
                          <span>Пользователи, модерация и журнал действий</span>
                        </Link>
                      </li>
                    )}
                  </ul>
                </div>
              )}

              <div className="cabinet-actions">
                <Link to="/memory/create" className="btn btn-primary">
                  Новая карточка
                </Link>
                <Link to="/family-tree/create" className="btn btn-secondary">
                  Новое древо
                </Link>
                <button type="button" className="btn btn-ghost" onClick={loadData} disabled={isLoading}>
                  {isLoading ? "Обновляем..." : "Обновить"}
                </button>
              </div>

              <h2 className="cabinet-section-title">Карточки памяти</h2>
              <div className="cards">
                {cards.length === 0 ? (
                  <div className="notice-card">
                    <p className="empty-text">Пока нет карточек.</p>
                    <Link to="/memory/create" className="btn btn-outline btn-sm">
                      Создать первую страницу
                    </Link>
                  </div>
                ) : (
                  cards.map((card) => (
                    <article key={card.id} className="card">
                      <h3>
                        {card.last_name} {card.first_name}
                      </h3>
                      <p style={{ marginBottom: "1rem" }}>
                        {card.biography || "Биография пока не заполнена"}
                      </p>
                      <div className="cabinet-tree-actions">
                        <Link to={`/memory/${card.id}`} className="btn btn-ghost btn-sm">
                          Открыть
                        </Link>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => openQr(card.id)}
                          disabled={qrLoadingId === card.id}
                        >
                          {qrLoadingId === card.id ? "Открываем..." : "QR-код"}
                        </button>
                        {card.can_delete !== false && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => removeCard(card)}
                          >
                            Удалить
                          </button>
                        )}
                      </div>
                    </article>
                  ))
                )}
              </div>

              <h2 className="cabinet-section-title">Семейные древа</h2>
              <div className="cards">
                {trees.length === 0 ? (
                  <div className="notice-card">
                    <p className="empty-text">Пока нет древ.</p>
                    <Link to="/family-tree/create" className="btn btn-outline btn-sm">
                      Создать древо
                    </Link>
                  </div>
                ) : (
                  trees.map((tree) => {
                    const busy = busyTreeId === tree.id;
                    const isRenaming = renamingId === tree.id;
                    return (
                      <article key={tree.id} className="card cabinet-tree-card">
                        <div className="cabinet-tree-preview" aria-hidden="true">
                          <span className="cabinet-tree-preview-dot" />
                          <span className="cabinet-tree-preview-dot" />
                          <span className="cabinet-tree-preview-dot" />
                          <span className="cabinet-tree-preview-line" />
                        </div>
                        {isRenaming ? (
                          <div className="cabinet-tree-rename">
                            <label className="form-label">Название</label>
                            <input
                              value={renameTitle}
                              onChange={(e) => setRenameTitle(e.target.value)}
                              disabled={busy}
                            />
                            <div className="cabinet-tree-actions">
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => saveRename(tree.id)}
                                disabled={busy}
                              >
                                Сохранить
                              </button>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => setRenamingId(null)}
                              >
                                Отмена
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <h3>{tree.title}</h3>
                            <p className="cabinet-tree-meta">
                              {tree.person_count || 0} чел.
                              {tree.updated_at || tree.created_at
                                ? ` · ${formatTreeDate(tree.updated_at || tree.created_at)}`
                                : ""}
                              {tree.visibility
                                ? ` · ${formatVisibility(tree.visibility)}`
                                : ""}
                            </p>
                            <p className="cabinet-tree-desc">
                              {tree.description || "Описание не добавлено"}
                            </p>
                            <div className="cabinet-tree-actions">
                              <Link to={`/family-tree/${tree.id}`} className="btn btn-outline btn-sm">
                                Просмотр
                              </Link>
                              <Link
                                to={`/family-tree/${tree.id}/edit`}
                                className="btn btn-secondary btn-sm"
                              >
                                Править
                              </Link>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => openPeople(tree)}
                                disabled={busy}
                              >
                                {expandedTreeId === tree.id ? "Скрыть людей" : "Люди"}
                              </button>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => startRename(tree)}
                              >
                                Переименовать
                              </button>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => removeTree(tree)}
                                disabled={busy}
                              >
                                Удалить
                              </button>
                            </div>
                            {expandedTreeId === tree.id ? (
                              <div className="cabinet-tree-people">
                                <input
                                  placeholder="Поиск по ФИО"
                                  value={peopleQuery}
                                  onChange={(e) => setPeopleQuery(e.target.value)}
                                />
                                <ul>
                                  {filteredPeople.map((person) => (
                                    <li key={person.id}>
                                      <Link to={`/family-tree/${tree.id}/edit`}>
                                        {personDisplayName(person)}
                                      </Link>
                                    </li>
                                  ))}
                                  {!filteredPeople.length ? <li>Никого не найдено</li> : null}
                                </ul>
                              </div>
                            ) : null}
                          </>
                        )}
                      </article>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
