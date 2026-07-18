import { useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { API } from "../api";
import PageHero from "../components/PageHero";
import { useAuth } from "../context/AuthContext";

export default function CreateTreePage() {
  const { token, authHeaders, openAuthModal, setMessage } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [treeForm, setTreeForm] = useState({
    title: "Семейное древо",
    tree_json: '{"nodes":[],"edges":[]}',
  });

  const createTree = async () => {
    try {
      setIsSubmitting(true);
      await axios.post(`${API}/family-trees`, treeForm, { headers: authHeaders });
      setMessage("Древо создано");
    } catch {
      setMessage("Не удалось создать древо. Попробуйте еще раз.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PageHero
        title="Создание генеалогического древа"
        subtitle="Задайте название и базовую структуру — позже её можно расширить."
      />

      <section className="section">
        <div className="section-inner narrow">
          {!token ? (
            <div className="notice-card">
              <p>Для создания древа необходимо войти в аккаунт.</p>
              <button type="button" className="btn btn-primary" onClick={() => openAuthModal(false)}>
                Войти
              </button>
            </div>
          ) : (
            <>
              <div className="form-grid">
                <input
                  placeholder="Название"
                  value={treeForm.title}
                  onChange={(e) => setTreeForm({ ...treeForm, title: e.target.value })}
                />
                <textarea
                  rows={8}
                  value={treeForm.tree_json}
                  onChange={(e) => setTreeForm({ ...treeForm, tree_json: e.target.value })}
                />
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={createTree}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Сохраняем..." : "Создать древо"}
              </button>
              <p className="hint-text">
                <Link to="/cabinet" className="text-link">
                  Открыть личный кабинет
                </Link>
              </p>
            </>
          )}
        </div>
      </section>
    </>
  );
}
