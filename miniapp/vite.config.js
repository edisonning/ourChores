import { defineConfig } from "vite";
import uni from "@dcloudio/vite-plugin-uni";
import fs from "node:fs";
import { publicConfig } from "./scripts/public-config.mjs";
const rootEnv = new URL("../.env", import.meta.url);
const config = publicConfig(
  fs.existsSync(rootEnv) ? fs.readFileSync(rootEnv, "utf8") : "",
);
export default defineConfig({
  plugins: [uni.default ? uni.default() : uni()],
  define: {
    "import.meta.env.VITE_API_BASE_URL": JSON.stringify(
      process.env.VITE_API_BASE_URL ||
        config.api ||
        "http://127.0.0.1:3000/api",
    ),
  },
});
