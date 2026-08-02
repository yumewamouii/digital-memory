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
  deletePerson,
  deleteTree,
  inviteCollaborator,
  listCollaborators,
  updatePerson,
  updateTree,
  uploadPersonPhoto,
} from "../../api/trees";
import { buildFlowGraph, personDisplayName, personSearchText } from "../../utils/treeGraph";
import { PERSON_CARD } from "../../utils/treeCardLayout";
import { RELATION_COLORS } from "../../utils/treeRelations";

const nodeTypes = { person: PersonNode, familyHub: FamilyHubNode };
const edgeTypes = { relation: RelationEdge };

const VIEW_MODES = [
  { id: "tree", label: "Древо" },
  { id: "list", label: "Список" },
];

function TreeEditorInner({
  tree: initialTree,
  authHeaders = {},
  onTreeChange,
  onDeleted,
  isDemo = false,
}) {
  const { fitView, getNodes } = useReactFlow();
  const [tree, setTree] = useState(initialTree);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [viewMode, setViewMode] = useState("tree");
  const [selectedPersonId, setSelectedPersonId] = useState(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setLocalMessage] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("editor");
  const [collaborators, setCollaborators] = useState([]);
  const [showShare, setShowShare] = useState(false);
  const canvasRef = useRef(null);
  const canEdit = Boolean(tree?.can_edit);
  const hydratedTreeId = useRef(null);
  const fitTimer = useRef(null);

  const scheduleFitView = useCallback(() => {
    window.clearTimeout(fitTimer.current);
    fitTimer.current = window.setTimeout(() => {
      fitView({ padding: 0.2, duration: 200 });
    }, 80);
  }, [fitView]);

  const applyTree = useCallback(
    (next, { notifyParent = true, fit = false } = {}) => {
      if (!next) return;
      setTree(next);
      if (notifyParent) onTreeChange?.(next);
      const graph = buildFlowGraph(next);
      setNodes(graph.nodes);
      setEdges(graph.edges);
      if (fit) scheduleFitView();
    },
    [onTreeChange, scheduleFitView, setEdges, setNodes],
  );

  // Hydrate from parent only when opening another tree — never echo onTreeChange back into a loop.
  useEffect(() => {
    if (!initialTree?.id) return;
    if (hydratedTreeId.current === initialTree.id) return;
    hydratedTreeId.current = initialTree.id;
    applyTree(initialTree, { notifyParent: false, fit: true });
  }, [initialTree, applyTree]);

  // Tree mode: one auto-layout pass when entering the mode / opening a tree.
  useEffect(() => {
    if (!canEdit || viewMode !== "tree" || !tree?.id) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const next = await autoLayout(tree.id, authHeaders);
        if (!cancelled) applyTree(next, { fit: true });
      } catch {
        /* keep current positions */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree?.id, viewMode]);

  useEffect(() => {
    if (viewMode === "list") return undefined;
    scheduleFitView();
    return undefined;
  }, [viewMode, tree?.id, tree?.person_count, scheduleFitView]);

  useEffect(
    () => () => {
      window.clearTimeout(fitTimer.current);
    },
    [],
  );

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

  const handleAddFirst = async () => {
    if (!canEdit) return;
    setBusy(true);
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
      setLocalMessage(err?.response?.data?.detail || "Не удалось добавить человека");
    } finally {
      setBusy(false);
    }
  };

  const handleSavePerson = async (payload) => {
    setBusy(true);
    try {
      const next = await updatePerson(tree.id, selectedPersonId, payload, authHeaders);
      applyTree(next);
      setLocalMessage("Карточка сохранена");
    } catch (err) {
      setLocalMessage(err?.response?.data?.detail || "Не удалось сохранить");
    } finally {
      setBusy(false);
    }
  };

  const handleDeletePerson = async () => {
    setBusy(true);
    try {
      const next = await deletePerson(tree.id, selectedPersonId, authHeaders);
      applyTree(next);
      setSelectedPersonId(null);
    } catch (err) {
      setLocalMessage(err?.response?.data?.detail || "Не удалось удалить");
    } finally {
      setBusy(false);
    }
  };

  const handleAddRelative = async (option) => {
    if (!selectedPersonId || !option) return;
    setBusy(true);
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
      setLocalMessage(err?.response?.data?.detail || "Не удалось добавить родственника");
    } finally {
      setBusy(false);
    }
  };

  const handleUploadPhoto = async (file) => {
    setBusy(true);
    try {
      const next = await uploadPersonPhoto(tree.id, selectedPersonId, file, authHeaders);
      applyTree(next);
    } catch (err) {
      setLocalMessage(err?.response?.data?.detail || "Не удалось загрузить фото");
    } finally {
      setBusy(false);
    }
  };

  const handleMetaSave = async (patch) => {
    setBusy(true);
    try {
      const next = await updateTree(tree.id, patch, authHeaders);
      applyTree(next);
      setLocalMessage("Настройки сохранены");
    } catch (err) {
      setLocalMessage(err?.response?.data?.detail || "Не удалось сохранить");
    } finally {
      setBusy(false);
    }
  };

  const handleAutoLayout = async () => {
    setBusy(true);
    try {
      const next = await autoLayout(tree.id, authHeaders);
      applyTree(next, { fit: true });
      setViewMode("tree");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteTree = async () => {
    if (!window.confirm(`Удалить древо «${tree.title}» целиком?`)) return;
    await deleteTree(tree.id, authHeaders);
    onDeleted?.();
  };

  const captureTreeImage = async ({ pixelRatio = 3 } = {}) => {
    const root = canvasRef.current;
    const viewportEl = root?.querySelector(".react-flow__viewport");
    if (!root || !viewportEl) return null;

    const flowNodes = getNodes();
    if (!flowNodes.length) return null;

    // Ensure bounds use on-screen card size, not a squeezed viewport.
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
      // Let CSS hide background/minimap before snapshot.
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
    setBusy(true);
    try {
      const dataUrl = await captureTreeImage({ pixelRatio: 3 });
      if (!dataUrl) return;
      const link = document.createElement("a");
      link.download = `${tree.title || "tree"}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setBusy(false);
    }
  };

  const exportPdf = async () => {
    setBusy(true);
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

      // Page follows image aspect so cards are not stretched to A4.
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
      setBusy(false);
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
            disabled={!canEdit}
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
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddFirst} disabled={busy}>
                Добавить человека
              </button>
              <button type="button" className="btn btn-outline btn-sm" onClick={handleAutoLayout} disabled={busy}>
                Выровнять
              </button>
            </>
          ) : null}
          <div className="tree-download-group">
            <span className="form-label">Скачать в</span>
            <div className="tree-download-buttons">
              <button type="button" className="btn btn-outline btn-sm" onClick={exportPng} disabled={busy}>
                PNG
              </button>
              <button type="button" className="btn btn-outline btn-sm" onClick={exportPdf} disabled={busy}>
                PDF
              </button>
            </div>
          </div>
          {!isDemo ? (
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowShare((v) => !v)}>
              Доступ
            </button>
          ) : null}
          {canEdit ? (
            <button type="button" className="btn btn-ghost btn-sm" onClick={handleDeleteTree}>
              Удалить древо
            </button>
          ) : null}
        </div>
      </div>

      {message ? <p className="hint-text tree-editor-hint">{message}</p> : null}

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
                  onClick={() => navigator.clipboard?.writeText(shareUrl)}
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
                      setLocalMessage(
                        row.invite_url
                          ? `Приглашение создано: ${window.location.origin}${row.invite_url}`
                          : "Приглашение отправлено",
                      );
                      refreshCollaborators();
                    } catch (err) {
                      setLocalMessage(err?.response?.data?.detail || "Не удалось пригласить");
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
                  {[person.birth_date, person.death_date].filter(Boolean).join(" — ") || "Даты не указаны"}
                </span>
              </button>
            ))}
            {!filteredPeople.length ? <p className="hint-text">Никого не найдено</p> : null}
          </div>
        </div>
      ) : (
        <div className="tree-editor-canvas" ref={canvasRef}>
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
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            nodesDraggable={false}
            nodesConnectable={false}
            connectionMode={ConnectionMode.Loose}
            elementsSelectable
            onlyRenderVisibleElements={false}
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
          isSaving={busy}
          onClose={() => setSelectedPersonId(null)}
          onSave={handleSavePerson}
          onDelete={handleDeletePerson}
          onAddRelative={handleAddRelative}
          onUploadPhoto={handleUploadPhoto}
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
