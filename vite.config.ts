import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Base path '/' is used. For subpath hosting, change `base` here and in manifest start_url.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
});
