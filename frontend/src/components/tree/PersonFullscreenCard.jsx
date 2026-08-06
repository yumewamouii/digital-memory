import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import RelativeAddPad from "./RelativeAddPad";
import PartialDateField from "./PartialDateField";
import PlaceField, { emptyPlace } from "../PlaceField";
import { mediaUrl } from "../../api/trees";
import {
  GENDER_OPTIONS,
  LIFE_STATUS_OPTIONS,
  deriveLifeStatus,
  isValidPersonName,
  normalizePartialDate,
  sanitizePersonNameInput,
} from "../../utils/treeRelations";

const emptyAlt = { name_type: "aka", first_name: "", last_name: "", middle_name: "" };
const NAME_HINT = "Одно слово, дефис допустим";

function placeFromPerson(address, lat, lng) {
  const latitude = lat == null || lat === "" ? null : Number(lat);
  const longitude = lng == null || lng === "" ? null : Number(lng);
  return {
    address: address || "",
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
  };
}

function normalizePlaceCoords(place) {
  const latitude =
    typeof place?.latitude === "number" && Number.isFinite(place.latitude)
      ? place.latitude
      : null;
  const longitude =
    typeof place?.longitude === "number" && Number.isFinite(place.longitude)
      ? place.longitude
      : null;
  return {
    address: (place?.address || "").trim(),
    latitude,
    longitude,
  };
}

function lifeStatusLabels(gender) {
  if (gender === "female") {
    return { unknown: "Неизвестно", alive: "Жива", deceased: "Умерла" };
  }
  if (gender === "male") {
    return { unknown: "Неизвестно", alive: "Жив", deceased: "Умер" };
  }
  return { unknown: "Неизвестно", alive: "Жив(а)", deceased: "Умер(ла)" };
}

function snapshotFromPerson(person) {
  const form = {
    first_name: person.first_name || "",
    last_name: person.last_name || "",
    middle_name: person.middle_name || "",
    gender: person.gender || "",
    birth_date: normalizePartialDate(person.birth_date) || "",
    death_date: normalizePartialDate(person.death_date) || "",
    birth_place: placeFromPerson(person.birth_place, person.birth_lat, person.birth_lng),
    death_place: placeFromPerson(person.death_place, person.death_lat, person.death_lng),
    burial_place: placeFromPerson(person.burial_place, person.burial_lat, person.burial_lng),
  };
  const lifeStatus = deriveLifeStatus(person);
  const altNames = (person.alt_names || []).map((n) => ({
    name_type: n.name_type || "aka",
    first_name: n.first_name || "",
    last_name: n.last_name || "",
    middle_name: n.middle_name || "",
  }));
  return { form, lifeStatus, altNames };
}

function serializeState(form, lifeStatus, altNames) {
  const deceased = lifeStatus === "deceased";
  const birth = normalizePlaceCoords(form.birth_place);
  const death = deceased ? normalizePlaceCoords(form.death_place) : emptyPlace();
  const burial = deceased ? normalizePlaceCoords(form.burial_place) : emptyPlace();
  return JSON.stringify({
    form: {
      ...form,
      birth_date: normalizePartialDate(form.birth_date) || "",
      death_date: deceased ? normalizePartialDate(form.death_date) || "" : "",
      birth_place: birth,
      death_place: death,
      burial_place: burial,
    },
    lifeStatus,
    altNames: altNames.map((n) => ({
      name_type: n.name_type || "aka",
      first_name: n.first_name || "",
      last_name: n.last_name || "",
      middle_name: n.middle_name || "",
    })),
  });
}

export default function PersonFullscreenCard({
  person,
  canEdit,
  onClose,
  onSave,
  onDelete,
  onAddRelative,
  onUploadPhoto,
  onCreateMemorial,
  isSaving = false,
  isCreatingMemorial = false,
}) {
  const [form, setForm] = useState(null);
  const [lifeStatus, setLifeStatus] = useState("unknown");
  const [error, setError] = useState("");
  const [altNames, setAltNames] = useState([]);
  const [showMemorialOffer, setShowMemorialOffer] = useState(false);
  const baselineRef = useRef("");
  const overlayPressStarted = useRef(false);
  const personIdRef = useRef(null);

  useEffect(() => {
    if (!person) {
      setForm(null);
      baselineRef.current = "";
      personIdRef.current = null;
      setShowMemorialOffer(false);
      return;
    }
    const snap = snapshotFromPerson(person);
    setForm(snap.form);
    setLifeStatus(snap.lifeStatus);
    setAltNames(snap.altNames);
    baselineRef.current = serializeState(snap.form, snap.lifeStatus, snap.altNames);
    setError("");
    if (personIdRef.current !== person.id) {
      personIdRef.current = person.id;
      setShowMemorialOffer(false);
    }
    if (person.memorial_card_id || person.has_memorial) {
      setShowMemorialOffer(false);
    }
  }, [person]);

  const isDirty = useMemo(() => {
    if (!form) return false;
    return serializeState(form, lifeStatus, altNames) !== baselineRef.current;
  }, [form, lifeStatus, altNames]);

  const requestClose = () => {
    if (canEdit && isDirty) {
      if (!window.confirm("Есть несохранённые изменения. Закрыть без сохранения?")) return;
    }
    onClose?.();
  };

  useEffect(() => {
    if (!person) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [person, canEdit, isDirty]);

  if (!person || !form) return null;

  const isDeceased = lifeStatus === "deceased";
  const statusLabels = lifeStatusLabels(form.gender);

  const hasMemorial = Boolean(person.memorial_card_id || person.has_memorial);
  const memorialId = person.memorial_card_id;

  const setName = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: sanitizePersonNameInput(value) }));
  };

  const setStatus = (next) => {
    setLifeStatus(next);
    if (next !== "deceased") {
      setForm((prev) => ({
        ...prev,
        death_date: "",
        death_place: emptyPlace(),
        burial_place: emptyPlace(),
      }));
    }
  };

  const onDeathDateChange = (next) => {
    setForm({ ...form, death_date: next });
    if (normalizePartialDate(next)) {
      setLifeStatus("deceased");
    }
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
    const birth = normalizePartialDate(form.birth_date) || null;
    const death = isDeceased ? normalizePartialDate(form.death_date) || null : null;
    const status = death ? "deceased" : lifeStatus;
    const birthPlace = normalizePlaceCoords(form.birth_place);
    const deathPlace =
      status === "deceased" ? normalizePlaceCoords(form.death_place) : emptyPlace();
    const burialPlace =
      status === "deceased" ? normalizePlaceCoords(form.burial_place) : emptyPlace();
    const ok = await onSave?.({
      first_name: form.first_name,
      last_name: form.last_name,
      middle_name: form.middle_name,
      gender: form.gender,
      birth_date: birth,
      death_date: death,
      birth_place: birthPlace.address || null,
      birth_lat: birthPlace.latitude,
      birth_lng: birthPlace.longitude,
      death_place: status === "deceased" ? deathPlace.address || null : null,
      death_lat: status === "deceased" ? deathPlace.latitude : null,
      death_lng: status === "deceased" ? deathPlace.longitude : null,
      burial_place: status === "deceased" ? burialPlace.address || null : null,
      burial_lat: status === "deceased" ? burialPlace.latitude : null,
      burial_lng: status === "deceased" ? burialPlace.longitude : null,
      life_status: status,
      is_deceased: status === "deceased",
      alt_names: altNames.filter((n) => n.first_name || n.last_name || n.middle_name),
    });
    if (ok !== false) {
      baselineRef.current = serializeState(form, status, altNames);
      setLifeStatus(status);
      if (!hasMemorial) setShowMemorialOffer(true);
    }
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

  const handleOverlayMouseDown = (e) => {
    overlayPressStarted.current = e.target === e.currentTarget;
  };

  const handleOverlayMouseUp = (e) => {
    if (overlayPressStarted.current && e.target === e.currentTarget) {
      requestClose();
    }
    overlayPressStarted.current = false;
  };

  return (
    <div
      className="person-fs-overlay"
      role="dialog"
      aria-modal="true"
      onMouseDown={handleOverlayMouseDown}
      onMouseUp={handleOverlayMouseUp}
    >
      <div className="person-fs-card" onClick={(e) => e.stopPropagation()}>
        <div className="person-fs-head">
          <h2>Карточка человека</h2>
          <button type="button" className="btn btn-ghost btn-sm" onClick={requestClose}>
            Закрыть
          </button>
        </div>

        <div className="person-fs-body">
          {showPad ? (
            <section className="person-fs-section">
              <h3 className="person-fs-section-title">Родственники</h3>
              <RelativeAddPad
                person={padPerson}
                onSelect={(option) => onAddRelative?.(option)}
                disabledParent={false}
              />
            </section>
          ) : null}

          <section className="person-fs-section">
            <h3 className="person-fs-section-title">Основные данные</h3>
            <div className="person-fs-photo-block">
              <div className={`person-fs-photo gender-${form.gender || "unknown"}`}>
                {photo ? (
                  <img src={photo} alt="" />
                ) : (
                  <span>
                    {(form.last_name?.[0] || "") + (form.first_name?.[0] || "") || "?"}
                  </span>
                )}
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
                {canEdit ? <p className="person-fs-field-hint">{NAME_HINT}</p> : null}
              </div>
              <div>
                <label className="form-label">Имя</label>
                <input
                  value={form.first_name}
                  disabled={!canEdit}
                  onChange={(e) => setName("first_name", e.target.value)}
                />
                {canEdit ? <p className="person-fs-field-hint">{NAME_HINT}</p> : null}
              </div>
              <div>
                <label className="form-label">Отчество</label>
                <input
                  value={form.middle_name}
                  disabled={!canEdit}
                  onChange={(e) => setName("middle_name", e.target.value)}
                />
                {canEdit ? <p className="person-fs-field-hint">{NAME_HINT}</p> : null}
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
              <PartialDateField
                id="person-birth"
                label="Дата рождения"
                value={form.birth_date}
                disabled={!canEdit}
                onChange={(next) => setForm({ ...form, birth_date: next })}
              />
              <PlaceField
                label="Место рождения"
                idPrefix={`person-${person.id}-birth`}
                compact
                disabled={!canEdit}
                searchPlaceholder="Например: Ирк…"
                value={form.birth_place}
                onChange={(place) => setForm({ ...form, birth_place: place })}
              />
              <div className="tree-death-field">
                <span className="form-label">Статус жизни</span>
                <div className="life-status-group" role="radiogroup" aria-label="Статус жизни">
                  {LIFE_STATUS_OPTIONS.map((opt) => (
                    <label
                      key={opt.id}
                      className={`life-status-option${lifeStatus === opt.id ? " is-active" : ""}`}
                    >
                      <input
                        type="radio"
                        name="life-status"
                        value={opt.id}
                        checked={lifeStatus === opt.id}
                        disabled={!canEdit}
                        onChange={() => setStatus(opt.id)}
                      />
                      <span className={`life-status-marker life-status-marker--${opt.marker}`} aria-hidden="true" />
                      <span>{statusLabels[opt.id] || opt.label}</span>
                    </label>
                  ))}
                </div>
                {isDeceased ? (
                  <>
                    <PartialDateField
                      id="person-death"
                      label="Дата смерти"
                      value={form.death_date}
                      disabled={!canEdit}
                      onChange={onDeathDateChange}
                    />
                    <PlaceField
                      label="Место смерти"
                      idPrefix={`person-${person.id}-death`}
                      compact
                      disabled={!canEdit}
                      searchPlaceholder="Например: Ирк…"
                      value={form.death_place}
                      onChange={(place) => setForm({ ...form, death_place: place })}
                    />
                    <PlaceField
                      label="Место захоронения"
                      idPrefix={`person-${person.id}-burial`}
                      compact
                      disabled={!canEdit}
                      searchPlaceholder="Например: Ирк…"
                      value={form.burial_place}
                      onChange={(place) => setForm({ ...form, burial_place: place })}
                    />
                  </>
                ) : null}
              </div>
            </div>
          </section>

          {hasMemorial ? (
            <section className="person-fs-section">
              <div className="person-fs-memorial person-fs-memorial--ready">
                <h3 className="person-fs-section-title">Страница памяти</h3>
                <p className="person-fs-memorial-status person-fs-memorial-status--ok">
                  <span className="person-fs-memorial-check" aria-hidden="true" />
                  Есть страница памяти
                </p>
                {memorialId ? (
                  <Link
                    className="btn btn-outline btn-sm"
                    to={`/memory/${memorialId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Открыть
                  </Link>
                ) : null}
              </div>
            </section>
          ) : null}

          {canEdit ? (
            <section className="person-fs-section">
              <div className="person-fs-alt-names">
                <div className="person-fs-alt-head">
                  <h3 className="person-fs-section-title">Другие имена / фамилии</h3>
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
                      <option value="birth">При рождении / девичья</option>
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
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm person-fs-alt-remove"
                      onClick={() => setAltNames((prev) => prev.filter((_, i) => i !== index))}
                      aria-label="Удалить другое имя"
                    >
                      Удалить
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {error ? <p className="tree-form-error">{error}</p> : null}

          {canEdit ? (
            <section className="person-fs-section person-fs-section--danger">
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
            </section>
          ) : null}
        </div>

        {canEdit ? (
          <div className="person-fs-actions person-fs-actions--sticky">
            {showMemorialOffer && !hasMemorial ? (
              <div className="person-fs-memorial-offer">
                <p className="person-fs-memorial-offer-title">Карточка сохранена</p>
                <p className="person-fs-memorial-offer-text">
                  Карточка древа содержит только основные сведения. Создайте страницу памяти, чтобы
                  сохранить фотографии, документы и воспоминания.
                </p>
                <div className="person-fs-memorial-offer-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={isCreatingMemorial}
                    onClick={() => onCreateMemorial?.()}
                  >
                    {isCreatingMemorial ? "Создаём..." : "Создать страницу памяти"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setShowMemorialOffer(false)}
                  >
                    Позже
                  </button>
                </div>
              </div>
            ) : null}
            <div className="person-fs-actions-row">
              <button type="button" className="btn btn-primary" onClick={save} disabled={isSaving}>
                {isSaving ? "Сохраняем..." : "Сохранить"}
              </button>
              <button type="button" className="btn btn-ghost" onClick={requestClose}>
                Отмена
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
