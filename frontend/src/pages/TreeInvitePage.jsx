import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PageHero from "../components/PageHero";
import { acceptInvite } from "../api/trees";
import { useAuth } from "../context/AuthContext";
import { formatApiError } from "../utils/apiErrors";

export default function TreeInvitePage() {
  const { inviteToken } = useParams();
  const { token, authHeaders, openAuthModal, setMessage } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const run = async () => {
      try {
        setStatus("loading");
        const data = await acceptInvite(inviteToken, authHeaders);
        if (cancelled) return;
        setMessage("Приглашение принято");
        navigate(`/family-tree/${data.tree_id}/edit`);
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setMessage(
            formatApiError(err?.response?.data?.detail, "Не удалось принять приглашение"),
          );
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [token, inviteToken, authHeaders, navigate, setMessage]);

  return (
    <>
      <PageHero title="Приглашение в древо" subtitle="Войдите, чтобы принять доступ к редактированию." />
      <section className="section">
        <div className="section-inner">
          {!token ? (
            <div className="notice-card form-panel" style={{ margin: "0 auto" }}>
              <p className="lead">Для принятия приглашения нужен вход в аккаунт.</p>
              <button type="button" className="btn btn-primary" onClick={() => openAuthModal(false)}>
                Войти
              </button>
            </div>
          ) : status === "error" ? (
            <div className="notice-card">
              <p>Не удалось принять приглашение.</p>
              <Link to="/cabinet" className="btn btn-outline">
                В кабинет
              </Link>
            </div>
          ) : (
            <p className="hint-text">Принимаем приглашение…</p>
          )}
        </div>
      </section>
    </>
  );
}
