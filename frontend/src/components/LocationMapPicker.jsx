import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const IRKUTSK_CENTER = [52.286974, 104.305018];
const DEFAULT_ZOOM = 12;

const defaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = defaultIcon;

function ClickHandler({ onPick }) {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

function RecenterOnPick({ latitude, longitude }) {
  const map = useMap();

  useEffect(() => {
    if (typeof latitude === "number" && typeof longitude === "number") {
      map.setView([latitude, longitude], Math.max(map.getZoom(), 15));
    }
  }, [map, latitude, longitude]);

  return null;
}

function formatCoords(lat, lng) {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=ru`;
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.display_name || null;
  } catch {
    return null;
  }
}

export default function LocationMapPicker({
  latitude,
  longitude,
  address,
  onChange,
}) {
  const [isGeocoding, setIsGeocoding] = useState(false);

  const position = useMemo(() => {
    if (typeof latitude === "number" && typeof longitude === "number") {
      return [latitude, longitude];
    }
    return null;
  }, [latitude, longitude]);

  const handlePick = async (lat, lng) => {
    setIsGeocoding(true);
    const resolvedAddress = await reverseGeocode(lat, lng);
    setIsGeocoding(false);
    onChange({
      latitude: lat,
      longitude: lng,
      address: resolvedAddress || address || "",
      coordsText: formatCoords(lat, lng),
    });
  };

  const clearPoint = () => {
    onChange({
      latitude: null,
      longitude: null,
      address: "",
      coordsText: "",
    });
  };

  return (
    <div className="location-picker">
      <div className="location-picker-map">
        <MapContainer
          center={IRKUTSK_CENTER}
          zoom={DEFAULT_ZOOM}
          scrollWheelZoom
          className="location-map"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onPick={handlePick} />
          <RecenterOnPick latitude={latitude} longitude={longitude} />
          {position ? <Marker position={position} /> : null}
        </MapContainer>
      </div>

      <p className="hint-text location-picker-hint">
        Карта открыта на Иркутске. Кликните по карте, чтобы поставить отметку.
        {isGeocoding ? " Определяем адрес…" : ""}
      </p>

      <div className="form-grid">
        <div>
          <label className="form-label" htmlFor="card-location-address">
            Адрес
          </label>
          <input
            id="card-location-address"
            placeholder="Адрес, участок, ряд — можно уточнить вручную"
            value={address || ""}
            onChange={(e) =>
              onChange({
                latitude,
                longitude,
                address: e.target.value,
                coordsText:
                  typeof latitude === "number" && typeof longitude === "number"
                    ? formatCoords(latitude, longitude)
                    : "",
              })
            }
          />
        </div>
        <div>
          <label className="form-label" htmlFor="card-location-coords">
            Координаты
          </label>
          <div className="location-coords-row">
            <input
              id="card-location-coords"
              readOnly
              placeholder="Выберите точку на карте"
              value={
                typeof latitude === "number" && typeof longitude === "number"
                  ? formatCoords(latitude, longitude)
                  : ""
              }
            />
            {(latitude != null || address) && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={clearPoint}>
                Сбросить
              </button>
            )}
          </div>
        </div>
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
