import LocationMapPicker, { emptyPlace } from "./LocationMapPicker";

/**
 * Labeled place input (birth/death/burial) with search + map.
 * value: { address, latitude, longitude }
 */
export default function PlaceField({
  label,
  value,
  onChange,
  disabled = false,
  compact = false,
  idPrefix,
  searchPlaceholder,
  addressPlaceholder = "Город или полный адрес",
}) {
  const place = value || emptyPlace();

  return (
    <div className="place-field">
      {label ? <span className="form-label place-field-label">{label}</span> : null}
      <LocationMapPicker
        idPrefix={idPrefix}
        latitude={place.latitude}
        longitude={place.longitude}
        address={place.address}
        disabled={disabled}
        compact={compact}
        searchPlaceholder={searchPlaceholder}
        addressPlaceholder={addressPlaceholder}
        onChange={({ latitude, longitude, address }) =>
          onChange?.({
            address: address || "",
            latitude: latitude ?? null,
            longitude: longitude ?? null,
          })
        }
      />
    </div>
  );
}

export { emptyPlace };
