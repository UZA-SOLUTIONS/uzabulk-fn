const DEVICE_ID_STORE = "uza-retail-device-id";

export const generateUUID = () =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

export const getDeviceId = () => {
  let deviceId = localStorage.getItem(DEVICE_ID_STORE);
  if (!deviceId) {
    deviceId = generateUUID();
    localStorage.setItem(DEVICE_ID_STORE, deviceId);
  }
  return deviceId;
};
