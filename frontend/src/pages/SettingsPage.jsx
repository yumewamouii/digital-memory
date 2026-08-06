import ChangePasswordPanel from "../components/ChangePasswordPanel";
import PageHero from "../components/PageHero";
import { useAuth } from "../context/AuthContext";

export default function SettingsPage() {
  const { token, user, openAuthModal } = useAuth();

  if (!token) {
    return (
      <div className="page-shell">
        <PageHero title="Настройки" subtitle="Войдите, чтобы управлять профилем." />
        <section className="content-section">
          <div className="notice-card form-panel" style={{ margin: "0 auto" }}>
            <p className="lead">Нужен вход в аккаунт.</p>
            <div className="hero-actions">
              <button type="button" className="btn btn-primary" onClick={() => openAuthModal(false)}>
                Войти
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <PageHero
        title="Настройки"
        subtitle="Данные профиля и смена пароля."
      />

      <section className="content-section settings-page">
        <div className="settings-profile">
          <h2 className="cabinet-section-title">Профиль</h2>
          <dl className="settings-dl">
            <div>
              <dt>Электронная почта</dt>
              <dd>{user?.email || "Не указана"}</dd>
            </div>
            <div>
              <dt>Телефон</dt>
              <dd>{user?.phone || "Не указан"}</dd>
            </div>
          </dl>
        </div>

        <ChangePasswordPanel />
      </section>
    </div>
  );
}
