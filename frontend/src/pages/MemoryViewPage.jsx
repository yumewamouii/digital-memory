import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageHero from "../components/PageHero";
import { useAuth } from "../context/AuthContext";
import { usePermissions } from "../auth/usePermissions";
import { Permission } from "../auth/permissions";
import { createOwnershipClaim, getMemorial } from "../api/memorials";

export default function MemoryViewPage() {
  const { cardId } = useParams();
  const { authHeaders, token, openAuthModal, setMessage, user } = useAuth();
  const { has } = usePermissions();
  const [card, setCard] = useState(null);
  const [claimMessage, setClaimMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    getMemorial(cardId, authHeaders)
      .then(setCard)
      .catch(() => setError("Карточка не найдена или недоступна"));
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

  return (
    <div className="page-shell">
      <PageHero title={fullName} subtitle={card.biography || ""} />
      <section className="content-section">
        <p>
          {card.birth_date || "—"} — {card.death_date || "—"}
        </p>
        {(card.cemetery_name || card.cemetery_location) && (
          <p>
            {card.cemetery_name}
            {card.cemetery_location ? `, ${card.cemetery_location}` : ""}
          </p>
        )}
        {card.can_edit && (
          <p>
            <Link to="/cabinet">Управление в кабинете</Link>
          </p>
        )}

        {has(Permission.MEMORIAL_CLAIM_REQUEST) &&
          user &&
          user.id !== card.owner_id &&
          !card.deleted_at && (
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
          )}
      </section>
    </div>
  );
}
