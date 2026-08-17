import React from "react";

export default function LocationPickerMap({
  lattitude,
  longitude,
  className = "",
}) {
  const lat = Number(lattitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const padLng = 0.01;
  const padLat = 0.007;
  const bbox = [
    lng - padLng,
    lat - padLat,
    lng + padLng,
    lat + padLat,
  ].join(",");
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${encodeURIComponent(`${lat},${lng}`)}`;

  return (
    <iframe
      title="Pinned address location"
      className={`address_location_map ${className}`.trim()}
      src={src}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      style={{ border: 0 }}
    />
  );
}
