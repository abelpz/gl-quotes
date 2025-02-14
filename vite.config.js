import { defineConfig } from "vite";
import babel from "@rollup/plugin-babel";

// import { join } from 'path';

export default defineConfig({
  // cacheDir: '../../node_modules/.vite/pk-core',

  // Uncomment this if you are using workers.
  // worker: {
  //  plugins: [
  //    viteTsConfigPaths({
  //      root: '../../',
  //    }),
  //  ],
  // },

  plugins: [
    babel({
      babelHelpers: "bundled",
      presets: [
        [
          "@babel/preset-env",
          {
            targets: {
              node: "current",
              browsers: "> 0.25%, not dead",
            },
          },
        ],
      ],
      exclude: [/\bcore-js\b/, /\bwebpack\/buildin\b/],
      plugins: ["@babel/plugin-proposal-nullish-coalescing-operator"],
    }),
  ],
  // Configuration for building your library.
  // See: https://vitejs.dev/guide/build.html#library-mode
  build: {
    lib: {
      // Could also be a dictionary or array of multiple entry points.
      entry: "src/index.js",
      name: "uw-quote-helpers",
      fileName: "index",
      // Change this to the formats you want to support.
      // Don't forgot to update your package.json as well.
      formats: ["es", "cjs"],
    },
    rollupOptions: {
      // External packages that should not be bundled into your library.
      external: ["usfm-js"],
    },
    minify: false,
  },
});
