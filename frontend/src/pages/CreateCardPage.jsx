import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  addMemorialVideoLink,
  createMemorial,
  uploadMemorialAudio,
  uploadMemorialDocument,
  uploadMemorialGalleryImage,
  uploadMemorialPhoto,
  uploadMemorialVideo,
} from "../api/memorials";
import PlaceField, { emptyPlace } from "../components/PlaceField";
import PageHero from "../components/PageHero";
import { useAuth } from "../context/AuthContext";
import { LIFE_STATUS_OPTIONS } from "../utils/treeRelations";

const MEMORIAL_LIFE_STATUS_LABELS = {
  unknown: "Неизвестно",
  alive: "Жив(а)",
  deceased: "Умер(ла)",
};

const CAPABILITIES_CORE = ["Фото", "Видео", "Документы"];
const CAPABILITIES_EXTRA = ["QR-код", "Приватный доступ", "Место захоронения"];

const CONSTRUCTOR_STEPS = [
  { id: "basics", title: "Основные сведения" },
  { id: "biography", title: "Биография" },
  { id: "photos", title: "Фотографии" },
  { id: "videos", title: "Видео" },
  { id: "documents", title: "Документы" },
  { id: "settings", title: "Настройки" },
];

const DOC_CATEGORIES = [
  { id: "diploma", label: "Диплом" },
  { id: "military", label: "Военный билет" },
  { id: "letter", label: "Письма" },
  { id: "award", label: "Награды" },
  { id: "other", label: "Другое" },
];

const GALLERY_PLACEHOLDER_COUNT = 8;

function isRutubeOrVkVideoUrl(raw) {
  const value = (raw || "").trim();
  if (!value) return false;
  try {
    const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    const host = new URL(withProtocol).hostname.toLowerCase().replace(/^www\./, "");
    if (host === "rutube.ru" || host.endsWith(".rutube.ru")) {
      return /\/(?:video|play\/embed)\//i.test(withProtocol);
    }
    if (
      host === "vk.com" ||
      host.endsWith(".vk.com") ||
      host === "vk.ru" ||
      host.endsWith(".vk.ru") ||
      host === "vkvideo.ru" ||
      host.endsWith(".vkvideo.ru")
    ) {
      return /video-?\d+_\d+/i.test(withProtocol);
    }
    return false;
  } catch {
    return false;
  }
}

const pagePlans = [
  {
    id: "brief",
    title: "Базовая страница памяти",
    badge: "Бесплатно",
    price: "Бесплатно",
    subtitle: "Содержит всю основную информацию о человеке и подходит для сохранения памяти.",
    exampleLabel: "Посмотреть пример",
    exampleTo: "/memory/example/brief",
    features: [
      "Портрет",
      "Основные сведения",
      "Эпитафия",
      "Родственники",
      "QR-код для печати",
      "Настройки приватности",
    ],
  },
  {
    id: "extended",
    title: "Полная страница памяти",
    badge: "Полная история",
    price: "5000 ₽ разово",
    featured: true,
    subtitle: "Для тех, кто хочет сохранить полную историю жизни человека.",
    exampleLabel: "Посмотреть пример",
    exampleTo: "/memory/example/extended",
    features: [
      "Всё из базовой страницы",
      "Подробная биография",
      "Неограниченная фотогалерея",
      "Видео и аудиозаписи",
      "Документы и награды",
      "Генеалогическое древо и места захоронения",
    ],
  },
];

function makeEmptyForm() {
  return {
    first_name: "",
    last_name: "",
    middle_name: "",
    birth_date: "",
    death_date: "",
    life_status: "unknown",
    birth_place: emptyPlace(),
    death_place: emptyPlace(),
    photoFile: null,
    photoPreview: "",
    epitaph: "",
    biography: "",
    visibility: "unlisted",
    family_links: "",
    galleryFiles: [],
    videos: [],
    audioFiles: [],
    documents: [],
    cemetery_name: "",
    cemetery_place: emptyPlace(),
    links: [{ label: "", url: "" }],
    guestbook_enabled: true,
    metal_plaque: false,
  };
}

function makeLocalId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function FormSection({ id, step, title, hint, done = false, children }) {
  return (
    <section
      className={`memorial-form-section${done ? " is-done" : ""}`}
      id={id || undefined}
    >
      <header className="memorial-form-section-head">
        <div className="memorial-form-section-title-row">
          {step != null ? (
            <span className={`memorial-form-step-badge${done ? " is-done" : ""}`} aria-hidden="true">
              {done ? "✓" : step}
            </span>
          ) : null}
          <h2>{title}</h2>
          {done ? <span className="memorial-form-section-done-label">Заполнено</span> : null}
        </div>
        {hint ? <p className="memorial-form-section-hint">{hint}</p> : null}
      </header>
      <div className="memorial-form-section-body">{children}</div>
    </section>
  );
}

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function CreateCardPage() {
  const { token, authHeaders, openAuthModal, setMessage } = useAuth();
  const [searchParams] = useSearchParams();
  const fromTree = useMemo(() => {
    const raw = searchParams.get("fromTree") || searchParams.get("from_tree");
    return raw === "1" || raw === "true";
  }, [searchParams]);

  const [step, setStep] = useState("plan");
  const [plan, setPlan] = useState(null);
  const [cardForm, setCardForm] = useState(makeEmptyForm);
  const [saved, setSaved] = useState(false);
  const [savedId, setSavedId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const updateField = (field, value) => {
    setCardForm((prev) => ({ ...prev, [field]: value }));
  };

  const setLifeStatus = (status) => {
    setCardForm((prev) => {
      if (status === "deceased") {
        return { ...prev, life_status: status };
      }
      return {
        ...prev,
        life_status: status,
        death_date: "",
        death_place: emptyPlace(),
        cemetery_name: "",
        cemetery_place: emptyPlace(),
      };
    });
  };

  const onDeathDateChange = (value) => {
    setCardForm((prev) => ({
      ...prev,
      death_date: value,
      life_status: value ? "deceased" : prev.life_status,
    }));
  };

  const selectPlan = (planId) => {
    setPlan(planId);
    setStep("form");
    setSaved(false);
    setSavedId(null);
  };

  const backToPlans = () => {
    setStep("plan");
    setPlan(null);
  };

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const onPortraitChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (cardForm.photoPreview) URL.revokeObjectURL(cardForm.photoPreview);
    updateField("photoFile", file);
    updateField("photoPreview", URL.createObjectURL(file));
  };

  const clearPortrait = () => {
    if (cardForm.photoPreview) URL.revokeObjectURL(cardForm.photoPreview);
    updateField("photoFile", null);
    updateField("photoPreview", "");
  };

  const onGalleryChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const next = files.map((file) => ({
      id: makeLocalId(),
      file,
      preview: URL.createObjectURL(file),
    }));
    setCardForm((prev) => ({
      ...prev,
      galleryFiles: [...prev.galleryFiles, ...next],
    }));
    e.target.value = "";
  };

  const removeGalleryItem = (id) => {
    setCardForm((prev) => {
      const item = prev.galleryFiles.find((g) => g.id === id);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return {
        ...prev,
        galleryFiles: prev.galleryFiles.filter((g) => g.id !== id),
      };
    });
  };

  const addVideoLinkDraft = () => {
    setCardForm((prev) => ({
      ...prev,
      videos: [
        ...prev.videos,
        {
          id: makeLocalId(),
          kind: "link",
          title: "",
          url: "",
          urlError: "",
          file: null,
          fileName: "",
        },
      ],
    }));
  };

  const onVideoFilesChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const next = files.map((file) => ({
      id: makeLocalId(),
      kind: "file",
      title: file.name.replace(/\.[^.]+$/, ""),
      url: "",
      urlError: "",
      file,
      fileName: file.name,
    }));
    setCardForm((prev) => ({
      ...prev,
      videos: [...prev.videos, ...next],
    }));
    e.target.value = "";
  };

  const updateVideoDraft = (id, patch) => {
    setCardForm((prev) => ({
      ...prev,
      videos: prev.videos.map((v) => (v.id === id ? { ...v, ...patch } : v)),
    }));
  };

  const onVideoUrlChange = (id, url) => {
    const trimmed = url.trim();
    let urlError = "";
    if (trimmed && !isRutubeOrVkVideoUrl(trimmed)) {
      urlError = "Укажите ссылку на Rutube или VK Видео";
    }
    updateVideoDraft(id, { url, urlError });
  };

  const removeVideoDraft = (id) => {
    setCardForm((prev) => ({
      ...prev,
      videos: prev.videos.filter((v) => v.id !== id),
    }));
  };

  const onAudioFilesChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const next = files.map((file) => ({
      id: makeLocalId(),
      file,
      title: file.name.replace(/\.[^.]+$/, ""),
      fileName: file.name,
    }));
    setCardForm((prev) => ({
      ...prev,
      audioFiles: [...prev.audioFiles, ...next],
    }));
    e.target.value = "";
  };

  const updateAudioDraft = (id, patch) => {
    setCardForm((prev) => ({
      ...prev,
      audioFiles: prev.audioFiles.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    }));
  };

  const removeAudioDraft = (id) => {
    setCardForm((prev) => ({
      ...prev,
      audioFiles: prev.audioFiles.filter((a) => a.id !== id),
    }));
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setMessage("Запись с микрофона недоступна в этом браузере — загрузите файл");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blobType = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: blobType });
        const ext = blobType.includes("mp4") ? "m4a" : "webm";
        const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: blobType });
        setCardForm((prev) => ({
          ...prev,
          audioFiles: [
            ...prev.audioFiles,
            {
              id: makeLocalId(),
              file,
              title: "Запись голоса",
              fileName: file.name,
            },
          ],
        }));
        setRecording(false);
        mediaRecorderRef.current = null;
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setMessage("Не удалось получить доступ к микрофону");
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  };

  const onDocumentsChange = (e, category = "other") => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const next = files.map((file) => ({
      id: makeLocalId(),
      file,
      title: file.name.replace(/\.[^.]+$/, ""),
      category,
      fileName: file.name,
    }));
    setCardForm((prev) => ({
      ...prev,
      documents: [...prev.documents, ...next],
    }));
    e.target.value = "";
  };

  const updateDocumentDraft = (id, patch) => {
    setCardForm((prev) => ({
      ...prev,
      documents: prev.documents.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    }));
  };

  const removeDocumentDraft = (id) => {
    setCardForm((prev) => ({
      ...prev,
      documents: prev.documents.filter((d) => d.id !== id),
    }));
  };

  const updateLink = (index, field, value) => {
    setCardForm((prev) => ({
      ...prev,
      links: prev.links.map((link, i) => (i === index ? { ...link, [field]: value } : link)),
    }));
  };

  const addLinkRow = () => {
    setCardForm((prev) => ({
      ...prev,
      links: [...prev.links, { label: "", url: "" }],
    }));
  };

  const removeLinkRow = (index) => {
    setCardForm((prev) => ({
      ...prev,
      links:
        prev.links.length <= 1 ? [{ label: "", url: "" }] : prev.links.filter((_, i) => i !== index),
    }));
  };

  const createCard = async () => {
    if (!cardForm.first_name.trim() || !cardForm.last_name.trim()) {
      setMessage("Укажите имя и фамилию");
      return;
    }

    if (plan === "extended") {
      const invalidLinks = cardForm.videos.filter(
        (v) => v.kind === "link" && v.url.trim() && !isRutubeOrVkVideoUrl(v.url),
      );
      if (invalidLinks.length) {
        setCardForm((prev) => ({
          ...prev,
          videos: prev.videos.map((v) =>
            v.kind === "link" && v.url.trim() && !isRutubeOrVkVideoUrl(v.url)
              ? { ...v, urlError: "Укажите ссылку на Rutube или VK Видео" }
              : v,
          ),
        }));
        setMessage("Проверьте ссылки на видео: только Rutube или VK Видео");
        return;
      }
      const emptyLinks = cardForm.videos.filter((v) => v.kind === "link" && !v.url.trim());
      if (emptyLinks.length) {
        setMessage("Заполните ссылку на видео или удалите пустую строку");
        return;
      }
    }

    const relativesText =
      !fromTree && cardForm.family_links.trim() ? cardForm.family_links.trim() : null;

    const externalLinks =
      plan === "extended"
        ? cardForm.links
            .map((l) => ({
              label: l.label.trim(),
              url: l.url.trim(),
            }))
            .filter((l) => l.label && l.url)
        : [];

    const isDeceased =
      cardForm.life_status === "deceased" || Boolean(cardForm.death_date);
    const lifeStatus = isDeceased ? "deceased" : cardForm.life_status || "unknown";

    const payload = {
      first_name: cardForm.first_name.trim(),
      last_name: cardForm.last_name.trim(),
      middle_name: cardForm.middle_name.trim() || null,
      birth_date: cardForm.birth_date || null,
      death_date: isDeceased ? cardForm.death_date || null : null,
      birth_place: cardForm.birth_place.address.trim() || null,
      birth_lat: cardForm.birth_place.latitude,
      birth_lng: cardForm.birth_place.longitude,
      death_place: isDeceased ? cardForm.death_place.address.trim() || null : null,
      death_lat: isDeceased ? cardForm.death_place.latitude : null,
      death_lng: isDeceased ? cardForm.death_place.longitude : null,
      life_status: lifeStatus,
      epitaph: cardForm.epitaph.trim() || null,
      relatives_text: relativesText,
      biography: plan === "extended" && cardForm.biography.trim() ? cardForm.biography.trim() : null,
      page_kind: plan === "extended" ? "extended" : "brief",
      guestbook_enabled: plan === "extended" ? cardForm.guestbook_enabled : false,
      metal_plaque: plan === "extended" ? cardForm.metal_plaque : false,
      external_links: externalLinks,
      cemetery_name: isDeceased && cardForm.cemetery_name.trim()
        ? cardForm.cemetery_name.trim()
        : null,
      cemetery_location:
        isDeceased && cardForm.cemetery_place.address.trim()
          ? cardForm.cemetery_place.address.trim()
          : null,
      cemetery_lat: isDeceased ? cardForm.cemetery_place.latitude : null,
      cemetery_lng: isDeceased ? cardForm.cemetery_place.longitude : null,
      visibility: cardForm.visibility || "unlisted",
    };

    try {
      setIsSubmitting(true);
      let card = await createMemorial(payload, authHeaders);
      if (cardForm.photoFile) {
        card = await uploadMemorialPhoto(card.id, cardForm.photoFile, authHeaders);
      }

      if (plan === "extended") {
        for (const item of cardForm.galleryFiles) {
          await uploadMemorialGalleryImage(card.id, item.file, authHeaders);
        }
        for (const video of cardForm.videos) {
          const title = video.title.trim() || null;
          if (video.kind === "file" && video.file) {
            await uploadMemorialVideo(card.id, video.file, authHeaders, { title });
          } else if (video.kind === "link" && video.url.trim()) {
            await addMemorialVideoLink(
              card.id,
              { url: video.url.trim(), title },
              authHeaders,
            );
          }
        }
        for (const clip of cardForm.audioFiles) {
          if (!clip.file) continue;
          await uploadMemorialAudio(card.id, clip.file, authHeaders, {
            title: clip.title.trim() || null,
          });
        }
        for (const doc of cardForm.documents) {
          if (!doc.file) continue;
          await uploadMemorialDocument(card.id, doc.file, authHeaders, {
            title: doc.title.trim() || null,
            category: doc.category || "other",
          });
        }
      }

      cardForm.galleryFiles.forEach((g) => {
        if (g.preview) URL.revokeObjectURL(g.preview);
      });
      if (cardForm.photoPreview) URL.revokeObjectURL(cardForm.photoPreview);
      setCardForm(makeEmptyForm());
      setSaved(true);
      setSavedId(card.id);
      setMessage("Карточка памяти создана");
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (Array.isArray(detail) && detail.length) {
        const first = detail[0];
        const fieldHint = first.field ? `Поле «${first.field}»: ` : "";
        setMessage(`${fieldHint}${first.message || "Проверьте данные формы"}`);
      } else if (typeof detail === "string") {
        setMessage(detail);
      } else {
        setMessage("Не удалось создать карточку. Попробуйте еще раз.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const gallerySlots = Math.max(
    GALLERY_PLACEHOLDER_COUNT,
    cardForm.galleryFiles.length + 1,
  );

  const isDeceased = cardForm.life_status === "deceased";

  const sectionDone = useMemo(() => {
    const hasName = Boolean(cardForm.first_name.trim() && cardForm.last_name.trim());
    return {
      basics: hasName,
      biography: Boolean(cardForm.biography.trim()),
      photos: Boolean(cardForm.galleryFiles.length || cardForm.photoFile),
      videos: Boolean(cardForm.videos.length || cardForm.audioFiles.length),
      documents: Boolean(cardForm.documents.length),
      settings: Boolean(
        cardForm.birth_place.address.trim() ||
          cardForm.family_links.trim() ||
          cardForm.visibility !== "unlisted" ||
          cardForm.metal_plaque ||
          cardForm.life_status !== "unknown",
      ),
    };
  }, [cardForm]);

  const constructorProgress = useMemo(() => {
    const doneCount = CONSTRUCTOR_STEPS.filter((s) => sectionDone[s.id]).length;
    const percent = Math.round((doneCount / CONSTRUCTOR_STEPS.length) * 100);
    const firstOpen = CONSTRUCTOR_STEPS.findIndex((s) => !sectionDone[s.id]);
    const currentStep = firstOpen === -1 ? CONSTRUCTOR_STEPS.length : firstOpen + 1;
    return { doneCount, percent, currentStep };
  }, [sectionDone]);

  const lifeStatusFields = (
    <div className="tree-death-field">
      <span className="form-label">Статус жизни</span>
      <div className="life-status-group" role="radiogroup" aria-label="Статус жизни">
        {LIFE_STATUS_OPTIONS.map((opt) => (
          <label
            key={opt.id}
            className={`life-status-option${cardForm.life_status === opt.id ? " is-active" : ""}`}
          >
            <input
              type="radio"
              name="memorial-life-status"
              value={opt.id}
              checked={cardForm.life_status === opt.id}
              onChange={() => setLifeStatus(opt.id)}
            />
            <span
              className={`life-status-marker life-status-marker--${opt.marker}`}
              aria-hidden="true"
            />
            <span>{MEMORIAL_LIFE_STATUS_LABELS[opt.id] || opt.label}</span>
          </label>
        ))}
      </div>
      {isDeceased ? (
        <>
          <div>
            <label className="form-label" htmlFor="card-death">
              Дата смерти
            </label>
            <input
              id="card-death"
              type="date"
              value={cardForm.death_date}
              onChange={(e) => onDeathDateChange(e.target.value)}
            />
          </div>
          <PlaceField
            label="Место смерти"
            idPrefix="card-death-place"
            searchPlaceholder="Например: Ирк…"
            value={cardForm.death_place}
            onChange={(place) => updateField("death_place", place)}
          />
          <div>
            <label className="form-label" htmlFor="card-cemetery-name">
              Название кладбища / места
            </label>
            <input
              id="card-cemetery-name"
              value={cardForm.cemetery_name}
              onChange={(e) => updateField("cemetery_name", e.target.value)}
              placeholder="Например: Новодевичье кладбище"
            />
          </div>
          <PlaceField
            label="Место захоронения"
            idPrefix="card-cemetery-place"
            searchPlaceholder="Адрес или ориентир"
            value={cardForm.cemetery_place}
            onChange={(place) => updateField("cemetery_place", place)}
          />
        </>
      ) : null}
    </div>
  );

  const briefBasics = (
    <div className="form-grid">
      <div className="memorial-portrait-field">
        <span className="form-label">Портрет</span>
        <div className="memorial-portrait-row">
          <div className={`memorial-portrait-preview${cardForm.photoPreview ? " has-photo" : ""}`}>
            {cardForm.photoPreview ? <img src={cardForm.photoPreview} alt="" /> : <span>Нет фото</span>}
          </div>
          <div className="memorial-portrait-actions">
            <label className="btn btn-outline btn-sm">
              Загрузить фото
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                hidden
                onChange={onPortraitChange}
              />
            </label>
            {cardForm.photoPreview ? (
              <button type="button" className="btn btn-ghost btn-sm" onClick={clearPortrait}>
                Убрать
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div>
        <label className="form-label" htmlFor="card-last-name">
          Фамилия
        </label>
        <input
          id="card-last-name"
          value={cardForm.last_name}
          onChange={(e) => updateField("last_name", e.target.value)}
        />
      </div>
      <div>
        <label className="form-label" htmlFor="card-first-name">
          Имя
        </label>
        <input
          id="card-first-name"
          value={cardForm.first_name}
          onChange={(e) => updateField("first_name", e.target.value)}
        />
      </div>
      <div>
        <label className="form-label" htmlFor="card-middle-name">
          Отчество
        </label>
        <input
          id="card-middle-name"
          value={cardForm.middle_name}
          onChange={(e) => updateField("middle_name", e.target.value)}
        />
      </div>
      <div>
        <label className="form-label" htmlFor="card-birth">
          Дата рождения
        </label>
        <input
          id="card-birth"
          type="date"
          value={cardForm.birth_date}
          onChange={(e) => updateField("birth_date", e.target.value)}
        />
      </div>
      {lifeStatusFields}
      <div>
        <label className="form-label" htmlFor="card-epitaph">
          Эпитафия
        </label>
        <textarea
          id="card-epitaph"
          rows={3}
          placeholder="Краткое прощальное слово или цитата"
          value={cardForm.epitaph}
          onChange={(e) => updateField("epitaph", e.target.value)}
        />
      </div>
    </div>
  );

  return (
    <>
      <PageHero
        title="Создание страницы памяти"
        subtitle={
          step === "plan"
            ? "Выберите формат страницы, который подходит именно вам."
            : plan === "extended"
              ? "Соберите полноценную страницу памяти."
              : "Заполните данные базовой страницы памяти."
        }
      />

      <section className="section">
        <div className={`section-inner${step === "plan" ? "" : " narrow"}`}>
          {!token ? (
            <div className="notice-card form-panel" style={{ margin: "0 auto" }}>
              <h2>Нужен вход в аккаунт</h2>
              <p className="lead">
                Чтобы создать страницу памяти, войдите или зарегистрируйтесь.
              </p>
              <button type="button" className="btn btn-primary" onClick={() => openAuthModal(false)}>
                Войти
              </button>
            </div>
          ) : step === "plan" ? (
            <div className="plan-choice">
              <p className="plan-choice-reassure">
                Базовую страницу можно в любой момент преобразовать в полную без потери данных.
              </p>
              <div className="plan-grid">
                {pagePlans.map((item) => (
                  <article
                    key={item.id}
                    className={`plan-card${item.featured ? " plan-card--featured" : ""}`}
                  >
                    <span className="plan-badge">{item.badge}</span>
                    <h3>{item.title}</h3>
                    <p className="pricing-price">{item.price}</p>
                    <p>{item.subtitle}</p>
                    <ul className="plan-features">
                      {item.features.map((feature) => (
                        <li key={feature}>{feature}</li>
                      ))}
                    </ul>
                    <Link to={item.exampleTo} className="text-link">
                      {item.exampleLabel}
                    </Link>
                    <button
                      type="button"
                      className={`btn ${item.id === "extended" ? "btn-primary" : "btn-outline"}`}
                      onClick={() => selectPlan(item.id)}
                    >
                      Выбрать
                    </button>
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <div className={`form-panel wide${plan === "extended" ? " memorial-form-premium" : ""}`}>
              <div className="form-step-bar">
                <button type="button" className="btn btn-ghost btn-sm" onClick={backToPlans}>
                  ← Сменить формат
                </button>
                <span className="plan-selected-label">
                  {plan === "extended" ? "Полная страница памяти" : "Базовая страница памяти"}
                </span>
              </div>

              {plan === "extended" ? (
                <>
                  <div className="memorial-form-premium-intro">
                    <h1 className="memorial-form-premium-title">Полная страница памяти</h1>
                    <p className="memorial-form-premium-lead">
                      История жизни, фотографии, голос и документы — в одном месте для семьи.
                    </p>
                    <div className="memorial-capability-split">
                      <div>
                        <h3 className="memorial-capability-heading">Что входит</h3>
                        <ul className="memorial-capability-list">
                          {CAPABILITIES_CORE.map((item) => (
                            <li key={item}>
                              <span aria-hidden="true">✓</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="memorial-capability-divider" aria-hidden="true" />
                      <div>
                        <h3 className="memorial-capability-heading">Дополнительно</h3>
                        <ul className="memorial-capability-list">
                          {CAPABILITIES_EXTRA.map((item) => (
                            <li key={item}>
                              <span aria-hidden="true">✓</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <p className="memorial-form-reassure">
                      После создания страницы вы сможете добавить новые фотографии, документы и
                      воспоминания.
                    </p>
                  </div>

                  <div className="memorial-constructor-progress" aria-live="polite">
                    <div className="memorial-constructor-progress-meta">
                      <span>
                        Шаг {constructorProgress.currentStep} из {CONSTRUCTOR_STEPS.length}
                      </span>
                      <span>Заполнено {constructorProgress.percent}%</span>
                    </div>
                    <div
                      className="memorial-constructor-progress-bar"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={constructorProgress.percent}
                    >
                      <span style={{ width: `${constructorProgress.percent}%` }} />
                    </div>
                    <ol className="memorial-constructor-steps">
                      {CONSTRUCTOR_STEPS.map((item, index) => {
                        const done = sectionDone[item.id];
                        return (
                          <li key={item.id}>
                            <button
                              type="button"
                              className={`memorial-constructor-step${done ? " is-done" : ""}`}
                              onClick={() => scrollToSection(`section-${item.id}`)}
                            >
                              <span className="memorial-constructor-step-num" aria-hidden="true">
                                {done ? "✓" : index + 1}
                              </span>
                              {item.title}
                            </button>
                          </li>
                        );
                      })}
                    </ol>
                  </div>

                  <FormSection
                    id="section-basics"
                    step={1}
                    done={sectionDone.basics}
                    title="Основные сведения"
                    hint="Портрет, имя и даты — основа страницы."
                  >
                    <div className="form-grid">
                      <div className="memorial-portrait-field">
                        <span className="form-label">Портрет</span>
                        <div className="memorial-portrait-row">
                          <div
                            className={`memorial-portrait-preview${cardForm.photoPreview ? " has-photo" : ""}`}
                          >
                            {cardForm.photoPreview ? (
                              <img src={cardForm.photoPreview} alt="" />
                            ) : (
                              <span>Нет фото</span>
                            )}
                          </div>
                          <div className="memorial-portrait-actions">
                            <label className="btn btn-outline btn-sm">
                              Загрузить фото
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                hidden
                                onChange={onPortraitChange}
                              />
                            </label>
                            {cardForm.photoPreview ? (
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={clearPortrait}
                              >
                                Убрать
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="form-label" htmlFor="card-last-name">
                          Фамилия
                        </label>
                        <input
                          id="card-last-name"
                          value={cardForm.last_name}
                          onChange={(e) => updateField("last_name", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="form-label" htmlFor="card-first-name">
                          Имя
                        </label>
                        <input
                          id="card-first-name"
                          value={cardForm.first_name}
                          onChange={(e) => updateField("first_name", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="form-label" htmlFor="card-middle-name">
                          Отчество
                        </label>
                        <input
                          id="card-middle-name"
                          value={cardForm.middle_name}
                          onChange={(e) => updateField("middle_name", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="form-label" htmlFor="card-birth">
                          Дата рождения
                        </label>
                        <input
                          id="card-birth"
                          type="date"
                          value={cardForm.birth_date}
                          onChange={(e) => updateField("birth_date", e.target.value)}
                        />
                      </div>
                      {lifeStatusFields}
                      <div>
                        <label className="form-label" htmlFor="card-epitaph">
                          Эпитафия
                        </label>
                        <textarea
                          id="card-epitaph"
                          rows={3}
                          placeholder="Краткое прощальное слово или цитата"
                          value={cardForm.epitaph}
                          onChange={(e) => updateField("epitaph", e.target.value)}
                        />
                      </div>
                    </div>
                  </FormSection>

                  <FormSection
                    id="section-biography"
                    step={2}
                    done={sectionDone.biography}
                    title="Биография"
                    hint="Расскажите историю жизни — это главное, чего ждут на полной странице."
                  >
                    <label className="form-label" htmlFor="card-bio">
                      Текст биографии
                    </label>
                    <textarea
                      id="card-bio"
                      className="memorial-bio-editor"
                      rows={14}
                      placeholder={
                        "Детство, семья, путь, важные события и то, чем человек запомнится…\n\nМожно писать свободно, абзацами."
                      }
                      value={cardForm.biography}
                      onChange={(e) => updateField("biography", e.target.value)}
                    />
                  </FormSection>

                  <FormSection
                    id="section-photos"
                    step={3}
                    done={sectionDone.photos}
                    title="Фотографии"
                    hint="Не только портрет — альбом воспоминаний. Можно добавить позже."
                  >
                    <div className="memorial-create-gallery memorial-create-gallery--slots">
                      {Array.from({ length: gallerySlots }).map((_, index) => {
                        const item = cardForm.galleryFiles[index];
                        if (item) {
                          return (
                            <div key={item.id} className="memorial-create-gallery-item">
                              <img src={item.preview} alt="" />
                              <button
                                type="button"
                                className="memorial-media-remove"
                                onClick={() => removeGalleryItem(item.id)}
                                aria-label="Удалить фото"
                              >
                                ×
                              </button>
                            </div>
                          );
                        }
                        if (index === cardForm.galleryFiles.length) {
                          return (
                            <label
                              key={`add-${index}`}
                              className="memorial-gallery-add-tile"
                            >
                              <span>+ Добавить фотографии</span>
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                multiple
                                hidden
                                onChange={onGalleryChange}
                              />
                            </label>
                          );
                        }
                        return (
                          <div
                            key={`ph-${index}`}
                            className="memorial-gallery-placeholder-tile"
                            aria-hidden="true"
                          />
                        );
                      })}
                    </div>
                    <p className="hint-text" style={{ margin: "0.75rem 0 0" }}>
                      JPEG, PNG, WEBP или GIF, до 5 МБ каждое. Количество не ограничено.
                    </p>
                  </FormSection>

                  <FormSection
                    id="section-videos"
                    step={4}
                    done={sectionDone.videos}
                    title="Видео"
                    hint="Ссылка на Rutube или VK Видео — или загрузите файл."
                  >
                    <div className="memorial-create-video-actions">
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={addVideoLinkDraft}
                      >
                        Добавить ссылку
                      </button>
                      <label className="btn btn-outline btn-sm">
                        Загрузить файл MP4 / WebM
                        <input
                          type="file"
                          accept="video/mp4,video/webm,.mp4,.webm"
                          multiple
                          hidden
                          onChange={onVideoFilesChange}
                        />
                      </label>
                    </div>
                    <p className="hint-text" style={{ margin: "0.5rem 0 0" }}>
                      Для ссылок принимаются только Rutube и VK Видео.
                    </p>
                    {cardForm.videos.map((video) => (
                      <div key={video.id} className="memorial-create-video-row">
                        <button
                          type="button"
                          className="memorial-media-remove"
                          onClick={() => removeVideoDraft(video.id)}
                          aria-label="Удалить видео"
                        >
                          ×
                        </button>
                        <div>
                          <label className="form-label" htmlFor={`video-title-${video.id}`}>
                            Название
                          </label>
                          <input
                            id={`video-title-${video.id}`}
                            value={video.title}
                            onChange={(e) => updateVideoDraft(video.id, { title: e.target.value })}
                            placeholder="Необязательно"
                          />
                        </div>
                        {video.kind === "link" ? (
                          <div>
                            <label className="form-label" htmlFor={`video-url-${video.id}`}>
                              Ссылка на Rutube или VK Видео
                            </label>
                            <input
                              id={`video-url-${video.id}`}
                              type="url"
                              value={video.url}
                              onChange={(e) => onVideoUrlChange(video.id, e.target.value)}
                              placeholder="https://rutube.ru/video/… или https://vk.com/video…"
                              aria-invalid={Boolean(video.urlError)}
                            />
                            {video.urlError ? (
                              <p className="memorial-field-error">{video.urlError}</p>
                            ) : null}
                          </div>
                        ) : (
                          <div>
                            <p className="hint-text" style={{ margin: 0 }}>
                              Файл: {video.fileName || "видео"}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </FormSection>

                  <FormSection
                    title="Аудио"
                    hint="Запись голоса — одна из самых тёплых частей страницы памяти. Учитывается в шаге «Видео»."
                  >
                    <div className="memorial-create-video-actions">
                      <label className="btn btn-outline btn-sm">
                        Загрузить аудиофайл
                        <input
                          type="file"
                          accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/webm,audio/mp4,.mp3,.wav,.ogg,.webm,.m4a"
                          multiple
                          hidden
                          onChange={onAudioFilesChange}
                        />
                      </label>
                      {recording ? (
                        <button type="button" className="btn btn-primary btn-sm" onClick={stopRecording}>
                          Остановить запись
                        </button>
                      ) : (
                        <button type="button" className="btn btn-outline btn-sm" onClick={startRecording}>
                          Записать голос
                        </button>
                      )}
                    </div>
                    {recording ? (
                      <p className="hint-text memorial-recording-hint">Идёт запись…</p>
                    ) : (
                      <p className="hint-text" style={{ margin: "0.5rem 0 0" }}>
                        MP3, WAV, OGG, WebM или M4A, до 20 МБ.
                      </p>
                    )}
                    {cardForm.audioFiles.map((clip) => (
                      <div key={clip.id} className="memorial-create-video-row">
                        <div>
                          <label className="form-label" htmlFor={`audio-title-${clip.id}`}>
                            Название
                          </label>
                          <input
                            id={`audio-title-${clip.id}`}
                            value={clip.title}
                            onChange={(e) => updateAudioDraft(clip.id, { title: e.target.value })}
                          />
                        </div>
                        <p className="hint-text" style={{ margin: 0 }}>
                          {clip.fileName}
                        </p>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => removeAudioDraft(clip.id)}
                        >
                          Удалить
                        </button>
                      </div>
                    ))}
                  </FormSection>

                  <FormSection
                    id="section-documents"
                    step={5}
                    done={sectionDone.documents}
                    title="Документы"
                    hint="Дипломы, военный билет, письма, награды — то, что хранит семья."
                  >
                    <div className="memorial-doc-category-actions">
                      {DOC_CATEGORIES.map((cat) => (
                        <label key={cat.id} className="btn btn-outline btn-sm">
                          + {cat.label}
                          <input
                            type="file"
                            accept="application/pdf,image/jpeg,image/png,image/webp,image/gif,.pdf"
                            multiple
                            hidden
                            onChange={(e) => onDocumentsChange(e, cat.id)}
                          />
                        </label>
                      ))}
                    </div>
                    <p className="hint-text" style={{ margin: "0.5rem 0 0" }}>
                      PDF или изображение, до 15 МБ.
                    </p>
                    {cardForm.documents.map((doc) => (
                      <div key={doc.id} className="memorial-create-video-row">
                        <div>
                          <label className="form-label" htmlFor={`doc-title-${doc.id}`}>
                            Название
                          </label>
                          <input
                            id={`doc-title-${doc.id}`}
                            value={doc.title}
                            onChange={(e) => updateDocumentDraft(doc.id, { title: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="form-label" htmlFor={`doc-cat-${doc.id}`}>
                            Тип
                          </label>
                          <select
                            id={`doc-cat-${doc.id}`}
                            value={doc.category}
                            onChange={(e) =>
                              updateDocumentDraft(doc.id, { category: e.target.value })
                            }
                          >
                            {DOC_CATEGORIES.map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <p className="hint-text" style={{ margin: 0 }}>
                          {doc.fileName}
                        </p>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => removeDocumentDraft(doc.id)}
                        >
                          Удалить
                        </button>
                      </div>
                    ))}
                  </FormSection>

                  <FormSection
                    title="Семья"
                    hint="Родственники и связи. Если страница из древа — подставятся сами."
                  >
                    {!fromTree ? (
                      <div>
                        <label className="form-label" htmlFor="card-family">
                          Родственники
                        </label>
                        <textarea
                          id="card-family"
                          rows={4}
                          placeholder={"Супруга: Иванова Мария\nСын: Иванов Пётр\nМать: …"}
                          value={cardForm.family_links}
                          onChange={(e) => updateField("family_links", e.target.value)}
                        />
                        <p className="hint-text" style={{ margin: "0.35rem 0 0" }}>
                          По строке: роль и имя.
                        </p>
                      </div>
                    ) : (
                      <p className="hint-text" style={{ margin: 0 }}>
                        Связи будут взяты из семейного древа.
                      </p>
                    )}
                    <div style={{ marginTop: "1rem" }}>
                      <p className="form-label" style={{ marginBottom: "0.5rem" }}>
                        Внешние ссылки
                      </p>
                      {cardForm.links.map((link, index) => (
                        <div key={`link-${index}`} className="memorial-create-link-row">
                          <div>
                            <label className="form-label" htmlFor={`link-label-${index}`}>
                              Название
                            </label>
                            <input
                              id={`link-label-${index}`}
                              value={link.label}
                              onChange={(e) => updateLink(index, "label", e.target.value)}
                              placeholder="Википедия"
                            />
                          </div>
                          <div>
                            <label className="form-label" htmlFor={`link-url-${index}`}>
                              URL
                            </label>
                            <input
                              id={`link-url-${index}`}
                              type="url"
                              value={link.url}
                              onChange={(e) => updateLink(index, "url", e.target.value)}
                              placeholder="https://..."
                            />
                          </div>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => removeLinkRow(index)}
                          >
                            Убрать
                          </button>
                        </div>
                      ))}
                      <button type="button" className="btn btn-outline btn-sm" onClick={addLinkRow}>
                        Добавить ссылку
                      </button>
                    </div>
                  </FormSection>

                  <FormSection title="Места" hint="Где родился человек.">
                    <div className="form-grid">
                      <PlaceField
                        label="Место рождения"
                        idPrefix="card-birth-place"
                        searchPlaceholder="Например: Ирк…"
                        value={cardForm.birth_place}
                        onChange={(place) => updateField("birth_place", place)}
                      />
                    </div>
                  </FormSection>

                  <FormSection
                    id="section-settings"
                    step={6}
                    done={sectionDone.settings}
                    title="Настройки"
                    hint="Приватность, гостевая книга и табличка с QR."
                  >
                    <div className="form-grid">
                      <div className="tree-death-field">
                        <span className="form-label">Видимость страницы</span>
                        <div className="life-status-group" role="radiogroup" aria-label="Видимость страницы">
                          <label className="form-check">
                            <input
                              type="radio"
                              name="card-visibility-extended"
                              checked={cardForm.visibility === "private"}
                              onChange={() => updateField("visibility", "private")}
                            />
                            <span>Приватная — только для вас</span>
                          </label>
                          <label className="form-check">
                            <input
                              type="radio"
                              name="card-visibility-extended"
                              checked={cardForm.visibility === "unlisted"}
                              onChange={() => updateField("visibility", "unlisted")}
                            />
                            <span>По ссылке — доступна всем, у кого есть ссылка</span>
                          </label>
                          <label className="form-check">
                            <input
                              type="radio"
                              name="card-visibility-extended"
                              checked={cardForm.visibility === "public"}
                              onChange={() => updateField("visibility", "public")}
                            />
                            <span>Публичная — отображается в музее памяти</span>
                          </label>
                        </div>
                      </div>
                      <label className="form-check">
                        <input
                          type="checkbox"
                          checked={cardForm.guestbook_enabled}
                          onChange={(e) => updateField("guestbook_enabled", e.target.checked)}
                        />
                        <span>Гостевая книга / отзывы на странице</span>
                      </label>
                      <label className="form-check">
                        <input
                          type="checkbox"
                          checked={cardForm.metal_plaque}
                          onChange={(e) => updateField("metal_plaque", e.target.checked)}
                        />
                        <span>Металлическая табличка с QR-кодом</span>
                      </label>
                      <p className="hint-text" style={{ margin: 0 }}>
                        После создания страницы будет доступен QR-код для печати.
                      </p>
                    </div>
                  </FormSection>
                </>
              ) : (
                <>
                  <h2 style={{ marginTop: 0 }}>Основные данные</h2>
                  {briefBasics}
                  <div className="form-grid" style={{ marginTop: "1rem" }}>
                    <PlaceField
                      label="Место рождения"
                      idPrefix="card-birth-place"
                      searchPlaceholder="Например: Ирк…"
                      value={cardForm.birth_place}
                      onChange={(place) => updateField("birth_place", place)}
                    />
                    {!fromTree ? (
                      <div>
                        <label className="form-label" htmlFor="card-family-brief">
                          Родственники
                        </label>
                        <textarea
                          id="card-family-brief"
                          rows={3}
                          placeholder={"Супруга: Иванова Мария\nСын: Иванов Пётр\nМать: …"}
                          value={cardForm.family_links}
                          onChange={(e) => updateField("family_links", e.target.value)}
                        />
                      </div>
                    ) : null}
                    <div className="tree-death-field">
                      <span className="form-label">Видимость страницы</span>
                      <div className="life-status-group" role="radiogroup" aria-label="Видимость страницы">
                        <label className="form-check">
                          <input
                            type="radio"
                            name="card-visibility-brief"
                            checked={cardForm.visibility === "private"}
                            onChange={() => updateField("visibility", "private")}
                          />
                          <span>Приватная — только для вас</span>
                        </label>
                        <label className="form-check">
                          <input
                            type="radio"
                            name="card-visibility-brief"
                            checked={cardForm.visibility === "unlisted"}
                            onChange={() => updateField("visibility", "unlisted")}
                          />
                          <span>По ссылке — доступна всем, у кого есть ссылка</span>
                        </label>
                        <label className="form-check">
                          <input
                            type="radio"
                            name="card-visibility-brief"
                            checked={cardForm.visibility === "public"}
                            onChange={() => updateField("visibility", "public")}
                          />
                          <span>Публичная — отображается в музее памяти</span>
                        </label>
                      </div>
                    </div>
                    <p className="hint-text" style={{ margin: 0 }}>
                      После создания страницы будет доступен QR-код для печати.
                    </p>
                  </div>
                </>
              )}

              <div className="hero-actions" style={{ justifyContent: "flex-start", marginTop: "1.25rem" }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={createCard}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Сохраняем..." : "Создать страницу"}
                </button>
                <Link
                  to={plan === "extended" ? "/memory/example/extended" : "/memory/example/brief"}
                  className="btn btn-outline"
                >
                  Смотреть пример этого формата
                </Link>
              </div>

              {saved && (
                <p className="success-text" style={{ marginTop: "1rem" }}>
                  Страница сохранена.{" "}
                  {savedId ? (
                    <>
                      <Link to={`/memory/${savedId}`} className="text-link">
                        Открыть страницу
                      </Link>
                      {" · "}
                    </>
                  ) : null}
                  <Link to="/cabinet" className="text-link">
                    Перейти в кабинет
                  </Link>
                </p>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
