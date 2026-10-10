import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite-plus';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  publicDir: false,
  base: './',
  build: {
    outDir: 'dist/webview',
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: {
        config: fileURLToPath(new URL('./src/webview/config/main.ts', import.meta.url)),
      },
    },
  },
  pack: {
    entry: ['src/extension.ts'],
    format: ['cjs'],
    platform: 'node',
    deps: { neverBundle: ['vscode'] },
    outExtensions: () => ({ js: '.js' }),
    sourcemap: true,
    minify: true,
    outDir: 'dist',
    clean: false,
  },
  lint: {
    ignorePatterns: ['dist/**'],
    options: { typeAware: true, typeCheck: true },
  },
  fmt: {
    ignorePatterns: ['dist/**', 'docs/**', 'TODO.md'],
    singleQuote: true,
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
