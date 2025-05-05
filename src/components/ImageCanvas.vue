<template>
  <div class="card bg-base-100 shadow-md w-full h-full overflow-hidden" ref="containerRef">
    <div class="card-body p-4 flex items-center justify-center h-full">
      <!-- 无文件时的占位提示 -->
      <div v-if="!src" class="flex flex-col items-center justify-center text-center h-full w-full opacity-70">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      <p>请先上传文件</p>
    </div>

      <!-- 图片或PDF预览 -->
      <div v-else class="image-container w-full h-full flex items-center justify-center" :style="imageContainerStyle">
    <img
      :key="src"
      :src="src"
          alt="预览"
      @load="handleImageLoad"
      ref="imageRef"
          class="object-contain rounded-md"
          :style="imageStyle"
    />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { useOcrStore } from '@/stores/ocrStore';

const props = defineProps({
  src: { // Can be blob URL or data URL
    type: String,
    default: '',
  },
  isPdf: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['dimensions-known', 'container-height-update']);

const store = useOcrStore();
const imageRef = ref(null);
const containerRef = ref(null);

// 原始图片尺寸
const originalDimensions = ref({ width: 0, height: 0 });
// 容器实际尺寸
const containerDimensions = ref({ width: 0, height: 0 });
// 计算的高度
const calculatedHeight = ref(0);

// 当图片加载完成时
const handleImageLoad = (event) => {
  const img = event.target;
  
  if (img.naturalWidth && img.naturalHeight) {
    // 保存原始尺寸
    originalDimensions.value = {
      width: img.naturalWidth,
      height: img.naturalHeight
    };
    
    // 通知父组件
    emit('dimensions-known', { 
      width: img.naturalWidth, 
      height: img.naturalHeight 
    });
    
    // 更新store
    store.setImageDimension('width', img.naturalWidth);
    store.setImageDimension('height', img.naturalHeight);
    
    // 计算并设置容器高度
    calculateContainerHeight();
  }
};

// 计算容器高度
const calculateContainerHeight = () => {
  if (!containerRef.value || !originalDimensions.value.width || !originalDimensions.value.height) return;
  
  // 获取当前容器宽度
  const containerWidth = containerRef.value.clientWidth - 32; // 减去padding (16px * 2)
  
  // 保存容器尺寸
  containerDimensions.value = {
    width: containerWidth,
    height: containerRef.value.clientHeight
  };
  
  // 根据原始比例计算高度
  const aspectRatio = originalDimensions.value.height / originalDimensions.value.width;
  let idealHeight = containerWidth * aspectRatio;
  
  // 设置上限和下限 - 增加高度
  const viewportHeight = window.innerHeight;
  const maxHeight = Math.min(viewportHeight * 0.85, 1200); // 最大可达1200px或视窗85%
  const minHeight = Math.max(500, viewportHeight * 0.7); // 最小不低于500px且至少有视窗70%高
  
  // 最终高度：根据原始比例，但在合理范围内
  calculatedHeight.value = Math.max(minHeight, Math.min(maxHeight, idealHeight));
  
  // 调整容器高度
  containerRef.value.style.height = `${calculatedHeight.value}px`;
  
  // 通知父组件高度已更新
  nextTick(() => {
    emit('container-height-update', calculatedHeight.value);
  });
};

// 响应式调整容器样式
const imageContainerStyle = computed(() => ({
  height: calculatedHeight.value > 0 ? `${calculatedHeight.value}px` : 'auto'
}));

// 响应式调整图片样式
const imageStyle = computed(() => {
  if (!originalDimensions.value.width) return {};
  
  return {
    maxWidth: '100%',
    maxHeight: `${calculatedHeight.value}px`,
    width: 'auto',
    height: 'auto'
  };
});

// 设置调整大小的观察器
let resizeObserver;
onMounted(() => {
  // 设置窗口大小变化的监听
  window.addEventListener('resize', calculateContainerHeight);
       
  // 启用ResizeObserver以监听容器大小变化
  if (window.ResizeObserver) {
    resizeObserver = new ResizeObserver(() => {
      calculateContainerHeight();
    });
    
         if (containerRef.value) {
      resizeObserver.observe(containerRef.value);
         }
  }
  
  // 如果已有尺寸信息，立即计算
  if (props.src && store.imageDimensions.width && store.imageDimensions.height) {
    originalDimensions.value = {
      width: store.imageDimensions.width,
      height: store.imageDimensions.height
    };
               
    // 延迟一下，确保DOM已完全渲染
    nextTick(() => {
      calculateContainerHeight();
    });
  }
});

onUnmounted(() => {
  // 清理事件监听
  window.removeEventListener('resize', calculateContainerHeight);
  
  // 清理ResizeObserver
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
});

// 监听src变化
watch(() => props.src, (newSrc) => {
  if (newSrc) {
    // 对于PDF，src变化通常意味着页面变化
    if (props.isPdf) {
      // 使用store中的尺寸信息
      if (store.imageDimensions.width && store.imageDimensions.height) {
        originalDimensions.value = {
          width: store.imageDimensions.width,
          height: store.imageDimensions.height
        };
        
        // 延迟执行，确保新PDF页面已加载
        setTimeout(() => {
          calculateContainerHeight();
        }, 300);
      }
    }
    // 对于普通图片，handleImageLoad会处理
  } else {
    // 清除src时重置尺寸
    originalDimensions.value = { width: 0, height: 0 };
    calculatedHeight.value = 300; // 重置为默认高度
    
    if (containerRef.value) {
      containerRef.value.style.height = '300px';
    }
  }
}, { immediate: true });

// 监听store中的图片尺寸变化
watch(() => [store.imageDimensions.width, store.imageDimensions.height], 
  ([newWidth, newHeight]) => {
    if (newWidth && newHeight && props.isPdf) {
      originalDimensions.value = {
        width: newWidth,
        height: newHeight
      };
      
      // 重新计算高度
      nextTick(() => {
        calculateContainerHeight();
      });
    }
  }, 
  { deep: true }
);
</script>

<style scoped>
.image-container {
  transition: height 0.3s ease;
    display: flex;
  align-items: center;
    justify-content: center;
  width: 100%;
  position: relative;
}

/* 添加样式以确保PDF在容器中正确显示 */
:deep(canvas.pdf-page) {
   max-width: 100%;
   max-height: 100%;
   object-fit: contain;
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}
</style>