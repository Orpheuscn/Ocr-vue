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
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';

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
  if (height > 0) {
    // 获取整个image-display-wrapper的高度
    if (imageCanvasRef.value) {
      // 如果是PDF，需要考虑pdf-nav-container的高度
      if (store.isPdfFile) {
        // 找到pdf-nav-container元素
        const pdfNavContainer = imageCanvasRef.value.querySelector('.pdf-nav-container');
        const pdfNavHeight = pdfNavContainer ? pdfNavContainer.offsetHeight : 0;
        
        // 计算总高度 = 图像容器高度 + PDF导航高度
        const totalHeight = height + pdfNavHeight;
        
        if (totalHeight !== imageContainerHeight.value) {
          console.log('更新总容器高度:', totalHeight, '(包含PDF导航高度:', pdfNavHeight, ')');
          imageContainerHeight.value = totalHeight;
        }
      } else {
        // 对于普通图像，直接使用图像容器高度
        if (height !== imageContainerHeight.value) {
          console.log('更新图像容器高度:', height);
          imageContainerHeight.value = height;
        }
      }
    }
  }
};

// 创建ResizeObserver来监听ImageCanvas容器的大小变化
function setupResizeObserver() {
  // 确保浏览器支持ResizeObserver
  if (!window.ResizeObserver) return;
  
  // 首先清理现有的ResizeObserver
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
  
  // 如果是PDF，监听整个image-display-wrapper，否则监听image-canvas-container
  let targetElement;
  
  if (store.isPdfFile && imageCanvasRef.value) {
    // 对于PDF，监听整个wrapper
    targetElement = imageCanvasRef.value;
    console.log('设置ResizeObserver监听image-display-wrapper');
  } else {
    // 对于普通图像，监听canvas容器
    targetElement = document.querySelector('.image-canvas-container');
    console.log('设置ResizeObserver监听image-canvas-container');
  }
  
  if (!targetElement) return;
  
  // 创建ResizeObserver
  resizeObserver = new ResizeObserver(entries => {
    const entry = entries[0];
    if (entry && entry.contentRect) {
      if (store.isPdfFile) {
        // 对于PDF，直接获取整个wrapper的高度
        updateImageContainerHeight(entry.contentRect.height);
      } else {
        // 对于普通图像，重新计算高度
        adjustImageHeight();
      }
    }
  });
  
  // 开始观察
  resizeObserver.observe(targetElement);
}

// 辅助函数: 调整图像高度
function adjustImageHeight() {
  if (store.imageDimensions.width && store.imageDimensions.height) {
    const imageCanvasElement = document.querySelector('.image-canvas-container');
    if (imageCanvasElement) {
      // 使用容器宽度和图像比例计算合适的高度
      const containerWidth = imageCanvasElement.clientWidth;
      const aspectRatio = store.imageDimensions.height / store.imageDimensions.width;
      const calculatedHeight = containerWidth * aspectRatio;
      
      // 确保高度适中
      const finalHeight = Math.max(300, Math.min(window.innerHeight * 0.8, calculatedHeight));
      
      // 更新高度
      updateImageContainerHeight(finalHeight);
    }
  }
}

// 强制同步两个组件的高度
function syncComponentHeights() {
  nextTick(() => {
    // 获取两个组件元素
    const imageWrapper = document.querySelector('.image-display-wrapper');
    const textManager = document.querySelector('.text-output-manager');
    
    if (!imageWrapper || !textManager) return;
    
    // 获取当前高度
    const imageHeight = imageWrapper.offsetHeight;
    const textHeight = textManager.offsetHeight;
    
    // 使用较大的高度
    const maxHeight = Math.max(imageHeight, textHeight, 300);
    
    console.log('同步高度:', maxHeight, '(图片高度:', imageHeight, ', 文本高度:', textHeight, ')');
    
    // 设置两个组件的高度
    imageWrapper.style.height = `${maxHeight}px`;
    textManager.style.height = `${maxHeight}px`;
  });
}

onMounted(() => {
  // 在组件挂载后设置ResizeObserver
  setTimeout(setupResizeObserver, 500); // 给一些时间让DOM渲染完成
  // 初始加载后
  setTimeout(syncComponentHeights, 500);
});

onUnmounted(() => {
  // 清理ResizeObserver
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
  window.removeEventListener('resize', () => {
    clearTimeout(resizeTimer);
  });
});

const handleFilesSelected = (files) => {
  console.log('App.vue received files:', files);
  store.loadFiles(files);
};

const handleFiltersChanged = (newFilters) => {
  store.applyFilters(newFilters);
};

// Handle dimensions from ImageCanvas once image/pdf is loaded
const handleDimensionsKnown = ({ width, height }) => {
  store.setImageDimension('width', width);
  store.setImageDimension('height', height);
  
  // 图像加载完成后尝试重新设置ResizeObserver
  setTimeout(() => {
    setupResizeObserver();
    
    // 对于PDF文件，立即手动计算一次高度
    if (store.isPdfFile && imageCanvasRef.value) {
      const pdfNavContainer = imageCanvasRef.value.querySelector('.pdf-nav-container');
      const pdfNavHeight = pdfNavContainer ? pdfNavContainer.offsetHeight : 0;
      
      const imageCanvasElement = document.querySelector('.image-canvas-container');
      if (imageCanvasElement) {
        const canvasHeight = imageCanvasElement.offsetHeight;
        updateImageContainerHeight(canvasHeight); // 会内部处理PDF导航高度
      }
    }
  }, 300);
  
  // If OCR already ran BUT dimensions were unknown, re-setup bounds & re-apply filters
  if (store.hasOcrResult && (!store.imageDimensions.width || !store.imageDimensions.height)) {
    console.log("Dimensions received after OCR, re-calculating bounds and filters.");
    store.setupFilterBounds(width, height);
    store.applyFilters(store.filterSettings); // Re-apply with correct bounds
  }
};

// 监听PDF页面变化
watch(() => store.currentPage, (newPage, oldPage) => {
  if (newPage !== oldPage && store.isPdfFile) {
    // PDF页面变化后，给足够时间让新页面渲染，然后重新计算高度
    setTimeout(() => {
      console.log('PDF页面切换，重新计算高度');
      setupResizeObserver();
      
      // 手动触发一次高度更新
      if (imageCanvasRef.value) {
        const imageCanvasElement = document.querySelector('.image-canvas-container');
        if (imageCanvasElement) {
          updateImageContainerHeight(imageCanvasElement.offsetHeight);
        }
      }
    }, 500); // 给足够的时间让PDF渲染
  }
});

// 文件预览URL变化时
watch(() => store.filePreviewUrl, () => {
  setTimeout(syncComponentHeights, 500);
});

// PDF页面变化时
watch(() => store.currentPage, () => {
  if (store.isPdfFile) {
    setTimeout(syncComponentHeights, 800);
  }
});

// OCR结果变化时
watch(() => store.hasOcrResult, () => {
  setTimeout(syncComponentHeights, 500);
});

// 窗口大小变化时
let resizeTimer;
onMounted(() => {
  window.addEventListener('resize', () => {
    // 使用防抖避免频繁触发
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(syncComponentHeights, 200);
  });
});

onUnmounted(() => {
  window.removeEventListener('resize', () => {
    clearTimeout(resizeTimer);
  });
});
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
    position: relative; /* 使子元素的绝对定位相对于此容器 */
    min-height: 300px; /* 最小高度 */
    overflow: visible; /* 确保内容可以溢出 */
}

/* 添加清除浮动的伪元素 */
.results-grid::after {
    content: "";
    display: table;
    clear: both;
}

.image-display-wrapper, :deep(.text-output-manager) {
    height: 100%; /* 确保两个组件都占满整个单元格高度 */
    min-height: 300px; /* 设置最小高度 */
}

/* 使用flex-direction: column确保内部元素垂直排列并填充空间 */
.image-display-wrapper {
    display: flex;
    flex-direction: column;
}

:deep(.text-output-manager) {
    display: flex;
    flex-direction: column;
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