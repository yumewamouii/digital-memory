import { useEffect, useState } from "react";
import { normalizePartialDate, partialDatePrecision } from "../../utils/treeRelations";

const MONTHS = [
  { value: "01", label: "январь" },
  { value: "02", label: "февраль" },
  { value: "03", label: "март" },
  { value: "04", label: "апрель" },
  { value: "05", label: "май" },
  { value: "06", label: "июнь" },
  { value: "07", label: "июль" },
  { value: "08", label: "август" },
  { value: "09", label: "сентябрь" },
  { value: "10", label: "октябрь" },
  { value: "11", label: "ноябрь" },
  { value: "12", label: "декабрь" },
];

const PRECISION_OPTIONS = [
  { id: "unknown", label: "Неизвестно" },
  { id: "year", label: "Год" },
  { id: "month", label: "Месяц и год" },
  { id: "day", label: "Полная дата" },
];

function partsFromValue(value) {
  const normalized = normalizePartialDate(value);
  if (!normalized) return { year: "", month: "", day: "" };
  const [year, month = "", day = ""] = normalized.split("-");
  return { year, month, day };
}

function buildValue(precision, year, month, day) {
  if (precision === "unknown") return "";
  const y = String(year || "").trim();
  if (!/^\d{4}$/.test(y)) return "";
  if (precision === "year") return normalizePartialDate(y);
  const m = month || "01";
  if (precision === "month") return normalizePartialDate(`${y}-${m}`);
  const d = day || "01";
  return normalizePartialDate(`${y}-${m}-${String(d).padStart(2, "0")}`);
}

function initialPrecision(value) {
  if (!value) return "unknown";
  return partialDatePrecision(value);
}

export default function PartialDateField({
  label,
  value,
  onChange,
  disabled = false,
  id,
}) {
  const parts = partsFromValue(value);
  const [precision, setPrecision] = useState(() => initialPrecision(value));
  const [year, setYear] = useState(parts.year);
  const [month, setMonth] = useState(parts.month);
  const [day, setDay] = useState(parts.day);

  useEffect(() => {
    const next = partsFromValue(value);
    const currentBuilt = buildValue(precision, year, month, day) || "";
    const incoming = value || "";
    if (incoming === currentBuilt) return;
    setYear(next.year);
    setMonth(next.month);
    setDay(next.day);
    if (incoming) setPrecision(partialDatePrecision(incoming));
    else if (precision !== "unknown") setPrecision("unknown");
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps — sync only on external value changes

  const emit = (nextPrecision, nextYear, nextMonth, nextDay) => {
    onChange?.(buildValue(nextPrecision, nextYear, nextMonth, nextDay));
  };

  const setPrecisionMode = (next) => {
    setPrecision(next);
    if (next === "unknown") {
      setYear("");
      setMonth("");
      setDay("");
      onChange?.("");
      return;
    }
    const nextMonth = next === "year" ? "" : month || "01";
    const nextDay = next === "day" ? day || "01" : "";
    if (next === "year") {
      setMonth("");
      setDay("");
      emit("year", year, "", "");
      return;
    }
    if (next === "month") {
      setMonth(nextMonth);
      setDay("");
      emit("month", year, nextMonth, "");
      return;
    }
    setMonth(nextMonth);
    setDay(nextDay);
    emit("day", year, nextMonth, nextDay);
  };

  const groupId = id || "partial-date";

  return (
    <div className="partial-date-field">
      {label ? (
        <span className="form-label" id={`${groupId}-label`}>
          {label}
        </span>
      ) : null}

      <div
        className="partial-date-precision"
        role="group"
        aria-labelledby={label ? `${groupId}-label` : undefined}
        aria-label={label ? undefined : "Точность даты"}
      >
        {PRECISION_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={
              precision === option.id
                ? "partial-date-precision-btn is-active"
                : "partial-date-precision-btn"
            }
            disabled={disabled}
            aria-pressed={precision === option.id}
            onClick={() => setPrecisionMode(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {precision === "unknown" ? (
        <p className="partial-date-unknown-hint">Дата неизвестна — можно заполнить позже</p>
      ) : (
        <div className="partial-date-row">
          {precision === "day" ? (
            <input
              id={`${groupId}-day`}
              className="partial-date-day"
              type="number"
              inputMode="numeric"
              min={1}
              max={31}
              placeholder="День"
              aria-label="День"
              value={day ? Number(day) : ""}
              disabled={disabled}
              onChange={(e) => {
                const nextDay = e.target.value;
                setDay(nextDay);
                emit(precision, year, month, nextDay);
              }}
            />
          ) : null}

          {precision !== "year" ? (
            <select
              id={`${groupId}-month`}
              className="partial-date-month"
              aria-label="Месяц"
              value={month}
              disabled={disabled}
              onChange={(e) => {
                const nextMonth = e.target.value;
                setMonth(nextMonth);
                emit(precision, year, nextMonth, day);
              }}
            >
              <option value="">Месяц</option>
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          ) : null}

          <input
            id={`${groupId}-year`}
            className="partial-date-year"
            type="number"
            inputMode="numeric"
            min={1}
            max={9999}
            placeholder="Год"
            aria-label="Год"
            value={year}
            disabled={disabled}
            onChange={(e) => {
              const nextYear = e.target.value;
              setYear(nextYear);
              emit(precision, nextYear, month, day);
            }}
          />
        </div>
      )}
    </div>
  );
}
