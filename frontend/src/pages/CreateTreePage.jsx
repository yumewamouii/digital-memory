import { useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { API } from "../api";
import PageHero from "../components/PageHero";
import { useAuth } from "../context/AuthContext";

export default function CreateTreePage() {
  const { token, authHeaders, openAuthModal, setMessage } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [treeForm, setTreeForm] = useState({
    title: "Семейное древо",
    tree_json: '{"nodes":[],"edges":[]}',
  });

  const createTree = async () => {
    try {
      setIsSubmitting(true);
      await axios.post(`${API}/family-trees`, treeForm, { headers: authHeaders });
      setSaved(true);
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
        subtitle="Задайте название и базовую структуру — позже её можно расширить в личном кабинете."
      />

      <section className="section">
        <div className="section-inner narrow">
          {!token ? (
            <div className="notice-card form-panel" style={{ margin: "0 auto" }}>
              <h2>Нужен вход в аккаунт</h2>
              <p className="lead">Для создания древа необходимо войти или зарегистрироваться.</p>
              <div className="hero-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => openAuthModal(false)}
                >
                  Войти
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => openAuthModal(true)}
                >
                  Регистрация
                </button>
              </div>
            </div>
          ) : (
            <div className="form-panel wide">
              <h2 style={{ marginTop: 0 }}>Параметры древа</h2>
              <div className="form-grid">
                <div>
                  <label className="form-label" htmlFor="tree-title">
                    Название
                  </label>
                  <input
                    id="tree-title"
                    placeholder="Название"
                    value={treeForm.title}
                    onChange={(e) => setTreeForm({ ...treeForm, title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label" htmlFor="tree-json">
                    Структура (JSON)
                  </label>
                  <textarea
                    id="tree-json"
                    rows={8}
                    value={treeForm.tree_json}
                    onChange={(e) => setTreeForm({ ...treeForm, tree_json: e.target.value })}
                  />
                </div>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={createTree}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Сохраняем..." : "Создать древо"}
              </button>
              {saved ? (
                <p className="success-text" style={{ marginTop: "1rem" }}>
                  Древо сохранено.{" "}
                  <Link to="/cabinet" className="text-link">
                    Открыть личный кабинет
                  </Link>
                </p>
              ) : (
                <p className="hint-text" style={{ marginTop: "1rem" }}>
                  <Link to="/cabinet" className="text-link">
                    Открыть личный кабинет
                  </Link>
                </p>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
