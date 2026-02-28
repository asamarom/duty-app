import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { readFileSync } from "fs";

// Read version from package.json
const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'));
const appVersion = packageJson.version;
const buildTime = new Date().toISOString();

export default defineConfig({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    '__APP_VERSION__': JSON.stringify(appVersion),
    '__BUILD_TIME__': JSON.stringify(buildTime),
  },
});
