import { useEffect, useState } from "react";
import RelativeAddPad from "./RelativeAddPad";
import { mediaUrl } from "../../api/trees";
import {
  GENDER_OPTIONS,
  isValidPersonName,
  sanitizePersonNameInput,
  toDateInputValue,
} from "../../utils/treeRelations";

const emptyAlt = { name_type: "aka", first_name: "", last_name: "", middle_name: "" };

export default function PersonFullscreenCard({
  person,
  canEdit,
  onClose,
  onSave,
  onDelete,
  onAddRelative,
  onUploadPhoto,
  isSaving = false,
}) {
  const [form, setForm] = useState(null);
  const [isDeceased, setIsDeceased] = useState(false);
  const [error, setError] = useState("");
  const [altNames, setAltNames] = useState([]);

  useEffect(() => {
    if (!person) {
      setForm(null);
      return;
    }
    setForm({
      first_name: person.first_name || "",
      last_name: person.last_name || "",
      middle_name: person.middle_name || "",
      gender: person.gender || "",
      birth_date: toDateInputValue(person.birth_date) || "",
      death_date: toDateInputValue(person.death_date) || "",
      birth_place: person.birth_place || "",
      death_place: person.death_place || "",
      note: person.note || "",
    });
    setIsDeceased(Boolean(person.is_deceased || person.death_date));
    setAltNames(
      (person.alt_names || []).map((n) => ({
        name_type: n.name_type || "aka",
        first_name: n.first_name || "",
        last_name: n.last_name || "",
        middle_name: n.middle_name || "",
      })),
    );
    setError("");
  }, [person]);

  if (!person || !form) return null;

  const deceasedLabel =
    form.gender === "female" ? "Умерла" : form.gender === "male" ? "Умер" : "Умер(ла)";

  const setName = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: sanitizePersonNameInput(value) }));
  };

  const save = async () => {
    if (!form.first_name.trim() && !form.last_name.trim()) {
      setError("Укажите имя или фамилию");
      return;
    }
    for (const [label, value] of [
      ["Фамилия", form.last_name],
      ["Имя", form.first_name],
      ["Отчество", form.middle_name],
    ]) {
      if (!isValidPersonName(value, { allowEmpty: true })) {
        setError(`${label} — одно слово (дефис допустим)`);
        return;
      }
    }
    if (isDeceased && !form.death_date) {
      setError(`Укажите дату смерти или снимите «${deceasedLabel}»`);
      return;
    }
    await onSave?.({
      ...form,
      death_date: isDeceased ? form.death_date || null : null,
      is_deceased: isDeceased,
      alt_names: altNames.filter((n) => n.first_name || n.last_name || n.middle_name),
    });
  };

  const padPerson = {
    firstName: form.first_name,
    lastName: form.last_name,
    middleName: form.middle_name,
    gender: form.gender,
    birthYear: form.birth_date,
    deathYear: isDeceased ? form.death_date : "",
  };

  const showPad = canEdit && (form.first_name.trim() || form.last_name.trim());
  const photo = mediaUrl(person.photo_url || person.photo_path);

  return (
    <div className="person-fs-overlay" role="dialog" aria-modal="true">
      <div className="person-fs-card">
        <div className="person-fs-head">
          <h2>Карточка человека</h2>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Закрыть
          </button>
        </div>

        <div className="person-fs-body">
          {showPad ? (
            <RelativeAddPad
              person={padPerson}
              onSelect={(option) => onAddRelative?.(option)}
              disabledParent={false}
            />
          ) : null}

          <div className="person-fs-photo-block">
            <div className={`person-fs-photo gender-${form.gender || "unknown"}`}>
              {photo ? <img src={photo} alt="" /> : <span>{(form.last_name?.[0] || "") + (form.first_name?.[0] || "") || "?"}</span>}
            </div>
            {canEdit ? (
              <label className="btn btn-outline btn-sm">
                Загрузить фото
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onUploadPhoto?.(file);
                    e.target.value = "";
                  }}
                />
              </label>
            ) : null}
          </div>

          <div className="form-grid">
            <div>
              <label className="form-label">Фамилия</label>
              <input
                value={form.last_name}
                disabled={!canEdit}
                onChange={(e) => setName("last_name", e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">Имя</label>
              <input
                value={form.first_name}
                disabled={!canEdit}
                onChange={(e) => setName("first_name", e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">Отчество</label>
              <input
                value={form.middle_name}
                disabled={!canEdit}
                onChange={(e) => setName("middle_name", e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">Пол</label>
              <select
                value={form.gender}
                disabled={!canEdit}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
              >
                {GENDER_OPTIONS.map((item) => (
                  <option key={item.id || "u"} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Дата рождения</label>
              <input
                type="date"
                value={form.birth_date}
                disabled={!canEdit}
                onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label">Место рождения</label>
              <input
                value={form.birth_place}
                disabled={!canEdit}
                onChange={(e) => setForm({ ...form, birth_place: e.target.value })}
              />
            </div>
            <div className="tree-death-field">
              <label className="tree-deceased-toggle">
                <input
                  type="checkbox"
                  checked={isDeceased}
                  disabled={!canEdit}
                  onChange={(e) => {
                    setIsDeceased(e.target.checked);
                    if (!e.target.checked) setForm((prev) => ({ ...prev, death_date: "", death_place: "" }));
                  }}
                />
                <span>{deceasedLabel}</span>
              </label>
              {isDeceased ? (
                <>
                  <label className="form-label">Дата смерти</label>
                  <input
                    type="date"
                    value={form.death_date}
                    disabled={!canEdit}
                    onChange={(e) => setForm({ ...form, death_date: e.target.value })}
                  />
                  <label className="form-label">Место смерти</label>
                  <input
                    value={form.death_place}
                    disabled={!canEdit}
                    onChange={(e) => setForm({ ...form, death_place: e.target.value })}
                  />
                </>
              ) : null}
            </div>
            <div>
              <label className="form-label">Заметка</label>
              <textarea
                rows={3}
                value={form.note}
                disabled={!canEdit}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </div>
          </div>

          {canEdit ? (
            <div className="person-fs-alt-names">
              <div className="person-fs-alt-head">
                <span className="form-label">Другие имена / фамилии</span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setAltNames((prev) => [...prev, { ...emptyAlt }])}
                >
                  Добавить
                </button>
              </div>
              {altNames.map((item, index) => (
                <div key={index} className="form-row-2 person-fs-alt-row">
                  <select
                    value={item.name_type}
                    onChange={(e) => {
                      const next = [...altNames];
                      next[index] = { ...next[index], name_type: e.target.value };
                      setAltNames(next);
                    }}
                  >
                    <option value="aka">Также известен</option>
                    <option value="birth">При рождении</option>
                    <option value="married">В браке</option>
                  </select>
                  <input
                    placeholder="Фамилия"
                    value={item.last_name}
                    onChange={(e) => {
                      const next = [...altNames];
                      next[index] = {
                        ...next[index],
                        last_name: sanitizePersonNameInput(e.target.value),
                      };
                      setAltNames(next);
                    }}
                  />
                  <input
                    placeholder="Имя"
                    value={item.first_name}
                    onChange={(e) => {
                      const next = [...altNames];
                      next[index] = {
                        ...next[index],
                        first_name: sanitizePersonNameInput(e.target.value),
                      };
                      setAltNames(next);
                    }}
                  />
                </div>
              ))}
            </div>
          ) : null}

          {error ? <p className="tree-form-error">{error}</p> : null}

          {canEdit ? (
            <div className="person-fs-actions">
              <button type="button" className="btn btn-primary" onClick={save} disabled={isSaving}>
                {isSaving ? "Сохраняем..." : "Сохранить"}
              </button>
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Отмена
              </button>
            </div>
          ) : null}

          {canEdit ? (
            <div className="tree-person-danger">
              <button
                type="button"
                className="btn btn-outline btn-sm tree-delete-person-btn"
                onClick={() => {
                  if (window.confirm("Удалить этого человека?")) onDelete?.();
                }}
              >
                Удалить человека
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
