<template>
  <div class="image-canvas-container" ref="containerRef">
    <div v-if="!src" class="placeholder">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
      <p>请先上传文件</p>
    </div>
    <img
      v-else
      :key="src"
      :src="src"
      alt="Image Preview"
      @load="handleImageLoad"
      ref="imageRef"
    />
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { useOcrStore } from '@/stores/ocrStore';

const props = defineProps({
  src: { // Can be blob URL or data URL
    type: String,
    required: true,
  },
  isPdf: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['dimensions-known']);

const store = useOcrStore();
const imageRef = ref(null);
const containerRef = ref(null);
const canvasWrapperRef = ref(null);
const canvasHtml = ref(''); // To hold the canvas HTML if rendered via v-html

// --- Image Loading ---
const handleImageLoad = (event) => {
  const img = event.target;
  if (img.naturalWidth && img.naturalHeight) {
    emit('dimensions-known', { width: img.naturalWidth, height: img.naturalHeight });
    adjustContainerHeight(img.naturalWidth, img.naturalHeight);
  }
};

// --- PDF Rendering (via watching src which holds the data URL from store) ---
watch(() => props.src, (newSrc, oldSrc) => {
   if (props.isPdf && newSrc && newSrc.startsWith('data:image/png;base64,')) {
       // If the src is a data URL from the store's canvas rendering
       // We need to display it, potentially in an <img> tag for simplicity
       // Or reconstruct the canvas if needed, but let's try an img first.
       // If using <img> for PDF, update the template v-else-if condition.
       // For now, let's assume the store handles canvas generation and
       // we just need to know the dimensions which are already in the store.
       // We might not need specific PDF rendering logic here if store does it all.
       // Let's adjust the logic: Assume src is ALWAYS a displayable URL (blob or data)
       // and dimensions come from the store or image load event.
       if (store.imageDimensions.width && store.imageDimensions.height) {
           adjustContainerHeight(store.imageDimensions.width, store.imageDimensions.height);
       }
       // If we switch to displaying the PDF data URL in an <img>:
       // nextTick(() => {
       //   const pdfImg = containerRef.value?.querySelector('img');
       //   if (pdfImg) {
       //     pdfImg.onload = handleImageLoad; // Use the same handler
       //   }
       // });

   } else if (!props.isPdf && newSrc && newSrc.startsWith('blob:')) {
       // Image blob URL - handled by @load on the <img> tag
   }

   // If src clears, reset
   if (!newSrc) {
      // Reset height or other relevant states
      if(containerRef.value) containerRef.value.style.height = '300px'; // Reset to min height
   }
}, { immediate: true }); // Run on initial load too


// Adjust container height based on aspect ratio (like original script)
const adjustContainerHeight = (w, h) => {
    if (!containerRef.value || !w || !h) return;
    const containerWidth = containerRef.value.clientWidth;
    if (!containerWidth) return; // Avoid division by zero

    const aspectRatio = h / w;
    const calculatedHeight = containerWidth * aspectRatio;
    // Ensure a minimum height and reasonable maximum (e.g., 80% of viewport)
    const finalHeight = Math.max(300, Math.min(window.innerHeight * 0.8, calculatedHeight));
    containerRef.value.style.height = `${finalHeight}px`;
};

// Handle resize to readjust height
let resizeObserver;
onMounted(() => {
  // Adjust height if src is already present (e.g., PDF first page rendered)
  if (props.src && store.imageDimensions.width && store.imageDimensions.height) {
       adjustContainerHeight(store.imageDimensions.width, store.imageDimensions.height);
  }

  if (containerRef.value && window.ResizeObserver) {
      resizeObserver = new ResizeObserver(entries => {
          // Avoid infinite loops, check if size actually changed significantly
          const entry = entries[0];
          if (entry.contentRect.width > 0) {
               // Re-calculate height based on new width and STORED dimensions
               adjustContainerHeight(store.imageDimensions.width, store.imageDimensions.height);
          }
      });
      resizeObserver.observe(containerRef.value);
  } else {
      // Fallback or warning if ResizeObserver not supported
      console.warn("ResizeObserver not supported. Container height might not adjust on resize.");
  }
});

onUnmounted(() => {
    if (resizeObserver && containerRef.value) {
        resizeObserver.unobserve(containerRef.value);
    }
    // Revoke blob URL if it was created here (but it's created in store now)
    // if (props.src && props.src.startsWith('blob:')) {
    //     URL.revokeObjectURL(props.src);
    // }
});

</script>

<style scoped>
.image-canvas-container {
    background-color: white;
    border-radius: 8px; /* Adjust based on PdfControls */
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden; /* Important */
    min-height: 300px; /* Default min height */
    position: relative; /* For placeholder positioning */
    width: 100%; /* Take full width of its grid cell */
    /* Height is dynamically set */
}

/* Style for when PDF controls are visible above */
:global(.pdf-nav-visible) .image-canvas-container {
    border-top-left-radius: 0;
    border-top-right-radius: 0;
}

img {
    max-width: 100%;
    max-height: 100%;
    display: block;
    object-fit: contain; /* Keep aspect ratio */
    margin: auto; /* Center image if container is larger */
}

.canvas-wrapper {
    max-width: 100%;
    max-height: 100%;
    display: flex; /* Use flex to center canvas if needed */
    justify-content: center;
    align-items: center;
}
/* Style the dynamically inserted canvas if needed */
.canvas-wrapper canvas {
   max-width: 100%;
   max-height: 100%;
   object-fit: contain;
}


.placeholder {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    color: #a0aec0;
    text-align: center;
    padding: 2rem;
    position: absolute;
    inset: 0; /* Fill container */
}

.placeholder svg {
    margin-bottom: 1rem;
    opacity: 0.5;
    width: 48px;
    height: 48px;
}

.placeholder p {
    font-size: 0.9rem;
}
</style>