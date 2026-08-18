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

export const getGoogleMapsUrl = (address) => {
  const lat = parseCoord(address?.lattitude);
  const lng = parseCoord(address?.longitude);
  if (lat == null || lng == null) return "";
  return `https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}`;
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

  let settled = false;
  let watchId = null;
  let bestPos = null;
  let finishTimer = null;
  let hardTimeout = null;

  const cleanup = () => {
    if (watchId != null && navigator.geolocation?.clearWatch) {
      navigator.geolocation.clearWatch(watchId);
    }
    if (finishTimer) window.clearTimeout(finishTimer);
    if (hardTimeout) window.clearTimeout(hardTimeout);
  };

  const resolveBest = () => {
    if (settled) return;
    settled = true;
    cleanup();
    if (!bestPos?.coords) {
      reject(new Error("GEO_FAILED"));
      return;
    }
    resolve({
      lattitude: bestPos.coords.latitude,
      longitude: bestPos.coords.longitude,
      accuracy: Number.isFinite(bestPos.coords.accuracy) ? bestPos.coords.accuracy : null,
    });
  };

  const onSuccess = (pos) => {
    const accuracy = Number(pos?.coords?.accuracy);
    const bestAccuracy = Number(bestPos?.coords?.accuracy);

    if (!bestPos || (Number.isFinite(accuracy) && (!Number.isFinite(bestAccuracy) || accuracy < bestAccuracy))) {
      bestPos = pos;
    }

    // Good enough: stop early once the device gives a solid fix.
    if (Number.isFinite(accuracy) && accuracy <= 30) {
      resolveBest();
      return;
    }

    // Otherwise wait a bit in case the browser refines the location.
    if (finishTimer) window.clearTimeout(finishTimer);
    finishTimer = window.setTimeout(resolveBest, 2500);
  };

  const onError = (err) => {
    if (bestPos?.coords) {
      resolveBest();
      return;
    }
    cleanup();
    if (err?.code === 1) reject(new Error("GEO_DENIED"));
    else if (err?.code === 2) reject(new Error("GEO_UNAVAILABLE"));
    else reject(new Error("GEO_FAILED"));
  };

  hardTimeout = window.setTimeout(resolveBest, 12000);

  if (typeof navigator.geolocation.watchPosition === "function") {
    watchId = navigator.geolocation.watchPosition(
      onSuccess,
      onError,
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      bestPos = pos;
      resolveBest();
    },
    onError,
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
});
