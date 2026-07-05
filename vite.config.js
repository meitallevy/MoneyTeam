import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' keeps asset URLs relative, so the build works whether it's served
// from https://user.github.io/repo/ or a custom domain. Paired with HashRouter,
// deep links never 404 on GitHub Pages.
export default defineConfig({
  plugins: [react()],
  base: './',
})
