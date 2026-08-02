import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import TreeEditor from "../components/tree/TreeEditor";
import PageHero from "../components/PageHero";
import { getDemoTree, getTree, getTreeBySlug } from "../api/trees";
import { useAuth } from "../context/AuthContext";

export default function ViewTreePage({ mode = "id" }) {
  const { treeId, shareSlug } = useParams();
  const { token, authHeaders, user } = useAuth();
  const [tree, setTree] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setIsLoading(true);
        setError("");
        let data;
        if (mode === "demo") data = await getDemoTree();
        else if (mode === "slug") data = await getTreeBySlug(shareSlug, token ? authHeaders : {});
        else data = await getTree(treeId, token ? authHeaders : {});
        if (!cancelled) setTree(data);
      } catch {
        if (!cancelled) setError("Не удалось открыть древо");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [mode, treeId, shareSlug, token, authHeaders]);

  const canEdit =
    Boolean(tree?.can_edit) ||
    Boolean(token && user && tree?.owner_id && user.id === tree.owner_id);

  return (
    <>
      <PageHero
        className="page-hero--compact"
        title={
          mode === "demo"
            ? "Демонстрация генеалогического древа"
            : tree?.title || "Просмотр древа"
        }
        subtitle={mode === "demo" ? "" : tree?.description || "Генеалогическое древо"}
      />
      <section className="section section--tree">
        <div className="section-inner tree-editor-page tree-editor-page--wide">
          {isLoading ? (
            <p className="hint-text">Загружаем…</p>
          ) : error || !tree ? (
            <div className="notice-card">
              <p>{error || "Древо недоступно"}</p>
              <Link to="/family-tree" className="btn btn-outline">
                О древах
              </Link>
            </div>
          ) : (
            <>
              <TreeEditor
                key={`${mode}-${tree.id}`}
                tree={{ ...tree, can_edit: mode === "demo" ? false : tree.can_edit }}
                authHeaders={token ? authHeaders : {}}
                onTreeChange={setTree}
                isDemo={mode === "demo"}
              />
              <p className="hint-text tree-page-footer-links">
                {canEdit && mode !== "demo" ? (
                  <>
                    <Link to={`/family-tree/${tree.id}/edit`} className="text-link">
                      Редактировать
                    </Link>
                    {" · "}
                  </>
                ) : null}
                {mode === "demo" ? (
                  <>
                    <Link to="/family-tree/create" className="text-link">
                      Создать свою копию
                    </Link>
                    {" · "}
                  </>
                ) : null}
                <Link to="/cabinet" className="text-link">
                  Кабинет
                </Link>
              </p>
            </>
          )}
        </div>
      </section>
    </>
  );
}
