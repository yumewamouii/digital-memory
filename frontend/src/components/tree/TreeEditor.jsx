import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  ConnectionMode,
  ControlButton,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  getNodesBounds,
  getViewportForBounds,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import PersonNode from "./PersonNode";
import FamilyHubNode from "./FamilyHubNode";
import RelationEdge from "./RelationEdge";
import PersonFullscreenCard from "./PersonFullscreenCard";
import {
  addRelative,
  autoLayout,
  createPerson,
  createPersonMemorial,
  deletePerson,
  deleteTree,
  inviteCollaborator,
  listCollaborators,
  saveLayout,
  updatePerson,
  updateTree,
  uploadPersonPhoto,
} from "../../api/trees";
import { buildFlowGraph, personDisplayName, personSearchText } from "../../utils/treeGraph";
import { PERSON_CARD } from "../../utils/treeCardLayout";
import { formatPersonYears, RELATION_COLORS } from "../../utils/treeRelations";
import { formatApiError } from "../../utils/apiErrors";

const nodeTypes = { person: PersonNode, familyHub: FamilyHubNode };
const edgeTypes = { relation: RelationEdge };
const GUEST_PERSON_LIMIT = 6;
const MESSAGE_TTL_MS = 4000;

const VIEW_MODES = [
  { id: "tree", label: "Древо" },
  { id: "list", label: "Список" },
];

function personsNeedLayout(persons = []) {
  if (!persons.length) return false;
  return persons.every((p) => {
    const x = Number(p.x);
    const y = Number(p.y);
    return (!x && !y) || (Number.isNaN(x) && Number.isNaN(y));
  });
}

function TreeEditorInner({
  tree: initialTree,
  authHeaders = {},
  onTreeChange,
  onDeleted,
  isDemo = false,
  initialPersonId = null,
}) {
  const { fitView, getNodes, setCenter, getZoom } = useReactFlow();
  const [tree, setTree] = useState(initialTree);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [viewMode, setViewMode] = useState("tree");
  const [selectedPersonId, setSelectedPersonId] = useState(() => {
    const id = Number(initialPersonId);
    return Number.isFinite(id) && id > 0 ? id : null;
  });
  const [query, setQuery] = useState("");
  const [personBusy, setPersonBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [layoutBusy, setLayoutBusy] = useState(false);
  const [memorialBusy, setMemorialBusy] = useState(false);
  const [message, setLocalMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("editor");
  const [collaborators, setCollaborators] = useState([]);
  const [showShare, setShowShare] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const canvasRef = useRef(null);
  const moreRef = useRef(null);
  const canEdit = Boolean(tree?.can_edit);
  const hydratedTreeId = useRef(null);
  const fitTimer = useRef(null);
  const messageTimer = useRef(null);
  const initialLayoutDone = useRef(null);
  const pendingFitPersonId = useRef(null);

  const showMessage = useCallback((text, { error = false } = {}) => {
    setLocalMessage(text || "");
    setMessageIsError(Boolean(error));
    window.clearTimeout(messageTimer.current);
    if (text) {
      messageTimer.current = window.setTimeout(() => {
        setLocalMessage("");
        setMessageIsError(false);
      }, MESSAGE_TTL_MS);
    }
  }, []);

  const scheduleFitView = useCallback(() => {
    window.clearTimeout(fitTimer.current);
    fitTimer.current = window.setTimeout(() => {
      fitView({ padding: 0.2, duration: 200 });
    }, 80);
  }, [fitView]);

  const fitToPerson = useCallback(
    (personId) => {
      if (!personId) return;
      window.clearTimeout(fitTimer.current);
      fitTimer.current = window.setTimeout(() => {
        const node = getNodes().find((n) => n.data?.personId === personId);
        if (!node) return;
        const width = node.measured?.width || node.width || PERSON_CARD.width;
        const height = node.measured?.height || node.height || PERSON_CARD.height;
        const zoom = Math.max(getZoom(), 0.85);
        setCenter(node.position.x + width / 2, node.position.y + height / 2, {
          zoom,
          duration: 280,
        });
      }, 100);
    },
    [getNodes, getZoom, setCenter],
  );

  const applyTree = useCallback(
    (next, { notifyParent = true, fit = false } = {}) => {
      if (!next) return;
      setTree(next);
      if (notifyParent) onTreeChange?.(next);
      const graph = buildFlowGraph(next);
      setNodes(graph.nodes);
      setEdges(graph.edges);
      if (fit) scheduleFitView();
      if (pendingFitPersonId.current) {
        const id = pendingFitPersonId.current;
        pendingFitPersonId.current = null;
        fitToPerson(id);
      }
    },
    [onTreeChange, scheduleFitView, setEdges, setNodes, fitToPerson],
  );

  // Hydrate from parent only when opening another tree — never echo onTreeChange back into a loop.
  useEffect(() => {
    if (!initialTree?.id) return;
    if (hydratedTreeId.current === initialTree.id) return;
    hydratedTreeId.current = initialTree.id;
    initialLayoutDone.current = null;
    applyTree(initialTree, { notifyParent: false, fit: true });
  }, [initialTree, applyTree]);

  // Open person from deep link (?person=) once the graph is ready.
  const deepLinkOpened = useRef(false);
  useEffect(() => {
    if (deepLinkOpened.current) return undefined;
    const id = Number(initialPersonId);
    if (!Number.isFinite(id) || id <= 0) return undefined;
    if (!(tree?.persons || []).some((p) => p.id === id)) return undefined;
    deepLinkOpened.current = true;
    setSelectedPersonId(id);
    fitToPerson(id);
    return undefined;
  }, [initialPersonId, tree?.id, tree?.persons, fitToPerson]);

  // One-time auto-layout only when all persons lack meaningful coordinates.
  useEffect(() => {
    if (!canEdit || !tree?.id || viewMode !== "tree") return undefined;
    if (initialLayoutDone.current === tree.id) return undefined;
    if (!personsNeedLayout(tree.persons)) {
      initialLayoutDone.current = tree.id;
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const next = await autoLayout(tree.id, authHeaders);
        if (!cancelled) {
          initialLayoutDone.current = tree.id;
          applyTree(next, { fit: true });
        }
      } catch {
        initialLayoutDone.current = tree.id;
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree?.id, canEdit, viewMode]);

  const prevViewMode = useRef(viewMode);
  useEffect(() => {
    const switchedToTree = prevViewMode.current !== "tree" && viewMode === "tree";
    prevViewMode.current = viewMode;
    if (!switchedToTree) return undefined;
    if (selectedPersonId) {
      fitToPerson(selectedPersonId);
    } else {
      scheduleFitView();
    }
    return undefined;
  }, [viewMode, scheduleFitView, selectedPersonId, fitToPerson]);

  useEffect(
    () => () => {
      window.clearTimeout(fitTimer.current);
      window.clearTimeout(messageTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (!showMore) return undefined;
    const onDocClick = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) setShowMore(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setShowMore(false);
    };
    document.addEventListener("mousedown", onDocClick);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [showMore]);

  const selectedPerson = useMemo(
    () => (tree?.persons || []).find((p) => p.id === selectedPersonId) || null,
    [tree, selectedPersonId],
  );

  const filteredPeople = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = tree?.persons || [];
    if (!q) return list;
    return list.filter((p) => personSearchText(p).includes(q));
  }, [tree, query]);

  const isGuestTree =
    canEdit && !authHeaders.Authorization && !tree?.owner_id && !isDemo;
  const personCount = tree?.persons?.length || tree?.person_count || 0;

  const refreshCollaborators = async () => {
    if (!tree?.id || !authHeaders.Authorization) return;
    try {
      setCollaborators(await listCollaborators(tree.id, authHeaders));
    } catch {
      setCollaborators([]);
    }
  };

  useEffect(() => {
    if (showShare) refreshCollaborators();
  }, [showShare, tree?.id]);

  const onNodeClick = useCallback((_e, node) => {
    const id = node.data?.personId;
    if (id) setSelectedPersonId(id);
  }, []);

  const onNodeDragStop = useCallback(
    async (_e, node) => {
      if (!canEdit || node.type !== "person" || !node.data?.personId) return;
      try {
        const next = await saveLayout(
          tree.id,
          [{ person_id: node.data.personId, x: node.position.x, y: node.position.y }],
          authHeaders,
          { updatedAt: tree.updated_at },
        );
        applyTree(next);
      } catch (err) {
        showMessage(formatApiError(err?.response?.data?.detail, "Не удалось сохранить позицию"), {
          error: true,
        });
      }
    },
    [canEdit, tree?.id, tree?.updated_at, authHeaders, applyTree, showMessage],
  );

  const openPersonFromSearch = (personId) => {
    setSelectedPersonId(personId);
    setQuery("");
    if (viewMode !== "tree") {
      pendingFitPersonId.current = personId;
      setViewMode("tree");
    } else {
      fitToPerson(personId);
    }
  };

  const handleAddFirst = async () => {
    if (!canEdit) return;
    setPersonBusy(true);
    try {
      const next = await createPerson(
        tree.id,
        { first_name: "", last_name: "", gender: "" },
        authHeaders,
      );
      applyTree(next);
      const created = next.persons?.[next.persons.length - 1];
      if (created) setSelectedPersonId(created.id);
    } catch (err) {
      showMessage(formatApiError(err?.response?.data?.detail, "Не удалось добавить человека"), {
        error: true,
      });
    } finally {
      setPersonBusy(false);
    }
  };

  const handleSavePerson = async (payload) => {
    setPersonBusy(true);
    try {
      const next = await updatePerson(tree.id, selectedPersonId, payload, authHeaders, {
        updatedAt: tree.updated_at,
      });
      applyTree(next);
      showMessage("Карточка сохранена");
      return true;
    } catch (err) {
      showMessage(formatApiError(err?.response?.data?.detail, "Не удалось сохранить"), {
        error: true,
      });
      return false;
    } finally {
      setPersonBusy(false);
    }
  };

  const handleDeletePerson = async () => {
    setPersonBusy(true);
    try {
      const next = await deletePerson(tree.id, selectedPersonId, authHeaders);
      applyTree(next);
      setSelectedPersonId(null);
    } catch (err) {
      showMessage(formatApiError(err?.response?.data?.detail, "Не удалось удалить"), {
        error: true,
      });
    } finally {
      setPersonBusy(false);
    }
  };

  const handleAddRelative = async (option) => {
    if (!selectedPersonId || !option) return;
    setPersonBusy(true);
    try {
      const next = await addRelative(
        tree.id,
        selectedPersonId,
        {
          relation: option.relation,
          gender: option.gender || "",
          last_name: selectedPerson?.last_name || null,
        },
        authHeaders,
      );
      applyTree(next);
      if (next.new_person_id) setSelectedPersonId(next.new_person_id);
      setViewMode("tree");
    } catch (err) {
      showMessage(
        formatApiError(err?.response?.data?.detail, "Не удалось добавить родственника"),
        { error: true },
      );
    } finally {
      setPersonBusy(false);
    }
  };

  const handleUploadPhoto = async (file) => {
    setPersonBusy(true);
    try {
      const next = await uploadPersonPhoto(tree.id, selectedPersonId, file, authHeaders, {
        updatedAt: tree.updated_at,
      });
      applyTree(next);
    } catch (err) {
      showMessage(formatApiError(err?.response?.data?.detail, "Не удалось загрузить фото"), {
        error: true,
      });
    } finally {
      setPersonBusy(false);
    }
  };

  const handleCreateMemorial = async () => {
    if (!selectedPersonId) return;
    if (!authHeaders.Authorization) {
      showMessage("Войдите в аккаунт, чтобы создать страницу памяти", { error: true });
      return;
    }
    setMemorialBusy(true);
    try {
      const next = await createPersonMemorial(tree.id, selectedPersonId, authHeaders);
      applyTree(next);
      const memorialId =
        next.memorial_card_id ||
        next.persons?.find((p) => p.id === selectedPersonId)?.memorial_card_id;
      showMessage(memorialId ? "Страница памяти создана" : "Страница памяти уже связана");
      if (memorialId) {
        window.open(`/memory/${memorialId}`, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      showMessage(
        formatApiError(err?.response?.data?.detail, "Не удалось создать страницу памяти"),
        { error: true },
      );
    } finally {
      setMemorialBusy(false);
    }
  };

  const handleMetaSave = async (patch) => {
    setPersonBusy(true);
    try {
      const next = await updateTree(tree.id, patch, authHeaders, { updatedAt: tree.updated_at });
      applyTree(next);
      showMessage("Настройки сохранены");
    } catch (err) {
      showMessage(formatApiError(err?.response?.data?.detail, "Не удалось сохранить"), {
        error: true,
      });
    } finally {
      setPersonBusy(false);
    }
  };

  const handleAutoLayout = async () => {
    setLayoutBusy(true);
    try {
      const next = await autoLayout(tree.id, authHeaders);
      applyTree(next, { fit: true });
      setViewMode("tree");
    } finally {
      setLayoutBusy(false);
    }
  };

  const handleDeleteTree = async () => {
    setShowMore(false);
    if (!window.confirm(`Удалить древо «${tree.title}» целиком?`)) return;
    try {
      await deleteTree(tree.id, authHeaders);
      onDeleted?.();
    } catch (err) {
      showMessage(formatApiError(err?.response?.data?.detail, "Не удалось удалить древо"), {
        error: true,
      });
    }
  };

  const captureTreeImage = async ({ pixelRatio = 3 } = {}) => {
    const root = canvasRef.current;
    const viewportEl = root?.querySelector(".react-flow__viewport");
    if (!root || !viewportEl) return null;

    const flowNodes = getNodes();
    if (!flowNodes.length) return null;

    const sizedNodes = flowNodes.map((node) => {
      const isHub = node.type === "familyHub";
      const width = node.measured?.width || node.width || (isHub ? 10 : PERSON_CARD.width);
      const height = node.measured?.height || node.height || (isHub ? 10 : PERSON_CARD.height);
      return { ...node, width, height, measured: { width, height } };
    });

    const bounds = getNodesBounds(sizedNodes);
    const padding = 48;
    const imageWidth = Math.max(Math.ceil(bounds.width + padding * 2), 320);
    const imageHeight = Math.max(Math.ceil(bounds.height + padding * 2), 240);
    const viewport = getViewportForBounds(bounds, imageWidth, imageHeight, 0.1, 2, 0.15);

    root.classList.add("tree-exporting");
    try {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return await toPng(viewportEl, {
        cacheBust: true,
        pixelRatio,
        backgroundColor: "#ffffff",
        width: imageWidth,
        height: imageHeight,
        style: {
          width: `${imageWidth}px`,
          height: `${imageHeight}px`,
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
        },
      });
    } finally {
      root.classList.remove("tree-exporting");
    }
  };

  const exportPng = async () => {
    setShowMore(false);
    setExportBusy(true);
    try {
      const dataUrl = await captureTreeImage({ pixelRatio: 3 });
      if (!dataUrl) return;
      const link = document.createElement("a");
      link.download = `${tree.title || "tree"}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setExportBusy(false);
    }
  };

  const exportPdf = async () => {
    setShowMore(false);
    setExportBusy(true);
    try {
      const pixelRatio = 3;
      const dataUrl = await captureTreeImage({ pixelRatio });
      if (!dataUrl) return;

      const img = await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = dataUrl;
      });

      const cssW = img.width / pixelRatio;
      const cssH = img.height / pixelRatio;
      const ptPerPx = 72 / 96;
      let pageW = cssW * ptPerPx;
      let pageH = cssH * ptPerPx;
      const maxSide = 2400;
      const scale = Math.min(1, maxSide / Math.max(pageW, pageH));
      pageW *= scale;
      pageH *= scale;

      const pdf = new jsPDF({
        orientation: pageW >= pageH ? "landscape" : "portrait",
        unit: "pt",
        format: [pageW, pageH],
        compress: true,
      });
      pdf.addImage(dataUrl, "PNG", 0, 0, pageW, pageH, undefined, "NONE");
      pdf.save(`${tree.title || "tree"}.pdf`);
    } finally {
      setExportBusy(false);
    }
  };

  const shareUrl =
    tree?.share_slug && typeof window !== "undefined"
      ? `${window.location.origin}${import.meta.env.BASE_URL || "/"}family-tree/s/${tree.share_slug}`.replace(
          /([^:]\/)\/+/g,
          "$1",
        )
      : "";

  return (
    <div className={`tree-editor${canEdit ? "" : " is-readonly"}`}>
      <div className="tree-editor-toolbar sticky">
        <div className="tree-editor-toolbar-group">
          <label className="form-label">Название</label>
          <input
            value={tree?.title || ""}
            disabled={!canEdit || personBusy}
            onChange={(e) => setTree((prev) => ({ ...prev, title: e.target.value }))}
            onBlur={() => {
              if (canEdit && tree?.title?.trim()?.length >= 2) {
                handleMetaSave({ title: tree.title.trim() });
              }
            }}
          />
        </div>
        <div className="tree-editor-toolbar-group">
          <span className="form-label">Вид</span>
          <div className="tree-mode-pills">
            {VIEW_MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                className={`btn btn-sm ${viewMode === mode.id ? "btn-primary" : "btn-outline"}`}
                onClick={() => setViewMode(mode.id)}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
        <div className="tree-editor-actions">
          {canEdit ? (
            <>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleAddFirst}
                disabled={personBusy}
              >
                Добавить человека
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={handleAutoLayout}
                disabled={layoutBusy || personBusy}
              >
                {layoutBusy ? "Выравниваем..." : "Выровнять"}
              </button>
            </>
          ) : null}
          {!isDemo ? (
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowShare((v) => !v)}>
              Доступ
            </button>
          ) : null}
          <div className="tree-more-menu" ref={moreRef}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              aria-expanded={showMore}
              onClick={() => setShowMore((v) => !v)}
            >
              Ещё
            </button>
            {showMore ? (
              <div className="tree-more-dropdown" role="menu">
                <button type="button" role="menuitem" disabled={exportBusy} onClick={exportPng}>
                  {exportBusy ? "Экспорт..." : "Скачать PNG"}
                </button>
                <button type="button" role="menuitem" disabled={exportBusy} onClick={exportPdf}>
                  {exportBusy ? "Экспорт..." : "Скачать PDF"}
                </button>
                {canEdit ? (
                  <button
                    type="button"
                    role="menuitem"
                    className="tree-more-danger"
                    onClick={handleDeleteTree}
                  >
                    Удалить древо
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {isGuestTree ? (
        <p className="tree-guest-limit-banner">
          Гостевой режим: {personCount} / {GUEST_PERSON_LIMIT} карточек. Войдите, чтобы снять лимит.
        </p>
      ) : null}

      {message ? (
        <p className={`hint-text tree-editor-hint${messageIsError ? " has-error" : ""}`}>{message}</p>
      ) : null}

      {showShare && !isDemo ? (
        <div className="tree-share-panel">
          <div className="form-grid">
            <div>
              <label className="form-label">Видимость</label>
              <select
                value={tree.visibility || "private"}
                disabled={!canEdit || !authHeaders.Authorization}
                onChange={(e) => handleMetaSave({ visibility: e.target.value })}
              >
                <option value="private">Закрытое</option>
                <option value="link">По ссылке</option>
                <option value="public">Публичное</option>
              </select>
            </div>
            <div>
              <label className="form-label">Ссылка</label>
              <div className="tree-share-link-row">
                <input readOnly value={shareUrl} />
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    navigator.clipboard?.writeText(shareUrl);
                    showMessage("Ссылка скопирована");
                  }}
                >
                  Копировать
                </button>
              </div>
            </div>
          </div>
          {canEdit && authHeaders.Authorization ? (
            <div className="tree-invite-block">
              <span className="form-label">Пригласить к редактированию</span>
              <div className="tree-invite-row">
                <input
                  type="email"
                  placeholder="email@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                  <option value="editor">Редактор</option>
                  <option value="viewer">Просмотр</option>
                </select>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={async () => {
                    try {
                      const row = await inviteCollaborator(
                        tree.id,
                        { email: inviteEmail, role: inviteRole },
                        authHeaders,
                      );
                      setInviteEmail("");
                      if (row.invite_url) {
                        const full = `${window.location.origin}${row.invite_url}`;
                        await navigator.clipboard?.writeText(full);
                        showMessage("Приглашение создано, ссылка скопирована");
                      } else {
                        showMessage("Приглашение отправлено");
                      }
                      refreshCollaborators();
                    } catch (err) {
                      showMessage(
                        formatApiError(err?.response?.data?.detail, "Не удалось пригласить"),
                        { error: true },
                      );
                    }
                  }}
                >
                  Пригласить
                </button>
              </div>
              <ul className="tree-collab-list">
                {collaborators.map((c) => (
                  <li key={c.id}>
                    {c.email} — {c.role} ({c.status})
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {viewMode === "list" ? (
        <div className="tree-people-list">
          <input
            className="tree-people-search"
            placeholder="Поиск по ФИО"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="tree-people-rows">
            {filteredPeople.map((person) => (
              <button
                key={person.id}
                type="button"
                className="tree-people-row"
                onClick={() => setSelectedPersonId(person.id)}
              >
                <strong>{personDisplayName(person)}</strong>
                <span>
                  {formatPersonYears(person.birth_date, person.death_date) || "Даты не указаны"}
                </span>
              </button>
            ))}
            {!filteredPeople.length ? <p className="hint-text">Никого не найдено</p> : null}
          </div>
        </div>
      ) : (
        <div className="tree-editor-canvas" ref={canvasRef}>
          <div className="tree-canvas-search">
            <input
              className="tree-people-search"
              placeholder="Найти на древе..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query.trim() ? (
              <div className="tree-canvas-search-results">
                {filteredPeople.slice(0, 8).map((person) => (
                  <button
                    key={person.id}
                    type="button"
                    className="tree-canvas-search-item"
                    onClick={() => openPersonFromSearch(person.id)}
                  >
                    {personDisplayName(person)}
                  </button>
                ))}
                {!filteredPeople.length ? (
                  <p className="hint-text tree-canvas-search-empty">Никого не найдено</p>
                ) : null}
              </div>
            ) : null}
          </div>
          {(tree?.persons || []).length === 0 ? (
            <div className="tree-empty-state">
              <div className="tree-empty-illustration" aria-hidden="true" />
              <h3>Древо пока пустое</h3>
              <p>Добавьте первого человека — от него можно строить родственные связи.</p>
              {canEdit ? (
                <button type="button" className="btn btn-primary btn-sm" onClick={handleAddFirst}>
                  Добавить первого человека
                </button>
              ) : null}
            </div>
          ) : null}
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            onNodeDragStop={onNodeDragStop}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            nodesDraggable={canEdit}
            nodesConnectable={false}
            connectionMode={ConnectionMode.Loose}
            elementsSelectable
            onlyRenderVisibleElements
            minZoom={0.15}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
            className="tree-flow"
          >
            <Background gap={22} size={1.2} color="rgba(47, 143, 191, 0.18)" />
            <Controls className="tree-flow-controls" showInteractive={false}>
              <ControlButton onClick={() => fitView({ padding: 0.2, duration: 280 })} title="Вписать">
                <span className="tree-fit-icon">⤢</span>
              </ControlButton>
            </Controls>
            <MiniMap
              className="tree-flow-minimap"
              pannable
              zoomable
              nodeStrokeWidth={2}
              nodeColor={(node) => {
                if (node.type === "familyHub") return "transparent";
                const g = node.data?.gender;
                if (g === "male") return "#7eb6d4";
                if (g === "female") return "#d4a07e";
                return "#9aabbc";
              }}
            />
          </ReactFlow>
          <div className="tree-legend">
            {[
              { id: "parent", label: "Родитель" },
              { id: "spouse", label: "Супруги" },
            ].map((item) => (
              <span key={item.id} className="tree-legend-item">
                <i style={{ background: RELATION_COLORS[item.id] }} />
                {item.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {selectedPerson ? (
        <PersonFullscreenCard
          person={selectedPerson}
          canEdit={canEdit}
          isSaving={personBusy}
          isCreatingMemorial={memorialBusy}
          onClose={() => setSelectedPersonId(null)}
          onSave={handleSavePerson}
          onDelete={handleDeletePerson}
          onAddRelative={handleAddRelative}
          onUploadPhoto={handleUploadPhoto}
          onCreateMemorial={handleCreateMemorial}
        />
      ) : null}
    </div>
  );
}

export default function TreeEditor(props) {
  return (
    <ReactFlowProvider>
      <TreeEditorInner {...props} />
    </ReactFlowProvider>
  );
}
