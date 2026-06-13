import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

/** exports the vite configuration for building a single file. */
export default defineConfig({
  plugins: [viteSingleFile()],
});
