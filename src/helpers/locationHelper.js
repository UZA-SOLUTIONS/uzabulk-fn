export const parseCoord = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

export const hasPinnedLocation = (address) => (
  parseCoord(address?.lattitude) != null && parseCoord(address?.longitude) != null
);

export const formatPinnedCoords = (address) => {
  const lat = parseCoord(address?.lattitude);
  const lng = parseCoord(address?.longitude);
  if (lat == null || lng == null) return "";
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
};

/** Text fields from GPS only — no reverse-geocode place names. */
export const buildGpsAddressFields = (lattitude, longitude) => {
  const lat = parseCoord(lattitude);
  const lng = parseCoord(longitude);
  if (lat == null || lng == null) return null;
  const coords = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  return {
    lattitude: lat,
    longitude: lng,
    area: "GPS",
    address: coords,
    houseNo: "N/A",
    landmark: "Current location",
  };
};

export const getCurrentPosition = () => new Promise((resolve, reject) => {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    reject(new Error("GEO_UNAVAILABLE"));
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => resolve({
      lattitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
    }),
    (err) => {
      if (err?.code === 1) reject(new Error("GEO_DENIED"));
      else reject(new Error("GEO_FAILED"));
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
});
