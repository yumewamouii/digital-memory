import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  getStraightPath,
  useReactFlow,
} from "@xyflow/react";
import { RELATION_COLORS, RELATION_LABELS } from "../../utils/treeRelations";

export default function RelationEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
}) {
  const { setEdges } = useReactFlow();
  const relation = data?.relation || "parent";
  const color = RELATION_COLORS[relation] || RELATION_COLORS.parent;
  const label = RELATION_LABELS[relation] || relation;
  const isDashed = relation === "sibling";
  const readOnly = Boolean(data?.readOnly);
  const justAdded = Boolean(data?.justAdded);
  const hideLabel = Boolean(data?.hideLabel);
  const pathMode = data?.path; // "straight" | "step" | default smoothstep

  // Snap nearly-collinear endpoints so family bars stay perfectly axis-aligned.
  let sx = sourceX;
  let sy = sourceY;
  let tx = targetX;
  let ty = targetY;
  if (pathMode === "straight") {
    if (Math.abs(sy - ty) <= 10) {
      const y = (sy + ty) / 2;
      sy = y;
      ty = y;
    }
    if (Math.abs(sx - tx) <= 10) {
      const x = (sx + tx) / 2;
      sx = x;
      tx = x;
    }
  }

  const [edgePath, labelX, labelY] =
    pathMode === "straight"
      ? getStraightPath({ sourceX: sx, sourceY: sy, targetX: tx, targetY: ty })
      : getSmoothStepPath({
          sourceX,
          sourceY,
          targetX,
          targetY,
          sourcePosition,
          targetPosition,
          borderRadius: 0,
        });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        className={justAdded ? "relation-edge-path just-added" : "relation-edge-path"}
        style={{
          stroke: color,
          strokeWidth: selected ? 3 : 2,
          strokeDasharray: isDashed ? "6 4" : undefined,
        }}
      />
      {!hideLabel ? (
        <EdgeLabelRenderer>
          <div
            className={`relation-edge-label${selected ? " selected" : ""}${justAdded ? " just-added" : ""}`}
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              borderColor: color,
              color,
            }}
          >
            <span>{label}</span>
            {!readOnly ? (
              <button
                type="button"
                className="relation-edge-delete"
                title="Удалить связь"
                onClick={(event) => {
                  event.stopPropagation();
                  setEdges((edges) => edges.filter((edge) => edge.id !== id));
                }}
              >
                ×
              </button>
            ) : null}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}
