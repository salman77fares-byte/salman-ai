import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.salman.ai",
  appName: "Salman AI",
  webDir: ".output/public",

  android: {
    backgroundColor: "#0B0B0B",
    allowMixedContent: true,
    captureInput: true
  }
};

export default config;
