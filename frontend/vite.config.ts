import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: parseInt(env.VITE_PORT) || 3000,
      host: env.VITE_HOST || 'localhost',
      hmr: {
        port: parseInt(env.VITE_HMR_PORT) || 24678,
        host: 'localhost',
      },
      cors: true,
    },
    preview: {
      port: parseInt(env.VITE_PORT) || 3000,
      host: env.VITE_HOST || 'localhost',
    },
    define: {
      __APP_ENV__: JSON.stringify(env.NODE_ENV || 'development'),
    },
    build: {
      // Performance optimizations
      target: 'es2015',
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: mode === 'production',
          drop_debugger: mode === 'production',
        },
      },
      rollupOptions: {
        output: {
          manualChunks: {
            // Vendor splitting for better caching
            vendor: ['react', 'react-dom'],
            ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select'],
            query: ['@tanstack/react-query'],
            charts: ['chart.js', 'react-chartjs-2'],
            utils: ['axios', 'clsx', 'tailwind-merge'],
          },
        },
      },
      // Chunk size optimization
      chunkSizeWarningLimit: 1000,
    },
    optimizeDeps: {
      // Pre-bundle common dependencies
      include: [
        'react',
        'react-dom',
        '@tanstack/react-query',
        'axios',
        'clsx',
        'tailwind-merge'
      ],
    },
  }
})