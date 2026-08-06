import { useEffect, useId, useRef, useState } from "react";
import YandexMapCanvas from "./YandexMapCanvas";
import {
  geocodeTextYandex,
  getYandexMapsApiKey,
  reverseGeocodeYandex,
  searchYandexPlaces,
} from "../utils/yandexMaps";

const NOMINATIM_HEADERS = {
  Accept: "application/json",
};

function formatCoords(lat, lng) {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

/** Short: city / settlement (+ region, country). */
function placeSettlementLabel(address = {}, fallbackName = "") {
  const city =
    address.city ||
    address.town ||
    address.village ||
    address.hamlet ||
    address.municipality ||
    address.suburb ||
    address.county ||
    fallbackName;
  const region = address.state || address.region || address.province || "";
  const country = address.country || "";
  const parts = [];
  if (city) parts.push(city);
  if (region && region !== city) parts.push(region);
  if (country) parts.push(country);
  return parts.join(", ") || fallbackName || "";
}

/** Full street-level address from Nominatim parts. */
function placeFullAddress(address = {}, fallbackName = "") {
  const road = address.road || address.pedestrian || address.footway || "";
  const house = address.house_number || "";
  const streetLine = [road, house].filter(Boolean).join(", ");
  const city =
    address.city ||
    address.town ||
    address.village ||
    address.hamlet ||
    address.municipality ||
    address.suburb ||
    "";
  const region = address.state || address.region || address.province || "";
  const country = address.country || "";
  const parts = [];
  if (streetLine) parts.push(streetLine);
  if (city) parts.push(city);
  if (region && region !== city) parts.push(region);
  if (country) parts.push(country);
  return parts.join(", ") || fallbackName || "";
}

function isDetailedOsm(item) {
  const type = `${item.type || ""} ${item.addresstype || ""} ${item.class || ""}`.toLowerCase();
  return /(house|building|residential|street|road|highway|address)/.test(type);
}

function settlementRankFromOsm(item) {
  const type = `${item.type || ""} ${item.addresstype || ""} ${item.class || ""}`.toLowerCase();
  if (/(^|\s)(city|town)(\s|$)/.test(type)) return 0;
  if (/(village|hamlet|municipality|suburb|locality)/.test(type)) return 1;
  if (/(administrative|state|region|county)/.test(type)) return 3;
  if (/street|road|highway/.test(type)) return 4;
  if (/house|building|residential|address/.test(type)) return 5;
  return 6;
}

function mapNominatimItem(item, { isRussia = false } = {}) {
  const lat = Number(item.lat);
  const lng = Number(item.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const detailed = isDetailedOsm(item);
  const label = detailed
    ? placeFullAddress(item.address, item.display_name || item.name)
    : placeSettlementLabel(item.address, item.name || item.display_name);
  if (!label) return null;
  const countryCode = (item.address?.country_code || "").toUpperCase();
  return {
    id: String(item.place_id || `${lat},${lng}`),
    label,
    displayName: item.display_name || label,
    latitude: lat,
    longitude: lng,
    countryCode,
    isRussia: isRussia || countryCode === "RU",
    settlementRank: settlementRankFromOsm(item),
  };
}

async function searchNominatim(query, { countrycodes } = {}) {
  const params = new URLSearchParams({
    format: "jsonv2",
    q: query,
    addressdetails: "1",
    limit: "8",
    "accept-language": "ru",
  });
  if (countrycodes) params.set("countrycodes", countrycodes);
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?${params.toString()}`,
    { headers: NOMINATIM_HEADERS },
  );
  if (!response.ok) return [];
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

/** Russia first, then the rest of the world; settlements and full addresses. */
async function searchPlaces(query) {
  const q = (query || "").trim();
  if (q.length < 2) return [];

  if (getYandexMapsApiKey()) {
    const yandex = await searchYandexPlaces(q);
    if (yandex?.length) return yandex;
  }

  try {
    const [ruRaw, worldRaw] = await Promise.all([
      searchNominatim(q, { countrycodes: "ru" }),
      searchNominatim(q),
    ]);

    const seen = new Set();
    const merged = [];

    const pushList = (list, isRussia) => {
      for (const raw of list) {
        const item = mapNominatimItem(raw, { isRussia });
        if (!item) continue;
        const key = item.label.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(item);
      }
    };

    pushList(ruRaw, true);
    pushList(worldRaw, false);

    merged.sort((a, b) => {
      if (a.isRussia !== b.isRussia) return a.isRussia ? -1 : 1;
      if (a.settlementRank !== b.settlementRank) return a.settlementRank - b.settlementRank;
      return a.label.localeCompare(b.label, "ru");
    });

    return merged.slice(0, 10);
  } catch {
    return [];
  }
}

async function reverseGeocode(lat, lng) {
  const fromYandex = await reverseGeocodeYandex(lat, lng);
  if (fromYandex?.address) return fromYandex;

  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}` +
      `&lon=${lng}&addressdetails=1&accept-language=ru`;
    const response = await fetch(url, { headers: NOMINATIM_HEADERS });
    if (!response.ok) return null;
    const data = await response.json();
    const label =
      placeFullAddress(data.address, data.display_name || data.name) ||
      data.display_name ||
      "";
    return {
      address: label,
      latitude: lat,
      longitude: lng,
      displayName: data.display_name || label,
    };
  } catch {
    return null;
  }
}

/** Resolve coords for free-typed city or full address without changing the text. */
async function resolveCoordsForText(text) {
  const q = (text || "").trim();
  if (q.length < 2) return null;

  if (getYandexMapsApiKey()) {
    const hit = await geocodeTextYandex(q);
    if (hit) return hit;
  }

  const results = await searchPlaces(q);
  return results[0] || null;
}

/**
 * Place picker: city/settlement text or full address + Yandex map marker.
 * Coordinates are always resolved when possible.
 */
export default function LocationMapPicker({
  latitude,
  longitude,
  address,
  onChange,
  disabled = false,
  compact = false,
  searchPlaceholder = "Город, поселение или полный адрес…",
  addressPlaceholder = "Город или полный адрес",
  showMapDefault = false,
  idPrefix,
}) {
  const autoId = useId();
  const prefix = idPrefix || `place-${autoId}`;
  const [query, setQuery] = useState(address || "");
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [showMap, setShowMap] = useState(
    showMapDefault || (typeof latitude === "number" && typeof longitude === "number"),
  );
  const [listOpen, setListOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState(null);
  const skipSearchRef = useRef(false);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const resolveSeq = useRef(0);

  const updateDropdownPosition = () => {
    const el = inputRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setDropdownStyle({
      position: "fixed",
      left: rect.left,
      top: rect.bottom + 2,
      width: rect.width,
      zIndex: 10050,
    });
  };

  useEffect(() => {
    setQuery(address || "");
  }, [address]);

  useEffect(() => {
    if (typeof latitude === "number" && typeof longitude === "number") {
      setShowMap(true);
    }
  }, [latitude, longitude]);

  useEffect(() => {
    if (disabled || skipSearchRef.current) {
      skipSearchRef.current = false;
      return undefined;
    }
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setIsSearching(false);
      return undefined;
    }
    let cancelled = false;
    setIsSearching(true);
    const timer = setTimeout(async () => {
      const results = await searchPlaces(q);
      if (!cancelled) {
        setSuggestions(results);
        updateDropdownPosition();
        setListOpen(true);
        setIsSearching(false);
      }
    }, 320);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, disabled]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setListOpen(false);
      }
    };
    const onReposition = () => {
      if (listOpen) updateDropdownPosition();
    };
    document.addEventListener("mousedown", onDocClick);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [listOpen]);

  const emit = (next) => {
    onChange({
      latitude: next.latitude ?? null,
      longitude: next.longitude ?? null,
      address: next.address ?? "",
      coordsText:
        typeof next.latitude === "number" && typeof next.longitude === "number"
          ? formatCoords(next.latitude, next.longitude)
          : "",
    });
  };

  const ensureCoordsForText = async (text, currentLat, currentLng) => {
    const trimmed = (text || "").trim();
    if (!trimmed) {
      emit({ latitude: null, longitude: null, address: "" });
      return;
    }

    // Keep existing coords if text matches current address already
    if (
      typeof currentLat === "number" &&
      typeof currentLng === "number" &&
      trimmed === (address || "").trim()
    ) {
      emit({ latitude: currentLat, longitude: currentLng, address: trimmed });
      return;
    }

    const seq = ++resolveSeq.current;
    setIsGeocoding(true);
    const hit = await resolveCoordsForText(trimmed);
    if (seq !== resolveSeq.current) return;
    setIsGeocoding(false);

    if (hit) {
      // Keep user's typed text (city-only allowed); save coordinates from geocoder
      emit({
        latitude: hit.latitude,
        longitude: hit.longitude,
        address: trimmed,
      });
      setShowMap(true);
    } else {
      emit({
        latitude: null,
        longitude: null,
        address: trimmed,
      });
    }
  };

  const handlePick = async (lat, lng) => {
    if (disabled) return;
    const seq = ++resolveSeq.current;
    setIsGeocoding(true);
    const resolved = await reverseGeocode(lat, lng);
    if (seq !== resolveSeq.current) return;
    setIsGeocoding(false);
    const nextAddress = resolved?.address || address || "";
    skipSearchRef.current = true;
    setQuery(nextAddress);
    setSuggestions([]);
    setListOpen(false);
    emit({
      latitude: lat,
      longitude: lng,
      address: nextAddress,
    });
  };

  const selectSuggestion = (item) => {
    skipSearchRef.current = true;
    setQuery(item.label);
    setSuggestions([]);
    setListOpen(false);
    setShowMap(true);
    emit({
      latitude: item.latitude,
      longitude: item.longitude,
      address: item.label,
    });
  };

  const clearPoint = () => {
    skipSearchRef.current = true;
    setQuery("");
    setSuggestions([]);
    setListOpen(false);
    emit({ latitude: null, longitude: null, address: "" });
  };

  const hasValue =
    Boolean((address || "").trim()) ||
    typeof latitude === "number" ||
    typeof longitude === "number";

  return (
    <div className={`location-picker${compact ? " location-picker--compact" : ""}`} ref={wrapRef}>
      <div className="location-search">
        <label className="form-label" htmlFor={`${prefix}-search`}>
          Поиск места
        </label>
        <div className="location-search-field">
          <input
            ref={inputRef}
            id={`${prefix}-search`}
            type="search"
            autoComplete="off"
            placeholder={searchPlaceholder}
            value={query}
            disabled={disabled}
            onChange={(e) => {
              setQuery(e.target.value);
              updateDropdownPosition();
              setListOpen(true);
            }}
            onFocus={() => {
              if (suggestions.length) {
                updateDropdownPosition();
                setListOpen(true);
              }
            }}
            onBlur={() => {
              const trimmed = (query || "").trim();
              if (!trimmed) {
                if (address || latitude != null) {
                  emit({ latitude: null, longitude: null, address: "" });
                }
                return;
              }
              void ensureCoordsForText(trimmed, latitude, longitude);
            }}
          />
          {isSearching ? <span className="location-search-status">Ищем…</span> : null}
          {listOpen && suggestions.length > 0 && dropdownStyle ? (
            <ul className="location-suggestions" role="listbox" style={dropdownStyle}>
              {suggestions.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="location-suggestion-btn"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectSuggestion(item)}
                  >
                    <span className="location-suggestion-label">
                      {item.label}
                      {item.isRussia ? (
                        <span className="location-suggestion-badge">РФ</span>
                      ) : null}
                    </span>
                    {item.displayName && item.displayName !== item.label ? (
                      <span className="location-suggestion-meta">{item.displayName}</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      <div className="location-picker-toolbar">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={disabled}
          onClick={() => setShowMap((v) => !v)}
        >
          {showMap ? "Скрыть карту" : "Указать на карте"}
        </button>
        {hasValue ? (
          <button type="button" className="btn btn-ghost btn-sm" disabled={disabled} onClick={clearPoint}>
            Сбросить
          </button>
        ) : null}
      </div>

      {showMap ? (
        <div className="location-picker-map">
          <YandexMapCanvas
            latitude={latitude}
            longitude={longitude}
            disabled={disabled}
            onPick={handlePick}
          />
        </div>
      ) : null}

      {isGeocoding ? (
        <p className="hint-text location-picker-hint">Определяем адрес…</p>
      ) : null}

      <div>
        <label className="form-label" htmlFor={`${prefix}-address`}>
          Адрес
        </label>
        <input
          id={`${prefix}-address`}
          placeholder={addressPlaceholder}
          value={address || ""}
          disabled={disabled}
          onChange={(e) => {
            skipSearchRef.current = true;
            setQuery(e.target.value);
            emit({
              latitude,
              longitude,
              address: e.target.value,
            });
          }}
          onBlur={(e) => {
            const trimmed = e.target.value.trim();
            if (!trimmed) return;
            void ensureCoordsForText(trimmed, latitude, longitude);
          }}
        />
      </div>
    </div>
  );
}

export function buildLocationString({ address, latitude, longitude }) {
  const coords =
    typeof latitude === "number" && typeof longitude === "number"
      ? formatCoords(latitude, longitude)
      : "";
  const addr = (address || "").trim();
  if (addr && coords) return `${addr}; ${coords}`;
  return addr || coords || "";
}

export function parseLocationString(value) {
  if (!value) {
    return { address: "", latitude: null, longitude: null };
  }
  const match = value.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*$/);
  if (!match) {
    return { address: value, latitude: null, longitude: null };
  }
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  const address = value
    .slice(0, match.index)
    .replace(/[;\s]+$/, "")
    .trim();
  return { address, latitude, longitude };
}

/** Controlled place value helper for forms */
export function emptyPlace() {
  return { address: "", latitude: null, longitude: null };
}
