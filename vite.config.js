import { defineConfig } from 'vite'

export default defineConfig({
  // Vite root is the project root (where index.html is)
  root: './',
  // Assets in public/ are served at /
  publicDir: 'public',
  build: {
    outDir: 'dist',
    // Ensure assets are copied
    assetsDir: 'assets',
  }
})
