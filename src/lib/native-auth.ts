import { Capacitor } from "@capacitor/core";

export const NATIVE_AUTH_SCHEME = "com.salman.ai";
export const NATIVE_AUTH_PAGE = "https://salman-ai.lovable.app/auth/native";

export function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/** Opens Google sign-in in a Chrome Custom Tab sheet over the app. */
export async function openNativeGoogleSignIn() {
  const { Browser } = await import("@capacitor/browser");
  await Browser.open({ url: NATIVE_AUTH_PAGE, presentationStyle: "popover" });
}

/** Parses com.salman.ai://auth#access_token=..&refresh_token=.. */
export function parseNativeAuthUrl(url: string) {
  if (!url.startsWith(`${NATIVE_AUTH_SCHEME}://auth`)) return null;
  const hash = url.split("#")[1] ?? "";
  const params = new URLSearchParams(hash);
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  if (!access_token || !refresh_token) return { error: params.get("error") ?? "missing_tokens" };
  return { access_token, refresh_token };
}
