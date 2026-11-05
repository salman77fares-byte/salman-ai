import { Capacitor } from "@capacitor/core";

export const NATIVE_AUTH_SCHEME = "com.salman.ai";
export const NATIVE_AUTH_PAGE = "https://salman-ai.lovable.app/auth/native";

export function isNativeApp(): boolean {
  try {
    if (Capacitor.isNativePlatform()) return true;
  } catch {
    /* ignore */
  }
  if (typeof window === "undefined") return false;
  const w = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
  if (w.Capacitor?.isNativePlatform?.()) return true;
  // Android WebView marks its user agent with "; wv)"
  return /Android.*; wv\)/.test(navigator.userAgent);
}

/** Opens Google sign-in in a Chrome Custom Tab sheet over the app. */
export async function openNativeGoogleSignIn() {
  try {
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url: NATIVE_AUTH_PAGE, presentationStyle: "popover" });
  } catch {
    // Fallback: hand the page to the system browser.
    window.open(NATIVE_AUTH_PAGE, "_system");
  }
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
