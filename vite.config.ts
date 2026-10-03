import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
import pkg from "./package.json" with { type: "json" };

export default defineConfig({
  server: { port: 3000 },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __REPO_URL__: JSON.stringify("https://github.com/hmodymac8-droid/chess-creator-ai"),
  },
  resolve: { tsconfigPaths: true, dedupe: ["react", "react-dom", "@tanstack/react-router"] },
  plugins: [
    tailwindcss(),
    // Use src/server.ts (our SSR error wrapper) as the server entry.
    tanstackStart({ server: { entry: "server" } }),
    nitro(),
    viteReact(),
  ],
});
