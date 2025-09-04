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
      },
    },
    preview: {
      port: parseInt(env.VITE_PORT) || 3000,
      host: env.VITE_HOST || 'localhost',
    },
    define: {
      __APP_ENV__: env.NODE_ENV,
    },
  }
})