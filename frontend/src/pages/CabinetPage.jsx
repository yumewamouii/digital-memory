import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { API } from "../api";
import PageHero from "../components/PageHero";
import { useAuth } from "../context/AuthContext";

export default function CabinetPage() {
  const { token, authHeaders, openAuthModal, setMessage } = useAuth();
  const [cards, setCards] = useState([]);
  const [trees, setTrees] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [qrLoadingId, setQrLoadingId] = useState(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [cardsRes, treesRes] = await Promise.all([
        axios.get(`${API}/memorial-cards`, { headers: authHeaders }),
        axios.get(`${API}/family-trees`, { headers: authHeaders }),
      ]);
      setCards(cardsRes.data);
      setTrees(treesRes.data);
    } catch {
      setMessage("Не удалось загрузить данные кабинета");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadData().catch(() => {});
    }
  }, [token]);

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

  return (
    <>
      <PageHero
        title="Личный кабинет"
        subtitle="Ваши карточки памяти и генеалогические древа."
      />

      <section className="section">
        <div className="section-inner">
          {!token ? (
            <div className="notice-card">
              <p>Войдите, чтобы увидеть сохранённые материалы.</p>
              <button type="button" className="btn btn-primary" onClick={() => openAuthModal(false)}>
                Войти
              </button>
            </div>
          ) : (
            <>
              <div className="cabinet-actions">
                <Link to="/memory/create" className="btn btn-secondary">
                  Новая карточка
                </Link>
                <Link to="/family-tree/create" className="btn btn-secondary">
                  Новое древо
                </Link>
                <button type="button" className="btn btn-ghost" onClick={loadData} disabled={isLoading}>
                  {isLoading ? "Обновляем..." : "Обновить"}
                </button>
              </div>

              <h2>Карточки памяти</h2>
              <div className="cards">
                {cards.length === 0 ? (
                  <p className="empty-text">Пока нет карточек.</p>
                ) : (
                  cards.map((card) => (
                    <article key={card.id} className="card">
                      <h3>
                        {card.last_name} {card.first_name}
                      </h3>
                      <p>{card.biography || "Биография пока не заполнена"}</p>
                      <button
                        type="button"
                        className="text-link"
                        onClick={() => openQr(card.id)}
                        disabled={qrLoadingId === card.id}
                      >
                        {qrLoadingId === card.id ? "Открываем..." : "Открыть QR-код"}
                      </button>
                    </article>
                  ))
                )}
              </div>

              <h2>Генеалогические древа</h2>
              <div className="cards">
                {trees.length === 0 ? (
                  <p className="empty-text">Пока нет древ.</p>
                ) : (
                  trees.map((tree) => (
                    <article key={tree.id} className="card">
                      <h3>{tree.title}</h3>
                      <p>{tree.description || "Описание не добавлено"}</p>
                    </article>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
