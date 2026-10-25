import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";

// Read SEO JSON to inject into HTML
const seoData = JSON.parse(fs.readFileSync('./src/constants/seo.json', 'utf-8'));

const htmlPlugin = () => {
  return {
    name: 'html-transform',
    transformIndexHtml(html: string) {
      return html.replace(/%BASE_URL%/g, seoData.global.baseUrl);
    },
  };
};

export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
    hmr: {
      overlay: true,
      protocol: "ws",
      host: "localhost",
      timeout: 5000,
      clientPort: 3000,
    },
    force: true,
    watch: {
      usePolling: true,
      interval: 1000,
    },
    strictPort: true,
    cors: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  },
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
  plugins: [react(), htmlPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    sourcemap: false,
    minify: "esbuild",
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Keep React and all React-dependent UI libs in one vendor chunk
          // to avoid React.forwardRef undefined errors from chunk load ordering
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/@radix-ui/') ||
            id.includes('node_modules/framer-motion/') ||
            id.includes('node_modules/react-router-dom/') ||
            id.includes('node_modules/react-hook-form/')
          ) return 'vendor';
          if (id.includes('node_modules/firebase/')) return 'firebase';
          if (id.includes('node_modules/lucide-react/')) return 'lucide';
          if (id.includes('node_modules/recharts/')) return 'recharts';
        },
      },
    },
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "vaul",
      "@radix-ui/react-dialog",
      "framer-motion",
      "zustand",
      "react-router-dom"
    ],
    exclude: ["@vite/client", "@vite/env"],
  },
  css: {
    devSourcemap: true,
  },
}));
