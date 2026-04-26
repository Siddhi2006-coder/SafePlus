import * as Location from "expo-location";
import { Platform } from "react-native";

export type Coords = {
  lat: number;
  lng: number;
  accuracy: number | null;
  speed: number | null;
};

export async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS === "web") {
    if (typeof navigator === "undefined" || !navigator.geolocation) return false;
    return true;
  }
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === "granted";
}

export async function getCurrentCoords(): Promise<Coords> {
  if (Platform.OS === "web") {
    return new Promise((resolve, reject) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        reject(new Error("Geolocation not available"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy ?? null,
            speed: pos.coords.speed ?? null,
          }),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 10_000 },
      );
    });
  }
  const pos = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  return {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    accuracy: pos.coords.accuracy ?? null,
    speed: pos.coords.speed ?? null,
  };
}
