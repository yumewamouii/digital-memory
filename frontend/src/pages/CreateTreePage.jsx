import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHero from "../components/PageHero";
import PartialDateField from "../components/tree/PartialDateField";
import {
  createGuestTree,
  createPerson,
  createTree,
  importGedcom,
} from "../api/trees";
import { useAuth } from "../context/AuthContext";
import {
  GENDER_OPTIONS,
  LIFE_STATUS_OPTIONS,
  isValidPersonName,
  normalizePartialDate,
  sanitizePersonNameInput,
} from "../utils/treeRelations";
import { formatApiError } from "../utils/apiErrors";

const GUEST_PERSON_LIMIT = 6;
const NAME_HINT = "Одно слово, дефис допустим";

function lifeStatusLabels(gender) {
  if (gender === "female") {
    return { unknown: "Неизвестно", alive: "Жива", deceased: "Умерла" };
  }
  if (gender === "male") {
    return { unknown: "Неизвестно", alive: "Жив", deceased: "Умер" };
  }
  return { unknown: "Неизвестно", alive: "Жив(а)", deceased: "Умер(ла)" };
}

export default function CreateTreePage() {
  const { token, authHeaders, openAuthModal, setMessage } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [step, setStep] = useState("method");
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [title, setTitle] = useState("Семейное древо");
  const [person, setPerson] = useState({
    last_name: "",
    first_name: "",
    middle_name: "",
    gender: "",
    birth_date: "",
    death_date: "",
  });
  const [lifeStatus, setLifeStatus] = useState("unknown");

  const headers = token ? authHeaders : {};
  const isDeceased = lifeStatus === "deceased";
  const statusLabels = lifeStatusLabels(person.gender);

  const goEditor = (treeId) => navigate(`/family-tree/${treeId}/edit`);

  const setStatus = (next) => {
    setLifeStatus(next);
    if (next !== "deceased") {
      setPerson((prev) => ({ ...prev, death_date: "" }));
    }
  };

  const onDeathDateChange = (next) => {
    setPerson({ ...person, death_date: next });
    if (normalizePartialDate(next)) {
      setLifeStatus("deceased");
    }
  };

  const startBlank = async () => {
    setBusy(true);
    try {
      if (!person.first_name.trim() && !person.last_name.trim()) {
        setMessage("Укажите имя или фамилию первого человека");
        setBusy(false);
        return;
      }
      for (const [label, value] of [
        ["Фамилия", person.last_name],
        ["Имя", person.first_name],
        ["Отчество", person.middle_name],
      ]) {
        if (!isValidPersonName(value, { allowEmpty: true })) {
          setMessage(`${label} — одно слово без пробелов`);
          setBusy(false);
          return;
        }
      }
      const birth = normalizePartialDate(person.birth_date) || null;
      const death = isDeceased ? normalizePartialDate(person.death_date) || null : null;
      const status = death ? "deceased" : lifeStatus;
      const tree = token
        ? await createTree({ title: title.trim() || "Семейное древо" }, headers)
        : await createGuestTree({ title: title.trim() || "Семейное древо" });
      await createPerson(
        tree.id,
        {
          ...person,
          birth_date: birth,
          death_date: death,
          life_status: status,
          is_deceased: status === "deceased",
        },
        headers,
      );
      setMessage(token ? "Древо создано" : "Древо создано как гостевое (до 6 карточек)");
      goEditor(tree.id);
    } catch (err) {
      setMessage(formatApiError(err?.response?.data?.detail, "Не удалось создать древо"));
    } finally {
      setBusy(false);
    }
  };

  const onGedcom = async (file) => {
    if (!file) return;
    setImporting(true);
    setBusy(true);
    try {
      const tree = await importGedcom(file, headers);
      setMessage(
        `Импортировано: ${tree.import_report?.persons_imported || 0} чел.`,
      );
      goEditor(tree.id);
    } catch (err) {
      setMessage(
        formatApiError(err?.response?.data?.detail, "Не удалось импортировать файл родословной"),
      );
    } finally {
      setBusy(false);
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <>
      <PageHero
        className="page-hero--compact"
        title="Создание семейного древа"
      />
      <section className="section section--tree">
        <div className="section-inner tree-editor-page">
          {step === "method" ? (
            <div className="tree-wizard">
              <button
                type="button"
                className="btn btn-primary tree-wizard-action"
                disabled={busy}
                onClick={() => setStep("first")}
              >
                Создать древо с нуля
              </button>
              <button
                type="button"
                className="btn btn-secondary tree-wizard-action"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
              >
                {importing ? "Импортируем…" : "Импортировать файл родословной (.ged)"}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".ged,.gedcom,text/plain"
                hidden
                onChange={(e) => onGedcom(e.target.files?.[0])}
              />
              {!token ? (
                <p className="hint-text">
                  Без аккаунта можно создать до {GUEST_PERSON_LIMIT} карточек.{" "}
                  <button type="button" className="text-link" onClick={() => openAuthModal(false)}>
                    Войдите
                  </button>
                  , чтобы сохранить древо в кабинете и снять лимит.
                </p>
              ) : null}
            </div>
          ) : (
            <div className="tree-wizard-form form-panel">
              <h2>Первая карточка</h2>
              {!token ? (
                <p className="hint-text tree-wizard-guest-hint">
                  Гостевой режим: до {GUEST_PERSON_LIMIT} карточек. После регистрации древо можно
                  закрепить за аккаунтом.
                </p>
              ) : null}
              <div className="form-grid">
                <div>
                  <label className="form-label">Название древа</label>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={busy} />
                </div>
                <div>
                  <label className="form-label">Фамилия</label>
                  <input
                    value={person.last_name}
                    disabled={busy}
                    onChange={(e) =>
                      setPerson({ ...person, last_name: sanitizePersonNameInput(e.target.value) })
                    }
                  />
                  <p className="person-fs-field-hint">{NAME_HINT}</p>
                </div>
                <div>
                  <label className="form-label">Имя</label>
                  <input
                    value={person.first_name}
                    disabled={busy}
                    onChange={(e) =>
                      setPerson({ ...person, first_name: sanitizePersonNameInput(e.target.value) })
                    }
                  />
                  <p className="person-fs-field-hint">{NAME_HINT}</p>
                </div>
                <div>
                  <label className="form-label">Отчество</label>
                  <input
                    value={person.middle_name}
                    disabled={busy}
                    onChange={(e) =>
                      setPerson({ ...person, middle_name: sanitizePersonNameInput(e.target.value) })
                    }
                  />
                  <p className="person-fs-field-hint">{NAME_HINT}</p>
                </div>
                <div>
                  <label className="form-label">Пол</label>
                  <select
                    value={person.gender}
                    disabled={busy}
                    onChange={(e) => setPerson({ ...person, gender: e.target.value })}
                  >
                    {GENDER_OPTIONS.map((item) => (
                      <option key={item.id || "u"} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
                <PartialDateField
                  id="first-birth"
                  label="Дата рождения"
                  value={person.birth_date}
                  disabled={busy}
                  onChange={(next) => setPerson({ ...person, birth_date: next })}
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
                          name="create-life-status"
                          value={opt.id}
                          checked={lifeStatus === opt.id}
                          disabled={busy}
                          onChange={() => setStatus(opt.id)}
                        />
                        <span className={`life-status-marker life-status-marker--${opt.marker}`} aria-hidden="true" />
                        <span>{statusLabels[opt.id] || opt.label}</span>
                      </label>
                    ))}
                  </div>
                  {isDeceased ? (
                    <PartialDateField
                      id="first-death"
                      label="Дата смерти"
                      value={person.death_date}
                      disabled={busy}
                      onChange={onDeathDateChange}
                    />
                  ) : null}
                </div>
              </div>
              <div className="hero-actions" style={{ justifyContent: "flex-start", marginTop: "1rem" }}>
                <button type="button" className="btn btn-primary" disabled={busy} onClick={startBlank}>
                  {busy ? "Создаём..." : "Создать древо"}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={busy}
                  onClick={() => setStep("method")}
                >
                  Назад
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
