import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.salman.ai",
  appName: "Salman AI",
  webDir: ".output/public", // يجعل التطبيق يقرأ الملفات المحملة داخل APK مباشرة

  server: {
    androidScheme: "https",
    allowNavigation: [
      "salman-ai.lovable.app",
      "*.lovable.app"
    ]
  },

  android: {
    backgroundColor: "#0B0B0B", // يمنع البياض المؤقت ويزيد سرعة الاستجابة
    allowMixedContent: true,
    captureInput: true
  }
};

export default config;
