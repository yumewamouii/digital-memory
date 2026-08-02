import {
  formatPersonDate,
  personAge,
  personDisplayName,
  personInitials,
  RELATIVE_ADD_OPTIONS,
} from "../../utils/treeRelations";

function RelativeAddButton({ option, onSelect, disabled }) {
  return (
    <button
      type="button"
      className={`relative-add-btn gender-${option.gender}`}
      onClick={() => onSelect(option)}
      disabled={disabled}
      title={option.hint || option.label}
    >
      <span className="relative-add-btn-plus" aria-hidden="true">
        +
      </span>
      <span className="relative-add-btn-label">{option.label}</span>
      {option.hint ? <span className="relative-add-btn-hint">{option.hint}</span> : null}
    </button>
  );
}

export default function RelativeAddPad({ person, onSelect, disabledParent }) {
  const name = personDisplayName(person);
  const birth = formatPersonDate(person?.birthYear);
  const age = personAge(person?.birthYear, person?.deathYear);
  const gender = person?.gender || "unknown";

  const bySlot = (slot) => RELATIVE_ADD_OPTIONS.filter((item) => item.slot === slot);

  return (
    <div className="relative-add-pad" aria-label="Добавить родственника">
      <div className="relative-add-pad-grid">
        <div className="relative-add-slot relative-add-slot--top">
          {bySlot("top").map((option) => (
            <RelativeAddButton
              key={option.id}
              option={option}
              onSelect={onSelect}
              disabled={disabledParent}
            />
          ))}
        </div>

        <div className="relative-add-slot relative-add-slot--left">
          {bySlot("left").map((option) => (
            <RelativeAddButton key={option.id} option={option} onSelect={onSelect} />
          ))}
        </div>

        <div className={`relative-add-center gender-${gender}`}>
          <div className="relative-add-center-badge">Выбран</div>
          <div className={`relative-add-center-avatar gender-${gender}`} aria-hidden="true">
            {personInitials(person)}
          </div>
          <strong className="relative-add-center-name">{name}</strong>
          {birth ? <span className="relative-add-center-date">{birth}</span> : null}
          {age !== null ? (
            <span className="relative-add-center-age">Возраст: {age}</span>
          ) : null}
        </div>

        <div className="relative-add-slot relative-add-slot--right">
          {bySlot("right").map((option) => (
            <RelativeAddButton key={option.id} option={option} onSelect={onSelect} />
          ))}
        </div>

        <div className="relative-add-slot relative-add-slot--bottom">
          {bySlot("bottom").map((option) => (
            <RelativeAddButton key={option.id} option={option} onSelect={onSelect} />
          ))}
        </div>
      </div>
      <p className="relative-add-pad-hint">
        Нажмите «+», чтобы добавить родственника — затем заполните карточку ниже.
      </p>
    </div>
  );
}
