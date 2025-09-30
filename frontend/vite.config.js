import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['pdfjs-dist']
  },
  worker: {
    format: 'es'
  },
  assetsInclude: ['**/*.pdf'],
  server: {
    fs: {
      allow: ['..']
    }
  },
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      // Handle Node.js modules for browser compatibility
      'fs': false,
      'path': false,
      'stream': false,
    }
  },
  build: {
    // Increase memory allocation for build
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      external: ['fs', 'path', 'stream'],
      output: {
        manualChunks: {
          // Split vendor libraries into separate chunks
          vendor: ['react', 'react-dom'],
          antd: ['antd'],
          redux: ['@reduxjs/toolkit', 'react-redux', 'redux-persist'],
          pdf: ['pdfjs-dist'],
          utils: ['axios', 'mammoth']
        }
      }
    },
    // Use esbuild instead of terser for faster builds
    minify: 'esbuild',
    target: 'esnext',
    // Optimize build performance
    sourcemap: false,
    // Reduce bundle size
    cssCodeSplit: true,
  }
})
