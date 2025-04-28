// src/main.js
import './assets/base.css' // Import global styles first

import { createApp } from 'vue'
import { createPinia } from 'pinia'


import App from './App.vue'

// --- PDF.js Worker Setup (if using npm package) ---
// Important: Adjust the path based on your Vite config and pdfjs-dist version
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';
import PdfjsWorker from 'pdfjs-dist/legacy/build/pdf.worker.js?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = PdfjsWorker;
// ---------------------------------------------

const app = createApp(App)

app.use(createPinia()) // Use Pinia

app.mount('#app')