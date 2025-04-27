// src/main.js
import './assets/base.css' // Import global styles first

import { createApp } from 'vue'
import { createPinia } from 'pinia'


import App from './App.vue'

// --- PDF.js Worker Setup (if using npm package) ---
// Important: Adjust the path based on your Vite config and pdfjs-dist version
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
if (pdfjsLib.GlobalWorkerOptions) {
  // Check vite.config.js for publicDir settings if worker path is tricky
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.js', // Path relative to output dir maybe? Vite can be tricky here.
                                            // Or provide an absolute URL to a hosted worker.
    import.meta.url
  ).toString();
   // Alternative: Copy worker file to public dir via vite config or manually
   // pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
   // Check console errors during PDF load if worker fails.
}
// ---------------------------------------------

const app = createApp(App)

app.use(createPinia()) // Use Pinia

app.mount('#app')