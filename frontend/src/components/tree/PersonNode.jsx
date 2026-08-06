import { Handle, Position } from "@xyflow/react";
import { formatPersonYears, personInitials } from "../../utils/treeRelations";
import { mediaUrl } from "../../api/trees";
import { PERSON_CARD } from "../../utils/treeCardLayout";

export default function PersonNode({ data, selected }) {
  const years = formatPersonYears(data.birthYear, data.deathYear);
  const gender = data.gender || "";
  const isLinkSource = Boolean(data.isLinkSource);
  const justAdded = Boolean(data.justAdded);
  const photo = mediaUrl(data.photoUrl);
  const lastName = (data.lastName || "").trim();
  const firstName = (data.firstName || "").trim();
  const middleName = (data.middleName || "").trim();
  const nameParts = [lastName, firstName, middleName].filter(Boolean);
  const hasMemorial = Boolean(data.hasMemorial);
  const sideHandleStyle = { top: PERSON_CARD.sideHandleY };

  return (
    <div
      className={[
        "person-node",
        selected ? "selected" : "",
        isLinkSource ? "link-source" : "",
        gender ? `gender-${gender}` : "",
        justAdded ? "just-added" : "",
        "is-editable",
      ]
        .filter(Boolean)
        .join(" ")}
      title="Нажмите, чтобы открыть карточку"
    >
      <Handle type="target" position={Position.Top} id="top" className="is-hidden-handle" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="is-hidden-handle" />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className="is-hidden-handle"
        style={sideHandleStyle}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="is-hidden-handle"
        style={sideHandleStyle}
      />

      <div className="person-node-main">
        <div className={`person-node-avatar gender-${gender || "unknown"}`} aria-hidden="true">
          {photo ? <img src={photo} alt="" /> : personInitials(data)}
        </div>
        <div className="person-node-body">
          <div className="person-node-fio">
            {nameParts.length ? (
              nameParts.map((part, index) => <span key={`${index}-${part}`}>{part}</span>)
            ) : (
              <span>Без имени</span>
            )}
          </div>
          {years ? <span className="person-node-years">{years}</span> : null}
        </div>
        {hasMemorial ? (
          <span className="person-node-memorial" title="Есть страница памяти" aria-label="Есть страница памяти">
            Память
          </span>
        ) : null}
      </div>
    </div>
  );
}
