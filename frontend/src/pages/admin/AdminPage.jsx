import { useEffect, useMemo, useState } from "react";
import PageHero from "../../components/PageHero";
import { useAuth } from "../../context/AuthContext";
import { usePermissions } from "../../auth/usePermissions";
import { Permission } from "../../auth/permissions";
import { ROLE_LABELS } from "../../auth/roles";
import {
  listAdminOrganizations,
  listAdminRoles,
  listAdminUsers,
  listAuditLogs,
  updateAdminUser,
} from "../../api/admin";
import { listMemorials, restoreMemorial } from "../../api/memorials";

const TABS = [
  { key: "users", label: "Пользователи", permission: Permission.USER_MANAGE },
  { key: "orgs", label: "Организации", permission: Permission.ORG_MANAGE_ANY },
  { key: "roles", label: "Роли", permission: Permission.ROLE_MANAGE },
  { key: "moderation", label: "Модерация", permission: Permission.MEMORIAL_RESTORE },
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

export default function AdminPage() {
  const { authHeaders, setMessage } = useAuth();
  const { has } = usePermissions();
  const availableTabs = TABS.filter((t) => has(t.permission));
  const [tab, setTab] = useState(availableTabs[0]?.key || "users");
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [logs, setLogs] = useState([]);
  const [deletedCards, setDeletedCards] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async (searchQuery = query) => {
    try {
      setLoading(true);
      const tasks = [];
      if (has(Permission.USER_MANAGE)) {
        tasks.push(listAdminUsers(authHeaders, searchQuery).then(setUsers));
      }
      if (has(Permission.ROLE_MANAGE)) {
        tasks.push(listAdminRoles(authHeaders).then(setRoles));
      }
      if (has(Permission.ORG_MANAGE_ANY)) {
        tasks.push(listAdminOrganizations(authHeaders, true).then(setOrgs));
      }
      if (has(Permission.AUDIT_READ)) {
        tasks.push(listAuditLogs(authHeaders, { limit: 50 }).then(setLogs));
      }
      if (has(Permission.MEMORIAL_RESTORE)) {
        tasks.push(
          listMemorials(authHeaders, { includeDeleted: true }).then((cards) =>
            setDeletedCards(cards.filter((c) => c.deleted_at)),
          ),
        );
      }
      await Promise.all(tasks);
    } catch {
      setMessage("Не удалось загрузить админ-панель");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const stats = useMemo(
    () => [
      {
        key: "users",
        label: "Пользователи",
        value: users.length,
        hint: "в выборке",
        visible: has(Permission.USER_MANAGE),
      },
      {
        key: "orgs",
        label: "Организации",
        value: orgs.filter((o) => !o.deleted_at).length,
        hint: "активные",
        visible: has(Permission.ORG_MANAGE_ANY),
      },
      {
        key: "moderation",
        label: "На модерации",
        value: deletedCards.length,
        hint: "удалённые карточки",
        visible: has(Permission.MEMORIAL_RESTORE),
      },
      {
        key: "audit",
        label: "События в журнале",
        value: logs.length,
        hint: "последние записи",
        visible: has(Permission.AUDIT_READ),
      },
    ].filter((item) => item.visible),
    [users, orgs, deletedCards, logs, has],
  );

  const recentLogs = logs.slice(0, 5);

  const toggleActive = async (user) => {
    const nextActive = !user.is_active;
    const confirmText = nextActive
      ? `Активировать аккаунт «${user.full_name}»?`
      : `Деактивировать аккаунт «${user.full_name}»? Пользователь не сможет войти.`;
    if (!window.confirm(confirmText)) return;
    try {
      await updateAdminUser(user.id, { is_active: nextActive }, authHeaders);
      setMessage(nextActive ? "Аккаунт активирован" : "Аккаунт деактивирован");
      await load();
    } catch {
      setMessage("Не удалось изменить статус пользователя");
    }
  };

  const setRolesForUser = async (user, roleCode) => {
    if (!window.confirm(`Назначить роль «${ROLE_LABELS[roleCode] || roleCode}» пользователю ${user.full_name}?`)) {
      return;
    }
    try {
      await updateAdminUser(user.id, { roles: [roleCode] }, authHeaders);
      setMessage("Роль обновлена");
      await load();
    } catch {
      setMessage("Не удалось назначить роль");
    }
  };

  const onRestore = async (card) => {
    if (
      !window.confirm(
        `Восстановить карточку «${card.last_name} ${card.first_name}»?`,
      )
    ) {
      return;
    }
    try {
      await restoreMemorial(card.id, authHeaders);
      setMessage("Карточка восстановлена");
      await load();
    } catch {
      setMessage("Не удалось восстановить карточку");
    }
  };

  return (
    <div className="page-shell">
      <PageHero
        title="Админ-панель"
        subtitle="Управление пользователями, организациями, ролями доступа, модерацией материалов и журналом действий."
      />

      <section className="content-section admin-panel">
        {stats.length > 0 && (
          <div className="admin-stats" aria-label="Сводка">
            {stats.map((item) => (
              <button
                key={item.key}
                type="button"
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

        {has(Permission.AUDIT_READ) && recentLogs.length > 0 && (
          <div className="admin-recent">
            <div className="admin-section-head">
              <h2>Последние действия</h2>
              <button type="button" className="link-btn" onClick={() => setTab("audit")}>
                Весь журнал
              </button>
            </div>
            <ul className="admin-recent-list">
              {recentLogs.map((log) => (
                <li key={log.id}>
                  <span className="admin-recent-time">{formatDateTime(log.created_at)}</span>
                  <span className="admin-recent-action">
                    {ACTION_LABELS[log.action] || log.action}
                  </span>
                  <span className="admin-recent-meta">
                    пользователь #{log.user_id || "—"} · {log.entity_type}
                    {log.entity_id ? ` #${log.entity_id}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="admin-tabs" role="tablist" aria-label="Разделы админ-панели">
          {availableTabs.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={tab === item.key}
              className={`admin-tab${tab === item.key ? " is-active" : ""}`}
              onClick={() => setTab(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === "users" && has(Permission.USER_MANAGE) && (
          <div className="admin-block">
            <div className="admin-section-head">
              <h2>Пользователи</h2>
              {loading && <span className="admin-loading">Обновляем…</span>}
            </div>
            <form
              className="admin-search"
              onSubmit={(e) => {
                e.preventDefault();
                load(query);
              }}
            >
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Поиск по email, телефону или ФИО"
                aria-label="Поиск пользователей"
              />
              <button type="submit" className="btn btn-primary btn-sm">
                Найти
              </button>
            </form>

            {users.length === 0 ? (
              <p className="admin-empty">Пользователи не найдены.</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Пользователь</th>
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
                          <strong>{u.full_name}</strong>
                        </td>
                        <td>{u.email || u.phone || "—"}</td>
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
                                aria-label={`Роль для ${u.full_name}`}
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
            )}
          </div>
        )}

        {tab === "orgs" && has(Permission.ORG_MANAGE_ANY) && (
          <div className="admin-block">
            <div className="admin-section-head">
              <h2>Организации</h2>
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

        {tab === "roles" && has(Permission.ROLE_MANAGE) && (
          <div className="admin-block">
            <div className="admin-section-head">
              <h2>Роли и права доступа</h2>
            </div>
            <p className="admin-lead">
              Системные роли задают набор разрешений. Новые роли можно добавлять через матрицу
              прав на сервере без правок интерфейса.
            </p>
            <div className="admin-role-grid">
              {roles.map((role) => (
                <article key={role.id} className="admin-role-card">
                  <h3>{role.name}</h3>
                  <p className="admin-role-code">{role.code}</p>
                  <p>{role.description || "Без описания"}</p>
                  <p className="admin-role-perms">
                    {(role.permissions || []).length} разрешений
                  </p>
                </article>
              ))}
            </div>
          </div>
        )}

        {tab === "moderation" && has(Permission.MEMORIAL_RESTORE) && (
          <div className="admin-block">
            <div className="admin-section-head">
              <h2>Модерация</h2>
            </div>
            <p className="admin-lead">
              Здесь отображаются мягко удалённые мемориальные карточки. Их можно вернуть в
              общий доступ.
            </p>
            {deletedCards.length === 0 ? (
              <p className="admin-empty">Сейчас нет карточек, ожидающих восстановления.</p>
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
          </div>
        )}

        {tab === "audit" && has(Permission.AUDIT_READ) && (
          <div className="admin-block">
            <div className="admin-section-head">
              <h2>Журнал действий</h2>
            </div>
            <p className="admin-lead">
              Фиксируются изменения карточек, организаций и учётных записей: кто, что и когда
              сделал.
            </p>
            {logs.length === 0 ? (
              <p className="admin-empty">Записей пока нет.</p>
            ) : (
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
            )}
          </div>
        )}
      </section>
    </div>
  );
}
