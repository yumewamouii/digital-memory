const YANDEX_API_KEY = import.meta.env.VITE_YANDEX_MAPS_API_KEY || "";

let loadPromise = null;

export function getYandexMapsApiKey() {
  return YANDEX_API_KEY;
}

/** Load Yandex Maps JS API 2.1 once. */
export function loadYandexMaps() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Yandex Maps доступны только в браузере"));
  }
  if (window.ymaps?.Map) {
    return Promise.resolve(window.ymaps);
  }
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector("script[data-yandex-maps]");
    if (existing && window.ymaps) {
      window.ymaps.ready(() => resolve(window.ymaps));
      return;
    }

    const script = document.createElement("script");
    const params = new URLSearchParams({ lang: "ru_RU" });
    if (YANDEX_API_KEY) params.set("apikey", YANDEX_API_KEY);
    script.src = `https://api-maps.yandex.ru/2.1/?${params.toString()}`;
    script.async = true;
    script.dataset.yandexMaps = "1";
    script.onload = () => {
      if (!window.ymaps) {
        reject(new Error("Не удалось загрузить Яндекс.Карты"));
        return;
      }
      window.ymaps.ready(() => resolve(window.ymaps));
    };
    script.onerror = () => {
      loadPromise = null;
      reject(new Error("Не удалось загрузить Яндекс.Карты"));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}

function yandexComponents(featureMember) {
  const meta = featureMember?.GeoObject?.metaDataProperty?.GeocoderMetaData;
  const address = meta?.Address || {};
  const components = address.Components || [];
  const byKind = {};
  for (const c of components) {
    if (c?.kind && c?.name) byKind[c.kind] = c.name;
  }
  return {
    meta,
    address,
    byKind,
    name: featureMember?.GeoObject?.name || "",
    description: featureMember?.GeoObject?.description || "",
    text: meta?.text || featureMember?.GeoObject?.name || "",
    kind: meta?.kind || "",
    countryCode: (address.country_code || "").toUpperCase(),
    pos: featureMember?.GeoObject?.Point?.pos || "",
  };
}

function parseYandexPos(pos) {
  // "lng lat"
  const parts = String(pos || "")
    .trim()
    .split(/\s+/);
  if (parts.length < 2) return null;
  const longitude = Number(parts[0]);
  const latitude = Number(parts[1]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
}

const DETAILED_KINDS = new Set([
  "house",
  "street",
  "metro",
  "railway",
  "station",
  "entrance",
  "airport",
  "vegetation",
  "other",
]);

function settlementRank(kind) {
  if (kind === "locality") return 0;
  if (kind === "district") return 1;
  if (kind === "area") return 2;
  if (kind === "province") return 3;
  if (kind === "street") return 4;
  if (kind === "house") return 5;
  return 8;
}

/** Short label: city / settlement (+ region, country). */
export function formatYandexSettlementLabel(parsed) {
  const city =
    parsed.byKind.locality ||
    parsed.byKind.district ||
    parsed.byKind.area ||
    parsed.name ||
    "";
  const region = parsed.byKind.province || "";
  const country = parsed.byKind.country || "";
  const parts = [];
  if (city) parts.push(city);
  if (region && region !== city) parts.push(region);
  if (country) parts.push(country);
  return parts.join(", ") || parsed.text || parsed.name || "";
}

/**
 * Full address for map picks / house-street results.
 * Prefer Geocoder formatted text (street, house, city…).
 */
export function formatYandexFullAddress(parsed) {
  if (parsed.address?.formatted) return parsed.address.formatted;
  if (parsed.text) return parsed.text;

  const street = parsed.byKind.street || "";
  const house = parsed.byKind.house || "";
  const city =
    parsed.byKind.locality || parsed.byKind.district || parsed.byKind.area || "";
  const region = parsed.byKind.province || "";
  const country = parsed.byKind.country || "";

  const line = [street, house].filter(Boolean).join(", ");
  const parts = [];
  if (line) parts.push(line);
  if (city) parts.push(city);
  if (region && region !== city) parts.push(region);
  if (country) parts.push(country);
  return parts.join(", ") || parsed.name || "";
}

/** Suggestion label: full for detailed kinds, short for settlements. */
export function formatYandexPlaceLabel(parsed) {
  if (DETAILED_KINDS.has(parsed.kind)) {
    return formatYandexFullAddress(parsed);
  }
  return formatYandexSettlementLabel(parsed);
}

async function yandexGeocodeRequest(geocode, { results = 8 } = {}) {
  if (!YANDEX_API_KEY) return null;
  const params = new URLSearchParams({
    apikey: YANDEX_API_KEY,
    format: "json",
    lang: "ru_RU",
    results: String(results),
    geocode,
  });
  const response = await fetch(`https://geocode-maps.yandex.ru/1.x/?${params.toString()}`);
  if (!response.ok) return null;
  const data = await response.json();
  return data?.response?.GeoObjectCollection?.featureMember || [];
}

/** Search places via Yandex Geocoder; Russia first, then worldwide. */
export async function searchYandexPlaces(query) {
  const q = (query || "").trim();
  if (!q || !YANDEX_API_KEY) return null;

  try {
    const [ruMembers, worldMembers] = await Promise.all([
      yandexGeocodeRequest(`${q}, Россия`, { results: 8 }),
      yandexGeocodeRequest(q, { results: 8 }),
    ]);

    const mapped = [];
    const seen = new Set();

    const pushMembers = (members, forceRu) => {
      for (const member of members || []) {
        const parsed = yandexComponents(member);
        const coords = parseYandexPos(parsed.pos);
        if (!coords) continue;
        if (forceRu && parsed.countryCode && parsed.countryCode !== "RU") continue;
        const label = formatYandexPlaceLabel(parsed);
        if (!label) continue;
        const key = `${label.toLowerCase()}|${coords.latitude.toFixed(4)}|${coords.longitude.toFixed(4)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        mapped.push({
          id: key,
          label,
          displayName: parsed.text || label,
          latitude: coords.latitude,
          longitude: coords.longitude,
          countryCode: parsed.countryCode || (forceRu ? "RU" : ""),
          kind: parsed.kind,
          isRussia: parsed.countryCode === "RU" || Boolean(forceRu),
          settlementRank: settlementRank(parsed.kind),
        });
      }
    };

    pushMembers(ruMembers, true);
    pushMembers(worldMembers, false);

    mapped.sort((a, b) => {
      if (a.isRussia !== b.isRussia) return a.isRussia ? -1 : 1;
      if (a.settlementRank !== b.settlementRank) return a.settlementRank - b.settlementRank;
      return a.label.localeCompare(b.label, "ru");
    });

    return mapped.slice(0, 10);
  } catch {
    return null;
  }
}

export async function reverseGeocodeYandex(lat, lng) {
  if (!YANDEX_API_KEY) return null;
  try {
    const members = await yandexGeocodeRequest(`${lng},${lat}`, { results: 1 });
    const member = members?.[0];
    if (!member) return null;
    const parsed = yandexComponents(member);
    return {
      address: formatYandexFullAddress(parsed),
      latitude: lat,
      longitude: lng,
      displayName: parsed.text || "",
    };
  } catch {
    return null;
  }
}

/** Forward-geocode free text (city-only or full address) → best match coords. */
export async function geocodeTextYandex(query) {
  const results = await searchYandexPlaces(query);
  return results?.[0] || null;
}
