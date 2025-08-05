import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import fs from "fs";

export default defineConfig({
  plugins: [tailwindcss()],
  server: {
    https: {
      key: fs.readFileSync("../certs/server.key"),
      cert: fs.readFileSync("../certs/server.crt"),
    },
    port: 5173,
    host: "localhost",
  },
});
