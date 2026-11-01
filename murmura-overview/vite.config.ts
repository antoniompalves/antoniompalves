import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Relative asset paths: the same build works at a domain's root or under a path (e.g. /kataru on cPanel).
  base: './',
})
