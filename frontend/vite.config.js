// Imports Vite's configuration helper.
import { defineConfig } from 'vite'

// Enables React support in Vite.
import react from '@vitejs/plugin-react'

// Connects Tailwind CSS to Vite.
import tailwindcss from '@tailwindcss/vite'

// Exports the configuration for our JHAIRS frontend.
export default defineConfig({
  plugins: [
    react(),       // Handles React development and JSX.
    tailwindcss(), // Processes our Tailwind CSS styles.
  ],
})
