<template>
  <div id="app-container">
    <TheHeader @toggle-api="store.toggleApiSettings" />

    <ApiSettings
      v-if="store.showApiSettings"
      :initial-api-key="store.apiKey"
      @save-api-key="store.setApiKey"
    />

    <main id="main-content">
      <div class="main-layout-container">
        <FileUpload @files-selected="handleFilesSelected" />

        <ActionControls
          v-if="store.currentFiles.length > 0"
          :can-start="store.canStartOcr"
          :is-processing="store.isLoading"
          :initial-direction="store.initialTextDirection"
          @start-ocr="store.startOcrProcess"
        />

        <div v-if="store.currentFiles.length > 0 || store.hasOcrResult" class="results-area">
           <div class="results-grid">
              <div class="image-display-wrapper" ref="imageCanvasRef">
                 <PdfControls
                   v-if="store.isPdfFile"
                   :current-page="store.currentPage"
                   :total-pages="store.totalPages"
                   :is-loading="store.isLoading"
                   @page-change="store.changePdfPage"
                 />
                 <ImageCanvas
                    :src="store.filePreviewUrl"
                    :is-pdf="store.isPdfFile"
                    @dimensions-known="handleDimensionsKnown"
                    @container-height-update="updateImageContainerHeight"
                 />
              </div>

              <TextOutputManager 
                v-if="store.hasOcrResult || store.currentFiles.length > 0" 
                :container-height="imageContainerHeight"
              />
           </div>

           <CoordinateView v-if="store.hasOcrResult" />
        </div>
         <div v-else class="upload-prompt">
            请上传图片或 PDF 文件开始。
         </div>

      </div>
    </main>

    <FilterControls
      v-if="store.hasOcrResult"
      :bounds="store.filterBounds"
      :initial-filters="store.filterSettings"
      @filters-changed="handleFiltersChanged"
    />

    <LoadingOverlay :is-loading="store.isLoading" :message="store.loadingMessage" />

    <NotificationBar
       :key="store.notification.key"
       :message="store.notification.message"
       :type="store.notification.type"
       :visible="store.notification.visible"
     />
  </div>
</template>

<script setup>
import { useOcrStore } from '@/stores/ocrStore';
import { ref, onMounted, onUnmounted } from 'vue';

// Import Components
import TheHeader from './components/TheHeader.vue';
import ApiSettings from './components/ApiSettings.vue';
import FileUpload from './components/FileUpload.vue';
import ActionControls from './components/ActionControls.vue';
import ImageCanvas from './components/ImageCanvas.vue';
import PdfControls from './components/PdfControls.vue';
import TextOutputManager from './components/TextOutputManager.vue'; // Wrapper for text results
import CoordinateView from './components/CoordinateView.vue';
import FilterControls from './components/FilterControls.vue';
import LoadingOverlay from './components/LoadingOverlay.vue';
import NotificationBar from './components/NotificationBar.vue'; // Handles notification display/timeout

const store = useOcrStore();
const imageCanvasRef = ref(null);
const imageContainerHeight = ref(0);
let resizeObserver = null;

// 更新ImageCanvas容器的高度
const updateImageContainerHeight = (height) => {
  if (height > 0 && height !== imageContainerHeight.value) {
    console.log('更新ImageCanvas容器高度:', height);
    imageContainerHeight.value = height;
  }
};

// 创建ResizeObserver来监听ImageCanvas容器的大小变化
function setupResizeObserver() {
  // 确保浏览器支持ResizeObserver
  if (!window.ResizeObserver) return;
  
  // 查找ImageCanvas容器元素
  const imageCanvasElement = document.querySelector('.image-canvas-container');
  if (!imageCanvasElement) return;
  
  // 创建ResizeObserver
  resizeObserver = new ResizeObserver(entries => {
    const entry = entries[0];
    if (entry && entry.contentRect) {
      // 更新高度状态
      updateImageContainerHeight(entry.contentRect.height);
    }
  });
  
  // 开始观察
  resizeObserver.observe(imageCanvasElement);
}

onMounted(() => {
  // 在组件挂载后设置ResizeObserver
  setTimeout(setupResizeObserver, 500); // 给一些时间让DOM渲染完成
});

onUnmounted(() => {
  // 清理ResizeObserver
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
});

const handleFilesSelected = (files) => {
  console.log('App.vue received files:', files);
  store.loadFiles(files);
};

const handleFiltersChanged = (newFilters) => {
  store.applyFilters(newFilters);
};

// Receive dimensions from ImageCanvas once image/pdf is loaded
const handleDimensionsKnown = ({ width, height }) => {
  store.setImageDimension('width', width);
  store.setImageDimension('height', height);
  
  // 图像加载完成后尝试更新容器高度
  setTimeout(setupResizeObserver, 200);
  
  // If OCR already ran BUT dimensions were unknown, re-setup bounds & re-apply filters
  if (store.hasOcrResult && (!store.imageDimensions.width || !store.imageDimensions.height)) {
    console.log("Dimensions received after OCR, re-calculating bounds and filters.");
    store.setupFilterBounds(width, height);
    store.applyFilters(store.filterSettings); // Re-apply with correct bounds
  }
};
</script>

<style scoped>
#app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding-bottom: 120px; /* 减小底部填充 */
  position: relative;
}

main#main-content {
  flex: 1;
  padding: 2rem;
  overflow-y: auto; /* Allow main content to scroll if needed */
}

.main-layout-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem; /* Consistent gap */
}

.upload-prompt {
    text-align: center;
    color: var(--text-color);
    opacity: 0.7;
    padding: 3rem;
    border: 2px dashed var(--border-color);
    border-radius: 8px;
    background-color: white;
}


.results-area {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.results-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); /* Responsive columns */
    gap: 1.5rem;
    /* Make grid items align start if heights differ */
    align-items: start;
}

.image-display-wrapper {
    display: flex;
    flex-direction: column;
     /* Ensure it takes full height available in its grid cell? Maybe not needed */
}


/* Responsive adjustments if needed */
@media (max-width: 800px) {
  .results-grid {
    grid-template-columns: 1fr; /* Stack on smaller screens */
  }
  main#main-content {
    padding: 1rem;
  }
}
</style>