/**
 * Карта места памяти через виджет Яндекс.Карт — без Leaflet/OSM.
 */
export default function MemorialLocationMap({
  latitude,
  longitude,
  label = "Место памяти",
  zoom = 16,
}) {
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return <div className="memorial-map-placeholder">Отметка на карте</div>;
  }

  const src =
    `https://yandex.ru/map-widget/v1/?ll=${longitude}%2C${latitude}` +
    `&z=${zoom}` +
    `&pt=${longitude},${latitude},pm2rdm` +
    `&l=map`;

  return (
    <div className="memorial-map">
      <iframe
        className="memorial-map-canvas"
        title={label}
        src={src}
        loading="lazy"
        allowFullScreen
      />
      <p className="memorial-map-caption">{label}</p>
    </div>
  );
}
