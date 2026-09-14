import { Network } from "@capacitor/network";

export async function isNetworkAvailable(): Promise<boolean> {
  try {
    const status = await Network.getStatus();
    return status.connected;
  } catch {
    return navigator.onLine;
  }
}

export async function waitForNetwork(): Promise<boolean> {
  return isNetworkAvailable();
}
