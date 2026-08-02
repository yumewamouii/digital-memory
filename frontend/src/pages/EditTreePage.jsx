import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import TreeEditor from "../components/tree/TreeEditor";
import PageHero from "../components/PageHero";
import { getTree } from "../api/trees";
import { useAuth } from "../context/AuthContext";

export default function EditTreePage() {
  const { treeId } = useParams();
  const navigate = useNavigate();
  const { token, authHeaders, openAuthModal, setMessage } = useAuth();
  const [tree, setTree] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setIsLoading(true);
        setError("");
        const data = await getTree(treeId, token ? authHeaders : {});
        if (!cancelled) setTree(data);
      } catch {
        if (!cancelled) {
          setError("Не удалось загрузить древо");
          setMessage("Не удалось загрузить древо");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [treeId, token, authHeaders, setMessage]);

  return (
    <>
      <PageHero
        className="page-hero--compact"
        title={tree?.title || "Редактирование древа"}
        subtitle="Нажмите на человека, чтобы открыть карточку и добавить родственников."
      />
      <section className="section section--tree">
        <div className="section-inner tree-editor-page tree-editor-page--wide">
          {isLoading ? (
            <p className="hint-text">Загружаем древо…</p>
          ) : error || !tree ? (
            <div className="notice-card">
              <p>{error || "Древо не найдено"}</p>
              <div className="hero-actions">
                <button type="button" className="btn btn-outline" onClick={() => navigate("/cabinet")}>
                  В кабинет
                </button>
                {!token ? (
                  <button type="button" className="btn btn-primary" onClick={() => openAuthModal(false)}>
                    Войти
                  </button>
                ) : (
                  <Link to="/family-tree/create" className="btn btn-primary">
                    Создать новое
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <>
              <TreeEditor
                key={tree.id}
                tree={tree}
                authHeaders={token ? authHeaders : {}}
                onTreeChange={setTree}
                onDeleted={() => {
                  setMessage("Древо удалено");
                  navigate("/cabinet");
                }}
              />
              <p className="hint-text tree-page-footer-links">
                {tree.share_slug ? (
                  <>
                    <Link to={`/family-tree/s/${tree.share_slug}`} className="text-link">
                      Открыть по ссылке
                    </Link>
                    {" · "}
                  </>
                ) : null}
                <Link to="/cabinet" className="text-link">
                  Личный кабинет
                </Link>
              </p>
            </>
          )}
        </div>
      </section>
    </>
  );
}
