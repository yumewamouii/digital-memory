import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHero from "../components/PageHero";
import {
  createGuestTree,
  createPerson,
  createTree,
  importGedcom,
} from "../api/trees";
import { useAuth } from "../context/AuthContext";
import {
  GENDER_OPTIONS,
  isValidPersonName,
  sanitizePersonNameInput,
} from "../utils/treeRelations";

export default function CreateTreePage() {
  const { token, authHeaders, openAuthModal, setMessage } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [step, setStep] = useState("method");
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("Семейное древо");
  const [person, setPerson] = useState({
    last_name: "",
    first_name: "",
    middle_name: "",
    gender: "",
    birth_date: "",
  });

  const headers = token ? authHeaders : {};

  const goEditor = (treeId) => navigate(`/family-tree/${treeId}/edit`);

  const startBlank = async () => {
    setBusy(true);
    try {
      const tree = token
        ? await createTree({ title: title.trim() || "Семейное древо" }, headers)
        : await createGuestTree({ title: title.trim() || "Семейное древо" });
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
      await createPerson(
        tree.id,
        {
          ...person,
          birth_date: person.birth_date || null,
        },
        headers,
      );
      setMessage(token ? "Древо создано" : "Древо создано как гостевое (до 6 карточек)");
      goEditor(tree.id);
    } catch (err) {
      setMessage(err?.response?.data?.detail || "Не удалось создать древо");
    } finally {
      setBusy(false);
    }
  };

  const onGedcom = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const tree = await importGedcom(file, headers);
      setMessage(
        `Импортировано: ${tree.import_report?.persons_imported || 0} чел.`,
      );
      goEditor(tree.id);
    } catch (err) {
      setMessage(err?.response?.data?.detail || "Не удалось импортировать файл родословной");
    } finally {
      setBusy(false);
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
                Импортировать файл родословной (.ged)
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
                  Уже есть аккаунт?{" "}
                  <button type="button" className="text-link" onClick={() => openAuthModal(false)}>
                    Войдите
                  </button>
                  , чтобы сохранить древо в кабинете.
                </p>
              ) : null}
            </div>
          ) : (
            <div className="tree-wizard-form form-panel">
              <h2>Первая карточка</h2>
              <div className="form-grid">
                <div>
                  <label className="form-label">Название древа</label>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Фамилия</label>
                  <input
                    value={person.last_name}
                    onChange={(e) =>
                      setPerson({ ...person, last_name: sanitizePersonNameInput(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <label className="form-label">Имя</label>
                  <input
                    value={person.first_name}
                    onChange={(e) =>
                      setPerson({ ...person, first_name: sanitizePersonNameInput(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <label className="form-label">Отчество</label>
                  <input
                    value={person.middle_name}
                    onChange={(e) =>
                      setPerson({ ...person, middle_name: sanitizePersonNameInput(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <label className="form-label">Пол</label>
                  <select
                    value={person.gender}
                    onChange={(e) => setPerson({ ...person, gender: e.target.value })}
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
                    value={person.birth_date}
                    onChange={(e) => setPerson({ ...person, birth_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="hero-actions" style={{ justifyContent: "flex-start", marginTop: "1rem" }}>
                <button type="button" className="btn btn-primary" disabled={busy} onClick={startBlank}>
                  {busy ? "Создаём..." : "Создать древо"}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setStep("method")}>
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
