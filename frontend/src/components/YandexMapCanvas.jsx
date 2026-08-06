import { useEffect, useRef, useState } from "react";
import { getYandexMapsApiKey, loadYandexMaps } from "../utils/yandexMaps";

const IRKUTSK_CENTER = [52.286974, 104.305018];
const DEFAULT_ZOOM = 12;

/**
 * Interactive Yandex map: click or drag placemark to pick coordinates.
 * Coords are [lat, lng] in Yandex API 2.1.
 */
export default function YandexMapCanvas({
  latitude,
  longitude,
  onPick,
  disabled = false,
  className = "location-map",
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const placemarkRef = useRef(null);
  const onPickRef = useRef(onPick);
  const disabledRef = useRef(disabled);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  useEffect(() => {
    let cancelled = false;
    let map = null;

    loadYandexMaps()
      .then((ymaps) => {
        if (cancelled || !containerRef.current) return;

        const hasPoint = typeof latitude === "number" && typeof longitude === "number";
        const center = hasPoint ? [latitude, longitude] : IRKUTSK_CENTER;

        map = new ymaps.Map(
          containerRef.current,
          {
            center,
            zoom: hasPoint ? 12 : DEFAULT_ZOOM,
            controls: ["zoomControl", "geolocationControl", "typeSelector"],
          },
          { suppressMapOpenBlock: true },
        );
        mapRef.current = map;

        const setPlacemark = (lat, lng) => {
          if (!map) return;
          if (placemarkRef.current) {
            placemarkRef.current.geometry.setCoordinates([lat, lng]);
            return;
          }
          const placemark = new ymaps.Placemark(
            [lat, lng],
            {},
            {
              preset: "islands#redIcon",
              draggable: !disabledRef.current,
            },
          );
          placemark.events.add("dragend", () => {
            if (disabledRef.current) return;
            const coords = placemark.geometry.getCoordinates();
            onPickRef.current?.(coords[0], coords[1]);
          });
          map.geoObjects.add(placemark);
          placemarkRef.current = placemark;
        };

        if (hasPoint) setPlacemark(latitude, longitude);

        map.events.add("click", (e) => {
          if (disabledRef.current) return;
          const coords = e.get("coords");
          setPlacemark(coords[0], coords[1]);
          onPickRef.current?.(coords[0], coords[1]);
        });

        if (!cancelled) {
          setReady(true);
          setError("");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(
            getYandexMapsApiKey()
              ? "Не удалось загрузить Яндекс.Карты"
              : "Укажите VITE_YANDEX_MAPS_API_KEY в frontend/.env для карты Яндекса",
          );
        }
      });

    return () => {
      cancelled = true;
      placemarkRef.current = null;
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
    // Init once per mount; coords sync below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (typeof latitude !== "number" || typeof longitude !== "number") {
      if (placemarkRef.current) {
        map.geoObjects.remove(placemarkRef.current);
        placemarkRef.current = null;
      }
      return;
    }

    if (placemarkRef.current) {
      placemarkRef.current.geometry.setCoordinates([latitude, longitude]);
      placemarkRef.current.options.set("draggable", !disabled);
    } else {
      loadYandexMaps().then((ymaps) => {
        if (!mapRef.current) return;
        const placemark = new ymaps.Placemark(
          [latitude, longitude],
          {},
          { preset: "islands#redIcon", draggable: !disabled },
        );
        placemark.events.add("dragend", () => {
          if (disabledRef.current) return;
          const coords = placemark.geometry.getCoordinates();
          onPickRef.current?.(coords[0], coords[1]);
        });
        mapRef.current.geoObjects.add(placemark);
        placemarkRef.current = placemark;
      });
    }
    map.setCenter([latitude, longitude], Math.max(map.getZoom(), 12), { duration: 200 });
  }, [latitude, longitude, disabled, ready]);

  return (
    <div className="yandex-map-wrap">
      <div ref={containerRef} className={className} />
      {!ready && !error ? <p className="yandex-map-status">Загружаем карту…</p> : null}
      {error ? <p className="yandex-map-error">{error}</p> : null}
    </div>
  );
}
