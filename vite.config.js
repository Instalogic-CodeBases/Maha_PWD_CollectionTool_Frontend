import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// IMPORTANT — read before changing the port:
// The existing backend (DataCollectionTool.Web/Program.cs) sends an HttpOnly auth
// cookie with SameSite=None; Secure and only allows these exact origins in CORS:
//     http://localhost:5500   and   http://127.0.0.1:5500
// The prototype frontend ran on Live Server (port 5500), which is why those two
// origins are whitelisted. To connect this React app to the backend WITHOUT any
// backend change, the dev server must run on that same origin. So we pin Vite to
// port 5500. If you ever move to another port/host, add it to WithOrigins(...) in
// the backend's Program.cs (that is the one place both sides must agree on).
export default defineConfig({
  plugins: [react()],
  server: {
    host: 'localhost',
    port: 5500,
    strictPort: true,
  },
  preview: {
    host: 'localhost',
    port: 5500,
    strictPort: true,
  },
})
