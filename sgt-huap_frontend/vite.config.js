import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        host: true,   // permite acceder desde la red local o túneles
        port: 5173,   // opcional
        allowedHosts: true, // acepta cualquier host en desarrollo (útil con ngrok)
        cors: true,
        proxy: {
            // Proxyear llamadas a /api hacia el backend Spring Boot en localhost:8080
            '/api': {
                target: 'http://localhost:8080',
                changeOrigin: true,
                secure: false,
                rewrite: (path) => path.replace(/^\/api/, '/api')
            }
        }
    }
})
