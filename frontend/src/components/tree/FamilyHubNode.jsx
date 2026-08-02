import { Handle, Position } from "@xyflow/react";

/** Invisible junction where spouse lines meet and drop to children. */
export default function FamilyHubNode() {
  return (
    <div className="family-hub-node" aria-hidden="true">
      <Handle type="target" position={Position.Left} id="left" className="is-hidden-handle" />
      <Handle type="target" position={Position.Right} id="right" className="is-hidden-handle" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="is-hidden-handle" />
      <Handle type="target" position={Position.Top} id="top" className="is-hidden-handle" />
      <span className="family-hub-dot" />
    </div>
  );
}
