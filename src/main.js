// src/main.js
import './assets/base.css' // Import global styles first
import './assets/index.css' // Import Tailwind CSS

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'

import App from './App.vue'

// --- PDF.js Worker Setup (using global object) ---
// PDF.js is now included via script tags in index.html
// No need to import here
// ---------------------------------------------

const app = createApp(App)

app.use(createPinia()) // Use Pinia
app.use(router) // Use Router

app.mount('#app')