import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHero from "../../components/PageHero";
import { useAuth } from "../../context/AuthContext";
import { usePermissions } from "../../auth/usePermissions";
import { Permission } from "../../auth/permissions";
import {
  createOrganization,
  getOrgStats,
  inviteMember,
  listMembers,
  listOrganizations,
  updateSubscription,
} from "../../api/organizations";
import { createMemorial, listMemorials } from "../../api/memorials";

export default function PartnerCabinetPage() {
  const { authHeaders, loadMe, setMessage, user } = useAuth();
  const { has, organization } = usePermissions();
  const [orgs, setOrgs] = useState([]);
  const [activeOrg, setActiveOrg] = useState(null);
  const [members, setMembers] = useState([]);
  const [stats, setStats] = useState(null);
  const [cards, setCards] = useState([]);
  const [orgName, setOrgName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [plan, setPlan] = useState("basic");
  const [newCard, setNewCard] = useState({ first_name: "", last_name: "" });
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    try {
      const list = await listOrganizations(authHeaders);
      setOrgs(list);
      const current =
        list.find((o) => o.id === organization?.id) || list[0] || null;
      setActiveOrg(current);
      if (current) {
        const [m, s, c] = await Promise.all([
          listMembers(current.id, authHeaders),
          getOrgStats(current.id, authHeaders),
          listMemorials(authHeaders),
        ]);
        setMembers(m);
        setStats(s);
        setCards(c.filter((card) => card.organization_id === current.id));
        setPlan(current.subscription_plan || "basic");
      }
    } catch {
      setMessage("Не удалось загрузить кабинет партнёра");
    }
  };

  useEffect(() => {
    refresh().catch(() => {});
  }, [user?.id]);

  const onCreateOrg = async (e) => {
    e.preventDefault();
    if (!orgName.trim()) return;
    try {
      setBusy(true);
      await createOrganization({ name: orgName.trim() }, authHeaders);
      setOrgName("");
      await loadMe();
      setMessage("Организация создана");
      await refresh();
    } catch {
      setMessage("Не удалось создать организацию");
    } finally {
      setBusy(false);
    }
  };

  const onInvite = async (e) => {
    e.preventDefault();
    if (!activeOrg || !inviteEmail.trim()) return;
    try {
      setBusy(true);
      await inviteMember(activeOrg.id, inviteEmail.trim(), authHeaders);
      setInviteEmail("");
      setMessage("Сотрудник приглашён");
      await refresh();
    } catch {
      setMessage("Не удалось пригласить сотрудника");
    } finally {
      setBusy(false);
    }
  };

  const onSubscription = async (e) => {
    e.preventDefault();
    if (!activeOrg) return;
    try {
      setBusy(true);
      await updateSubscription(
        activeOrg.id,
        { subscription_plan: plan, subscription_status: "active" },
        authHeaders,
      );
      setMessage("Подписка обновлена");
      await refresh();
    } catch {
      setMessage("Не удалось обновить подписку");
    } finally {
      setBusy(false);
    }
  };

  const onCreateCard = async (e) => {
    e.preventDefault();
    if (!activeOrg || !newCard.first_name.trim() || !newCard.last_name.trim()) return;
    try {
      setBusy(true);
      await createMemorial(
        {
          ...newCard,
          organization_id: activeOrg.id,
          visibility: "private",
        },
        authHeaders,
      );
      setNewCard({ first_name: "", last_name: "" });
      setMessage("Мемориальная карточка создана");
      await refresh();
    } catch {
      setMessage("Не удалось создать карточку");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-shell">
      <PageHero
        title="Кабинет партнёра"
        subtitle="Управление мемориальными карточками клиентов, сотрудниками и подпиской."
      />

      <section className="content-section">
        {!activeOrg && has(Permission.ORG_CREATE) && (
          <form className="stack-form" onSubmit={onCreateOrg}>
            <h2>Создать организацию</h2>
            <input
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Название компании / администрации кладбища"
              required
            />
            <button type="submit" className="btn-primary" disabled={busy}>
              Создать
            </button>
          </form>
        )}

        {activeOrg && (
          <>
            <div className="cabinet-block">
              <h2>{activeOrg.name}</h2>
              <p>
                Подписка: {activeOrg.subscription_plan} / {activeOrg.subscription_status}
              </p>
              {stats && (
                <ul>
                  <li>Карточек: {stats.memorial_count}</li>
                  <li>Опубликовано: {stats.published_count}</li>
                  <li>Сотрудников: {stats.employee_count}</li>
                </ul>
              )}
            </div>

            <div className="cabinet-block">
              <h3>Создать карточку клиента</h3>
              <form className="stack-form" onSubmit={onCreateCard}>
                <input
                  placeholder="Имя"
                  value={newCard.first_name}
                  onChange={(e) => setNewCard({ ...newCard, first_name: e.target.value })}
                  required
                />
                <input
                  placeholder="Фамилия"
                  value={newCard.last_name}
                  onChange={(e) => setNewCard({ ...newCard, last_name: e.target.value })}
                  required
                />
                <button type="submit" className="btn-primary" disabled={busy}>
                  Создать карточку
                </button>
              </form>
            </div>

            <div className="cabinet-block">
              <h3>Карточки организации</h3>
              {cards.length === 0 ? (
                <p>Пока нет карточек.</p>
              ) : (
                <ul className="cabinet-list">
                  {cards.map((card) => (
                    <li key={card.id}>
                      <Link to={`/memory/${card.id}`}>
                        {card.last_name} {card.first_name}
                      </Link>
                      <span> · владелец #{card.owner_id}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {has(Permission.ORG_INVITE_EMPLOYEE) && (
              <div className="cabinet-block">
                <h3>Сотрудники</h3>
                <form className="stack-form" onSubmit={onInvite}>
                  <input
                    type="email"
                    placeholder="Email сотрудника (уже зарегистрирован)"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />
                  <button type="submit" className="btn-primary" disabled={busy}>
                    Пригласить
                  </button>
                </form>
                <ul className="cabinet-list">
                  {members.map((m) => (
                    <li key={m.id}>
                      {m.full_name || m.email} — {m.member_role} ({m.status})
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {has(Permission.ORG_MANAGE_SUBSCRIPTION) && (
              <div className="cabinet-block">
                <h3>Подписка</h3>
                <form className="stack-form" onSubmit={onSubscription}>
                  <select value={plan} onChange={(e) => setPlan(e.target.value)}>
                    <option value="free">free</option>
                    <option value="basic">basic</option>
                    <option value="pro">pro</option>
                    <option value="enterprise">enterprise</option>
                  </select>
                  <button type="submit" className="btn-primary" disabled={busy}>
                    Сохранить план
                  </button>
                </form>
              </div>
            )}
          </>
        )}

        {orgs.length === 0 && !has(Permission.ORG_CREATE) && (
          <p>Нет доступных организаций. Обратитесь к владельцу партнёрского кабинета.</p>
        )}
      </section>
    </div>
  );
}
