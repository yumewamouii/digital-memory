import { jsPDF } from "jspdf";
import { mediaUrl } from "../api/trees";

const MONTHS_RU = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

const FONT =
  '"Segoe UI", "Helvetica Neue", Arial, "Noto Sans", "Liberation Sans", sans-serif';

function fullName(card) {
  return [card.last_name, card.first_name, card.middle_name].filter(Boolean).join(" ") || "Без имени";
}

function formatRuLongDate(value) {
  if (!value) return "";
  const raw = String(value).slice(0, 10);
  const parts = raw.split("-").map((p) => Number(p));
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (!y) return "";
  if (!m) return String(y);
  const month = MONTHS_RU[m - 1] || "";
  if (!d) return `${month} ${y}`.trim();
  return `${d} ${month} ${y}`;
}

function yearsBetween(birthIso, deathIso) {
  if (!birthIso || !deathIso) return null;
  const b = new Date(String(birthIso).slice(0, 10));
  const d = new Date(String(deathIso).slice(0, 10));
  if (Number.isNaN(b.getTime()) || Number.isNaN(d.getTime())) return null;
  let years = d.getFullYear() - b.getFullYear();
  const beforeBirthday =
    d.getMonth() < b.getMonth() ||
    (d.getMonth() === b.getMonth() && d.getDate() < b.getDate());
  if (beforeBirthday) years -= 1;
  return years >= 0 ? years : null;
}

function agePhrase(years) {
  if (years == null) return "";
  const n = Math.abs(years) % 100;
  const n1 = n % 10;
  let word = "лет";
  if (n > 10 && n < 20) word = "лет";
  else if (n1 === 1) word = "год";
  else if (n1 >= 2 && n1 <= 4) word = "года";
  return `(${years} ${word} жизни)`;
}

/** Full life dates in one line for API memorial cards. */
function formatCardLifeLine(card) {
  const birth = formatRuLongDate(card.birth_date);
  const death = formatRuLongDate(card.death_date);
  if (!birth && !death) return "";
  const age = agePhrase(yearsBetween(card.birth_date, card.death_date));
  if (birth && death) return `${birth} — ${death}${age ? ` ${age}` : ""}`;
  return birth || death;
}

/** Full life dates for demo examples: "15 марта 1937 — 14 марта 2015 (77 лет жизни)". */
function formatExampleLifeLine(example) {
  const raw = String(example.dates || "");
  const m = raw.match(/(\d{4})\s*[—–-]\s*(\d{4})(?:\s*(\([^)]+\)))?/);
  const birthYear = m?.[1] || "";
  const deathYear = m?.[2] || "";
  const paren = (m?.[3] || "").trim();
  const left = [example.birthDay, birthYear].filter(Boolean).join(" ");
  const right = [example.deathDay, deathYear].filter(Boolean).join(" ");
  if (left && right) return `${left} — ${right}${paren ? ` ${paren}` : ""}`;
  if (raw) return raw.replace(/\s+/g, " ").trim();
  return [left, right].filter(Boolean).join(" — ");
}

async function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function loadImageDataUrl(url) {
  if (!url) return "";
  const resolved =
    typeof url === "string" && url.startsWith("/") && typeof window !== "undefined"
      ? `${window.location.origin}${url}`
      : url;

  try {
    const res = await fetch(resolved, { mode: "cors", credentials: "omit" });
    if (res.ok) return await blobToDataUrl(await res.blob());
  } catch {
    /* fall through */
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        if (!canvas.width || !canvas.height) {
          resolve("");
          return;
        }
        canvas.getContext("2d").drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/jpeg", 0.92));
      } catch {
        resolve("");
      }
    };
    img.onerror = () => resolve("");
    img.src = resolved;
  });
}

function loadHtmlImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function fitInside(naturalW, naturalH, maxW, maxH) {
  const w = Number(naturalW) || 0;
  const h = Number(naturalH) || 0;
  if (!w || !h) return { width: maxW, height: Math.round(maxH * 0.7) };
  const scale = Math.min(maxW / w, maxH / h, 1);
  return {
    width: Math.max(1, Math.round(w * scale)),
    height: Math.max(1, Math.round(h * scale)),
  };
}

/**
 * Text PDF builder: draws with browser fonts (Cyrillic OK), no site screenshots.
 */
class TextPdfDoc {
  constructor() {
    this.pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4", compress: true });
    this.pageW = this.pdf.internal.pageSize.getWidth();
    this.pageH = this.pdf.internal.pageSize.getHeight();
    this.margin = 48;
    this.contentW = this.pageW - this.margin * 2;
    this.scale = 2;
    this.pageIndex = 0;
    this.hasContent = false;
    this._resetPage();
  }

  _resetPage() {
    this.canvas = document.createElement("canvas");
    this.canvas.width = Math.round(this.pageW * this.scale);
    this.canvas.height = Math.round(this.pageH * this.scale);
    this.ctx = this.canvas.getContext("2d");
    this.ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    this.ctx.fillStyle = "#ffffff";
    this.ctx.fillRect(0, 0, this.pageW, this.pageH);
    this.y = this.margin;
    this.hasContent = false;
  }

  _flushPage() {
    if (!this.hasContent) return;
    const dataUrl = this.canvas.toDataURL("image/jpeg", 0.93);
    if (this.pageIndex > 0) this.pdf.addPage();
    this.pdf.addImage(dataUrl, "JPEG", 0, 0, this.pageW, this.pageH, undefined, "FAST");
    this.pageIndex += 1;
  }

  _ensure(height) {
    if (this.y + height <= this.pageH - this.margin) return;
    this._flushPage();
    this._resetPage();
  }

  _setFont(size, weight = "normal") {
    const w = weight === "bold" ? "700" : "400";
    this.ctx.font = `${w} ${size}px ${FONT}`;
    this.ctx.textBaseline = "top";
  }

  _wrap(text, size, weight = "normal") {
    this._setFont(size, weight);
    const raw = String(text || "").replace(/\s+/g, " ").trim();
    if (!raw) return [];
    const words = raw.split(" ");
    const lines = [];
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (this.ctx.measureText(next).width > this.contentW && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  gap(px = 10) {
    this.y += px;
  }

  heading(text) {
    const size = 14;
    const lines = this._wrap(text, size, "bold");
    const lineH = size * 1.35;
    this._ensure(lines.length * lineH + 8);
    this._setFont(size, "bold");
    this.ctx.fillStyle = "#152033";
    for (const line of lines) {
      this.ctx.fillText(line, this.margin, this.y);
      this.y += lineH;
      this.hasContent = true;
    }
    this.gap(6);
  }

  title(text) {
    const size = 26;
    const lines = this._wrap(text, size, "bold");
    const lineH = size * 1.25;
    this._ensure(lines.length * lineH + 8);
    this._setFont(size, "bold");
    this.ctx.fillStyle = "#152033";
    for (const line of lines) {
      this.ctx.fillText(line, this.margin, this.y);
      this.y += lineH;
      this.hasContent = true;
    }
    this.gap(8);
  }

  paragraph(text, { size = 12, weight = "normal", color = "#243142", italic = false } = {}) {
    const chunks = String(text || "").split(/\n+/);
    for (const chunk of chunks) {
      const lines = this._wrap(chunk, size, weight);
      const lineH = size * 1.45;
      for (const line of lines) {
        this._ensure(lineH);
        this._setFont(size, weight);
        if (italic) this.ctx.font = `italic ${weight === "bold" ? "700" : "400"} ${size}px ${FONT}`;
        this.ctx.fillStyle = color;
        this.ctx.fillText(line, this.margin, this.y);
        this.y += lineH;
        this.hasContent = true;
      }
      this.gap(4);
    }
  }

  bullet(text) {
    const size = 12;
    const prefix = "• ";
    this._setFont(size, "normal");
    const prefixW = this.ctx.measureText(prefix).width;
    const words = String(text || "").replace(/\s+/g, " ").trim().split(" ");
    const lines = [];
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (this.ctx.measureText(next).width > this.contentW - prefixW && line) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    if (line) lines.push(line);
    const lineH = size * 1.45;
    for (let i = 0; i < lines.length; i += 1) {
      this._ensure(lineH);
      this._setFont(size, "normal");
      this.ctx.fillStyle = "#243142";
      const x = this.margin + (i === 0 ? 0 : prefixW);
      this.ctx.fillText(i === 0 ? `${prefix}${lines[i]}` : lines[i], x, this.y);
      this.y += lineH;
      this.hasContent = true;
    }
    this.gap(2);
  }

  async image(dataUrl, maxW = 200, maxH = 240) {
    if (!dataUrl) return;
    let img;
    try {
      img = await loadHtmlImage(dataUrl);
    } catch {
      return;
    }
    const size = fitInside(img.naturalWidth || img.width, img.naturalHeight || img.height, maxW, maxH);
    this._ensure(size.height + 8);
    this.ctx.drawImage(img, this.margin, this.y, size.width, size.height);
    this.y += size.height + 8;
    this.hasContent = true;
  }

  /**
   * Place photos in 1–2 columns to reduce vertical whitespace.
   * Optional heading stays on the same page as the first row.
   * @param {{ dataUrl: string, label?: string }[]} items
   * @param {{ columns?: number, maxH?: number, gap?: number, heading?: string }} [options]
   */
  async imageGrid(items, { columns = 2, maxH = 150, gap = 10, heading = "" } = {}) {
    const list = (items || []).filter((item) => item?.dataUrl);
    if (!list.length) return;

    const cols = Math.min(Math.max(columns, 1), 2);
    const colW = (this.contentW - gap * (cols - 1)) / cols;
    const labelSize = 9;
    const labelGap = 2;
    const labelBlock = 12;

    const prepareRow = async (rowItems) => {
      const prepared = [];
      for (const item of rowItems) {
        let img;
        try {
          img = await loadHtmlImage(item.dataUrl);
        } catch {
          continue;
        }
        const size = fitInside(
          img.naturalWidth || img.width,
          img.naturalHeight || img.height,
          colW,
          maxH,
        );
        prepared.push({ img, size, label: item.label || "" });
      }
      return prepared;
    };

    const drawRow = (prepared) => {
      if (!prepared.length) return;
      const hasLabels = prepared.some((p) => p.label);
      const rowImgH = Math.max(...prepared.map((p) => p.size.height));
      const rowH = rowImgH + (hasLabels ? labelBlock : 0);

      let x = this.margin;
      for (const cell of prepared) {
        const offsetX = x + Math.max(0, (colW - cell.size.width) / 2);
        this.ctx.drawImage(cell.img, offsetX, this.y, cell.size.width, cell.size.height);
        if (cell.label) {
          this._setFont(labelSize, "normal");
          this.ctx.fillStyle = "#5b6b7c";
          let label = cell.label;
          while (this.ctx.measureText(label).width > colW && label.length > 4) {
            label = `${label.slice(0, -2)}…`;
          }
          this.ctx.fillText(label, x, this.y + rowImgH + labelGap);
        }
        x += colW + gap;
      }

      this.y += rowH + 8;
      this.hasContent = true;
    };

    // Keep heading glued to the first photo row (no orphan title on previous page).
    const firstPrepared = await prepareRow(list.slice(0, cols));
    if (!firstPrepared.length) return;

    const firstHasLabels = firstPrepared.some((p) => p.label);
    const firstRowH =
      Math.max(...firstPrepared.map((p) => p.size.height)) + (firstHasLabels ? labelBlock : 0) + 8;
    const headingSize = 14;
    const headingH = heading ? headingSize * 1.35 + 6 : 0;
    this._ensure(headingH + firstRowH);

    if (heading) {
      this._setFont(headingSize, "bold");
      this.ctx.fillStyle = "#152033";
      this.ctx.fillText(heading, this.margin, this.y);
      this.y += headingSize * 1.35;
      this.gap(6);
      this.hasContent = true;
    }

    drawRow(firstPrepared);

    for (let i = cols; i < list.length; i += cols) {
      const prepared = await prepareRow(list.slice(i, i + cols));
      if (!prepared.length) continue;
      const hasLabels = prepared.some((p) => p.label);
      const rowH =
        Math.max(...prepared.map((p) => p.size.height)) + (hasLabels ? labelBlock : 0) + 8;
      this._ensure(rowH);
      drawRow(prepared);
    }
  }

  save(fileBaseName) {
    this._flushPage();
    if (this.pageIndex === 0) {
      // empty guard — still write a blank page with title fallback
      this._resetPage();
      this.paragraph("Нет данных для экспорта");
      this._flushPage();
    }
    const safe = String(fileBaseName || "pamyat")
      .replace(/[\\/:*?"<>|]+/g, "_")
      .slice(0, 80);
    this.pdf.save(`${safe}.pdf`);
  }
}

async function writeCardPdf(card, fileBaseName) {
  const doc = new TextPdfDoc();
  const name = fullName(card);
  const life = formatCardLifeLine(card);

  doc.title(name);
  if (life) doc.paragraph(life, { size: 13, color: "#3d4c5c" });
  doc.gap(6);

  const photo = await loadImageDataUrl(mediaUrl(card.photo_url));
  if (photo) await doc.image(photo, 170, 210);

  if (card.birth_place) {
    doc.heading("Место рождения");
    doc.paragraph(card.birth_place);
  }
  if (card.epitaph) {
    doc.heading("Эпитафия");
    doc.paragraph(card.epitaph);
  }
  if (card.short_description) {
    doc.heading("Краткое описание");
    doc.paragraph(card.short_description);
  }
  if (card.biography) {
    doc.heading("Биография и сведения");
    doc.paragraph(card.biography);
  }
  if ((card.relatives || []).length) {
    doc.heading("Родственники");
    for (const item of card.relatives) {
      doc.bullet(`${item.role}: ${item.name}`);
    }
  } else if (card.relatives_text) {
    doc.heading("Родственники");
    doc.paragraph(card.relatives_text);
  }

  if (card.family_tree_title || card.family_tree_id) {
    doc.heading("Семейное древо");
    doc.paragraph(card.family_tree_title || "Семейное древо");
  }

  doc.save(fileBaseName);
}

async function writeExamplePdf(example, fileBaseName) {
  const doc = new TextPdfDoc();
  const name =
    example.fullName ||
    [example.lastName, example.firstName, example.middleName].filter(Boolean).join(" ") ||
    "Без имени";
  const life = formatExampleLifeLine(example);

  doc.title(name);
  if (life) doc.paragraph(life, { size: 12, color: "#3d4c5c" });
  doc.gap(4);

  if (example.photo) {
    const photo = await loadImageDataUrl(example.photo);
    if (photo) await doc.image(photo, 170, 210);
  }

  if (example.epitaph) {
    doc.heading("Эпитафия");
    doc.paragraph(example.epitaph, { italic: true, size: 11 });
    if (example.epitaphAuthor) {
      doc.paragraph(`— ${example.epitaphAuthor}`, { size: 10, color: "#5b6b7c" });
    }
  }

  if (example.biographyIntro || (example.biographySections || []).length) {
    doc.heading("Биография");
    if (example.biographyIntro) doc.paragraph(example.biographyIntro, { size: 11 });
    for (const section of example.biographySections || []) {
      if (section.title) doc.paragraph(section.title, { weight: "bold", size: 11 });
      if (section.text) doc.paragraph(section.text, { size: 11 });
    }
  }

  const galleryItems = [];
  for (const item of example.gallery || []) {
    if (!item.image) continue;
    const dataUrl = await loadImageDataUrl(item.image);
    if (dataUrl) galleryItems.push({ dataUrl, label: item.label || "" });
  }
  if (galleryItems.length) {
    await doc.imageGrid(galleryItems, {
      columns: 2,
      maxH: 145,
      gap: 10,
      heading: "Фотогалерея",
    });
  }

  if ((example.guestbook || []).length) {
    doc.heading("Слова близких");
    for (const entry of example.guestbook) {
      if (entry.text) doc.paragraph(entry.text, { size: 11 });
      if (entry.author) doc.paragraph(`— ${entry.author}`, { size: 10, color: "#5b6b7c" });
      doc.gap(2);
    }
  }

  const cemetery = example.cemetery || {};
  if (cemetery.name || cemetery.address || cemetery.plot || cemetery.directions) {
    doc.heading("Место захоронения");
    if (cemetery.name) doc.paragraph(cemetery.name, { weight: "bold" });
    if (cemetery.plot) doc.paragraph(cemetery.plot);
    if (cemetery.address) doc.paragraph(`Адрес: ${cemetery.address}`);
    if (cemetery.coords) doc.paragraph(`Координаты: ${cemetery.coords}`);
    if (cemetery.directions) doc.paragraph(cemetery.directions);
  }

  if ((example.relatives || []).length) {
    doc.heading("Родственные связи");
    for (const relative of example.relatives) {
      doc.bullet(`${relative.role || ""}: ${relative.name || ""}`.replace(/^:\s*/, "").trim());
    }
  }

  doc.save(fileBaseName);
}

/**
 * Export memorial card to PDF (text + photos only).
 */
export async function exportMemorialPdf(card) {
  if (!card?.id) throw new Error("Нет данных карточки");
  const safeName = fullName(card).replace(/[\\/:*?"<>|]+/g, "_").slice(0, 80);
  await writeCardPdf(card, `pamyat-${safeName || card.id}`);
}

/**
 * Export demo memorial example to PDF (text + photos; no videos/links/QR/access).
 */
export async function exportExampleMemorialPdf(example, options = {}) {
  if (!example) throw new Error("Нет данных примера");
  const slug =
    options.slug ||
    example.slug ||
    (example.type === "brief" ? "brief" : example.type === "extended" ? "extended" : "example");
  const safeName = (example.fullName || slug).replace(/[\\/:*?"<>|]+/g, "_").slice(0, 80);
  await writeExamplePdf(example, `primer-pamyat-${safeName}`);
}
