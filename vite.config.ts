import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    build: {
      outDir: ".output/public",
      emptyOutDir: false,
    },
    plugins: [
      {
        name: "strip-lovable-badge",
        configResolved(config) {
          // تصفية وحذف أي إضافة تحقن الشارة آلياً
          (config.plugins as any[]) = config.plugins.filter(
            (plugin) =>
              !plugin.name.includes("lovable") &&
              !plugin.name.includes("gptengineer") &&
              !plugin.name.includes("component-tagger")
          );
        },
        transformIndexHtml(html) {
          // مسح أي سكربت محقون داخل الـ HTML
          return html
            .replace(/<script[^>]*gptengineer[^>]*><\/script>/gi, "")
            .replace(/<script[^>]*lovable[^>]*><\/script>/gi, "");
        },
      },
    ],
  },
});
