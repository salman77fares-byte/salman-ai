import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  vite: {
    base: "/", // تغيير المسار إلى / ليعمل بشكل صحيح مع سيرفر Capacitor المحالي (https://localhost)
    build: {
      outDir: "dist",
      emptyOutDir: true,
    },
    plugins: [
      {
        name: "strip-lovable-badge",
        configResolved(config) {
          (config.plugins as any[]) = config.plugins.filter(
            (plugin) =>
              !plugin.name.includes("lovable") &&
              !plugin.name.includes("gptengineer") &&
              !plugin.name.includes("component-tagger")
          );
        },
        transformIndexHtml(html) {
          return html
            .replace(/<script[^>]*gptengineer[^>]*><\/script>/gi, "")
            .replace(/<script[^>]*lovable[^>]*><\/script>/gi, "");
        },
      },
    ],
  },
});
