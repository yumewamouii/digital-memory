import { useEffect, useMemo, useState } from "react";
import PageHero from "../../components/PageHero";
import { useAuth } from "../../context/AuthContext";
import { usePermissions } from "../../auth/usePermissions";
import { Permission } from "../../auth/permissions";
import { ROLE_LABELS } from "../../auth/roles";
import {
  getAdminStats,
  listAdminClaims,
  listAdminOrganizations,
  listAdminReviewQueue,
  listAdminUsers,
  listAuditLogs,
  resolveAdminReview,
  reviewAdminClaim,
  updateAdminUser,
} from "../../api/admin";
import { listMemorials, restoreMemorial } from "../../api/memorials";

const PAGE_SIZE = 50;

const MODERATION_PERMS = [
  Permission.MEMORIAL_CLAIM_REVIEW,
  Permission.CONTENT_MODERATE,
  Permission.MEMORIAL_RESTORE,
];

const TABS = [
  { key: "users", label: "Пользователи", permission: Permission.USER_MANAGE },
  { key: "orgs", label: "Организации", permission: Permission.ORG_MANAGE_ANY },
  { key: "moderation", label: "Модерация", anyOf: MODERATION_PERMS },
  { key: "audit", label: "Журнал действий", permission: Permission.AUDIT_READ },
];

const ROLE_OPTIONS = [
  { value: "user", label: "Пользователь" },
  { value: "partner", label: "Партнёр" },
  { value: "partner_employee", label: "Сотрудник партнёра" },
  { value: "super_admin", label: "Суперадминистратор" },
];

const ACTION_LABELS = {
  "memorial.create": "Создание карточки",
  "memorial.update": "Изменение карточки",
  "memorial.soft_delete": "Удаление карточки",
  "memorial.restore": "Восстановление карточки",
  "memorial.transfer_ownership": "Передача владения",
  "memorial.assign_owner": "Назначение владельца",
  "memorial.claim_request": "Запрос на владение",
  "memorial.claim_review": "Рассмотрение запроса",
  "memorial.report": "Жалоба на страницу",
  "memorial.moderation_resolve": "Решение по проверке",
  "organization.create": "Создание организации",
  "organization.update": "Изменение организации",
  "organization.delete": "Удаление организации",
  "organization.invite_employee": "Приглашение сотрудника",
  "organization.subscription_update": "Изменение подписки",
  "admin.user_update": "Изменение пользователя",
};

function formatDateTime(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(value);
  }
}

function rangeLabel(page, pageSize, total) {
  if (!total) return "Нет записей";
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return `Показано ${from}–${to} из ${total}`;
}

function PaginationBar({ page, pageSize, total, onPageChange, disabled }) {
  const totalPages = Math.max(1, Math.ceil((total || 0) / pageSize));
  if (!total) return null;
  return (
    <div className="admin-pagination">
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

export default function AdminPage() {
  const { authHeaders, setMessage } = useAuth();
  const { has, hasAny } = usePermissions();
  const canReviewClaims = hasAny(
    Permission.MEMORIAL_CLAIM_REVIEW,
    Permission.CONTENT_MODERATE,
  );
  const canRestore = has(Permission.MEMORIAL_RESTORE);
  const canModerate = canReviewClaims || canRestore;
  const availableTabs = TABS.filter((t) =>
    t.anyOf ? hasAny(...t.anyOf) : has(t.permission),
  );
  const [tab, setTab] = useState(availableTabs[0]?.key || "users");

  const [statsData, setStatsData] = useState({
    users_total: null,
    orgs_active: null,
    moderation_pending: null,
    trash_total: null,
    audit_total: null,
  });

  const [users, setUsers] = useState([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotal, setUsersTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");

  const [orgs, setOrgs] = useState([]);
  const [claims, setClaims] = useState([]);
  const [claimsPage, setClaimsPage] = useState(1);
  const [claimsTotal, setClaimsTotal] = useState(0);
  const [reviewCards, setReviewCards] = useState([]);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewTotal, setReviewTotal] = useState(0);
  const [deletedCards, setDeletedCards] = useState([]);

  const [logs, setLogs] = useState([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditAction, setAuditAction] = useState("");

  const [loading, setLoading] = useState(false);

  const loadStats = async () => {
    const data = await getAdminStats(authHeaders);
    setStatsData(data || {});
  };

  const loadUsers = async (page = usersPage, searchQuery = appliedQuery) => {
    if (!has(Permission.USER_MANAGE)) return;
    const data = await listAdminUsers(authHeaders, {
      q: searchQuery || undefined,
      page,
      page_size: PAGE_SIZE,
    });
    setUsers(data.items || []);
    setUsersTotal(data.total || 0);
    setUsersPage(data.page || page);
  };

  const loadOrgs = async () => {
    if (!has(Permission.ORG_MANAGE_ANY)) return;
    const data = await listAdminOrganizations(authHeaders, true);
    setOrgs(data || []);
  };

  const loadClaims = async (page = claimsPage) => {
    if (!canReviewClaims) return;
    const data = await listAdminClaims(authHeaders, {
      status: "pending",
      page,
      page_size: PAGE_SIZE,
    });
    setClaims(data.items || []);
    setClaimsTotal(data.total || 0);
    setClaimsPage(data.page || page);
  };

  const loadReviewQueue = async (page = reviewPage) => {
    if (!canReviewClaims) return;
    const data = await listAdminReviewQueue(authHeaders, {
      page,
      page_size: PAGE_SIZE,
    });
    setReviewCards(data.items || []);
    setReviewTotal(data.total || 0);
    setReviewPage(data.page || page);
  };

  const loadTrash = async () => {
    if (!canRestore) return;
    const cards = await listMemorials(authHeaders, { includeDeleted: true });
    setDeletedCards((cards || []).filter((c) => c.deleted_at));
  };

  const loadModeration = async () => {
    await Promise.all([loadClaims(claimsPage), loadReviewQueue(reviewPage), loadTrash()]);
  };

  const loadAudit = async (page = auditPage, action = auditAction) => {
    if (!has(Permission.AUDIT_READ)) return;
    const data = await listAuditLogs(authHeaders, {
      page,
      page_size: PAGE_SIZE,
      action: action || undefined,
    });
    setLogs(data.items || []);
    setAuditTotal(data.total || 0);
    setAuditPage(data.page || page);
  };

  const withLoading = async (fn) => {
    try {
      setLoading(true);
      await fn();
    } catch {
      setMessage("Не удалось загрузить админ-панель");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    withLoading(async () => {
      await loadStats();
    }).catch(() => {});
  }, []);

  useEffect(() => {
    withLoading(async () => {
      if (tab === "users") await loadUsers(usersPage, appliedQuery);
      else if (tab === "orgs") await loadOrgs();
      else if (tab === "moderation") await loadModeration();
      else if (tab === "audit") await loadAudit(auditPage, auditAction);
    }).catch(() => {});
  }, [tab, usersPage, appliedQuery, claimsPage, reviewPage, auditPage, auditAction]);

  const stats = useMemo(
    () =>
      [
        {
          key: "users",
          label: "Пользователи",
          value: statsData.users_total,
          hint: "всего",
          visible: has(Permission.USER_MANAGE) && statsData.users_total != null,
        },
        {
          key: "orgs",
          label: "Организации",
          value: statsData.orgs_active,
          hint: "активные",
          visible: has(Permission.ORG_MANAGE_ANY) && statsData.orgs_active != null,
        },
        {
          key: "moderation",
          label: "Требуют модерации",
          value:
            statsData.moderation_pending != null
              ? statsData.moderation_pending
              : statsData.trash_total,
          hint:
            statsData.moderation_pending != null
              ? statsData.review_queue != null
                ? `заявки и проверка (${statsData.review_queue || 0})`
                : "заявки на владение"
              : "в корзине",
          visible:
            canModerate &&
            (statsData.moderation_pending != null || statsData.trash_total != null),
        },
        {
          key: "audit",
          label: "События в журнале",
          value: statsData.audit_total,
          hint: "всего",
          visible: has(Permission.AUDIT_READ) && statsData.audit_total != null,
        },
      ].filter((item) => item.visible),
    [statsData, has, canModerate],
  );

  const refreshAfterMutation = async () => {
    await loadStats();
    if (tab === "users") await loadUsers(usersPage, appliedQuery);
    else if (tab === "moderation") await loadModeration();
    else if (tab === "audit") await loadAudit(auditPage, auditAction);
  };

  const toggleActive = async (user) => {
    const nextActive = !user.is_active;
    const label = user.email || user.phone || `#${user.id}`;
    const confirmText = nextActive
      ? `Активировать аккаунт «${label}»?`
      : `Деактивировать аккаунт «${label}»? Пользователь не сможет войти.`;
    if (!window.confirm(confirmText)) return;
    try {
      await updateAdminUser(user.id, { is_active: nextActive }, authHeaders);
      setMessage(nextActive ? "Аккаунт активирован" : "Аккаунт деактивирован");
      await refreshAfterMutation();
    } catch {
      setMessage("Не удалось изменить статус пользователя");
    }
  };

  const setRolesForUser = async (user, roleCode) => {
    const label = user.email || user.phone || `#${user.id}`;
    if (
      !window.confirm(
        `Назначить роль «${ROLE_LABELS[roleCode] || roleCode}» пользователю ${label}?`,
      )
    ) {
      return;
    }
    try {
      await updateAdminUser(user.id, { roles: [roleCode] }, authHeaders);
      setMessage("Роль обновлена");
      await refreshAfterMutation();
    } catch {
      setMessage("Не удалось назначить роль");
    }
  };

  const onReviewClaim = async (claim, approve) => {
    if (
      !window.confirm(
        `${approve ? "Одобрить" : "Отклонить"} заявку на владение карточкой «${claim.memorial_name}»?`,
      )
    ) {
      return;
    }
    try {
      await reviewAdminClaim(claim.id, approve, authHeaders);
      setMessage(approve ? "Заявка одобрена, владелец изменён" : "Заявка отклонена");
      await refreshAfterMutation();
    } catch {
      setMessage(`Не удалось ${approve ? "одобрить" : "отклонить"} заявку`);
    }
  };

  const onResolveReview = async (card, approve) => {
    if (
      !window.confirm(
        approve
          ? `Вернуть карточку «${card.memorial_name}» в каталог?`
          : `Скрыть карточку «${card.memorial_name}» (архив)?`,
      )
    ) {
      return;
    }
    try {
      await resolveAdminReview(card.id, approve, authHeaders);
      setMessage(approve ? "Карточка снова опубликована" : "Карточка скрыта");
      await refreshAfterMutation();
    } catch {
      setMessage("Не удалось обработать карточку");
    }
  };

  const onRestore = async (card) => {
    if (
      !window.confirm(`Восстановить карточку «${card.last_name} ${card.first_name}»?`)
    ) {
      return;
    }
    try {
      await restoreMemorial(card.id, authHeaders);
      setMessage("Карточка восстановлена");
      await refreshAfterMutation();
    } catch {
      setMessage("Не удалось восстановить карточку");
    }
  };

  const onSearchSubmit = (e) => {
    e.preventDefault();
    setUsersPage(1);
    setAppliedQuery(query.trim());
  };

  return (
    <div className="page-shell">
      <PageHero
        title="Админ-панель"
        subtitle="Панель управления системой: пользователи, организации, модерация и аудит действий."
      />

      <section className="content-section admin-panel">
        {stats.length > 0 && (
          <div className="admin-stats" aria-label="Сводка" role="tablist">
            {stats.map((item) => (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={tab === item.key}
                className={`admin-stat${tab === item.key ? " is-active" : ""}`}
                onClick={() => setTab(item.key)}
              >
                <span className="admin-stat-label">{item.label}</span>
                <span className="admin-stat-value">{item.value}</span>
                <span className="admin-stat-hint">{item.hint}</span>
              </button>
            ))}
          </div>
        )}

        {tab === "users" && has(Permission.USER_MANAGE) && (
          <div className="admin-block">
            <div className="admin-section-head">
              <h2>Пользователи</h2>
              {loading && <span className="admin-loading">Обновляем…</span>}
            </div>
            <form className="admin-search" onSubmit={onSearchSubmit}>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Поиск по email или телефону"
                aria-label="Поиск пользователей"
              />
              <button type="submit" className="btn btn-primary btn-sm">
                Найти
              </button>
            </form>

            {users.length === 0 ? (
              <p className="admin-empty">Пользователи не найдены.</p>
            ) : (
              <>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Контакт</th>
                        <th>Роль</th>
                        <th>Статус</th>
                        <th>Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id} className={!u.is_active ? "is-inactive" : undefined}>
                          <td>#{u.id}</td>
                          <td>
                            <strong>{u.email || u.phone || "—"}</strong>
                          </td>
                          <td>
                            {(u.roles || [])
                              .map((r) => ROLE_LABELS[r] || r)
                              .join(", ") || "—"}
                          </td>
                          <td>
                            <span
                              className={`admin-status${u.is_active ? " is-on" : " is-off"}`}
                            >
                              {u.is_active ? "Активен" : "Отключён"}
                            </span>
                          </td>
                          <td>
                            <div className="admin-row-actions">
                              {has(Permission.ROLE_MANAGE) && (
                                <select
                                  className="admin-role-select"
                                  value={(u.roles && u.roles[0]) || "user"}
                                  onChange={(e) => setRolesForUser(u, e.target.value)}
                                  aria-label={`Роль для ${u.email || u.phone || u.id}`}
                                >
                                  {ROLE_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                              )}
                              <button
                                type="button"
                                className={
                                  u.is_active
                                    ? "btn btn-sm admin-btn-danger"
                                    : "btn btn-sm btn-outline"
                                }
                                onClick={() => toggleActive(u)}
                              >
                                {u.is_active ? "Деактивировать" : "Активировать"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <PaginationBar
                  page={usersPage}
                  pageSize={PAGE_SIZE}
                  total={usersTotal}
                  disabled={loading}
                  onPageChange={setUsersPage}
                />
              </>
            )}
          </div>
        )}

        {tab === "orgs" && has(Permission.ORG_MANAGE_ANY) && (
          <div className="admin-block">
            <div className="admin-section-head">
              <h2>Организации</h2>
              {loading && <span className="admin-loading">Обновляем…</span>}
            </div>
            {orgs.length === 0 ? (
              <p className="admin-empty">Организаций пока нет.</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Название</th>
                      <th>Тариф</th>
                      <th>Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orgs.map((o) => (
                      <tr key={o.id} className={o.deleted_at ? "is-inactive" : undefined}>
                        <td>#{o.id}</td>
                        <td>
                          <strong>{o.name}</strong>
                        </td>
                        <td>{o.subscription_plan}</td>
                        <td>
                          {o.deleted_at
                            ? "Удалена"
                            : o.subscription_status === "active"
                              ? "Активна"
                              : o.subscription_status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === "moderation" && canModerate && (
          <div className="admin-block">
            <div className="admin-section-head">
              <h2>Модерация</h2>
              {loading && <span className="admin-loading">Обновляем…</span>}
            </div>

            {canReviewClaims && (
              <>
                <h3 className="admin-subhead">Требуют проверки</h3>
                <p className="admin-lead">
                  Страницы, набравшие много жалоб. Пока они скрыты из публичного каталога.
                </p>
                {reviewCards.length === 0 ? (
                  <p className="admin-empty">Очередь проверки пуста.</p>
                ) : (
                  <>
                    <div className="admin-table-wrap">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Карточка</th>
                            <th>Тип</th>
                            <th>Жалоб</th>
                            <th>Действия</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reviewCards.map((card) => (
                            <tr key={card.id}>
                              <td>
                                <strong>{card.memorial_name}</strong>
                                <div className="admin-cell-meta">#{card.id}</div>
                              </td>
                              <td>{card.page_kind === "extended" ? "Полная" : "Базовая"}</td>
                              <td>{card.report_count}</td>
                              <td>
                                <div className="admin-row-actions">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-primary"
                                    onClick={() => onResolveReview(card, true)}
                                  >
                                    Вернуть в каталог
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-sm admin-btn-danger"
                                    onClick={() => onResolveReview(card, false)}
                                  >
                                    Скрыть
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <PaginationBar
                      page={reviewPage}
                      pageSize={PAGE_SIZE}
                      total={reviewTotal}
                      disabled={loading}
                      onPageChange={setReviewPage}
                    />
                  </>
                )}

                <h3 className="admin-subhead">Заявки на владение</h3>
                <p className="admin-lead">
                  Пользователь просит передать ему страницу памяти. Одобрение меняет
                  владельца карточки.
                </p>
                {claims.length === 0 ? (
                  <p className="admin-empty">Новых заявок нет.</p>
                ) : (
                  <>
                    <div className="admin-table-wrap">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Карточка</th>
                            <th>Заявитель</th>
                            <th>Сообщение</th>
                            <th>Дата</th>
                            <th>Действия</th>
                          </tr>
                        </thead>
                        <tbody>
                          {claims.map((claim) => (
                            <tr key={claim.id}>
                              <td>
                                <strong>{claim.memorial_name}</strong>
                                <div className="admin-cell-meta">#{claim.memorial_id}</div>
                              </td>
                              <td>
                                {claim.requester_contact || `пользователь #${claim.requester_id}`}
                                <div className="admin-cell-meta">#{claim.requester_id}</div>
                              </td>
                              <td>{claim.message || "—"}</td>
                              <td>{formatDateTime(claim.created_at)}</td>
                              <td>
                                <div className="admin-row-actions">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-primary"
                                    onClick={() => onReviewClaim(claim, true)}
                                  >
                                    Одобрить
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-sm admin-btn-danger"
                                    onClick={() => onReviewClaim(claim, false)}
                                  >
                                    Отклонить
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <PaginationBar
                      page={claimsPage}
                      pageSize={PAGE_SIZE}
                      total={claimsTotal}
                      disabled={loading}
                      onPageChange={setClaimsPage}
                    />
                  </>
                )}
              </>
            )}

            {canRestore && (
              <>
                <h3 className="admin-subhead">Корзина</h3>
                <p className="admin-lead">
                  Мягко удалённые карточки. Их можно вернуть в доступ.
                </p>
                {deletedCards.length === 0 ? (
                  <p className="admin-empty">Корзина пуста.</p>
                ) : (
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>ФИО</th>
                          <th>Удалена</th>
                          <th>Действие</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deletedCards.map((c) => (
                          <tr key={c.id}>
                            <td>#{c.id}</td>
                            <td>
                              <strong>
                                {c.last_name} {c.first_name}
                              </strong>
                            </td>
                            <td>{formatDateTime(c.deleted_at)}</td>
                            <td>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline"
                                onClick={() => onRestore(c)}
                              >
                                Восстановить
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {tab === "audit" && has(Permission.AUDIT_READ) && (
          <div className="admin-block">
            <div className="admin-section-head">
              <h2>Журнал действий</h2>
              {loading && <span className="admin-loading">Обновляем…</span>}
            </div>
            <p className="admin-lead">
              Фиксируются изменения карточек, организаций и учётных записей: кто, что и когда
              сделал.
            </p>
            <div className="admin-filters">
              <label className="admin-filter">
                <span>Тип действия</span>
                <select
                  value={auditAction}
                  onChange={(e) => {
                    setAuditPage(1);
                    setAuditAction(e.target.value);
                  }}
                  aria-label="Фильтр по типу действия"
                >
                  <option value="">Все действия</option>
                  {Object.entries(ACTION_LABELS).map(([code, label]) => (
                    <option key={code} value={code}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {logs.length === 0 ? (
              <p className="admin-empty">Записей пока нет.</p>
            ) : (
              <>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Время</th>
                        <th>Действие</th>
                        <th>Объект</th>
                        <th>Пользователь</th>
                        <th>IP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log) => (
                        <tr key={log.id}>
                          <td>{formatDateTime(log.created_at)}</td>
                          <td>{ACTION_LABELS[log.action] || log.action}</td>
                          <td>
                            {log.entity_type}
                            {log.entity_id ? ` #${log.entity_id}` : ""}
                          </td>
                          <td>#{log.user_id || "—"}</td>
                          <td>{log.ip_address || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <PaginationBar
                  page={auditPage}
                  pageSize={PAGE_SIZE}
                  total={auditTotal}
                  disabled={loading}
                  onPageChange={setAuditPage}
                />
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
