<template>
  <div ref="controlsRef" class="card-title bg-base-100 flex justify-center p-2 rounded-t-xl shadow-sm border-b">
    <div class="join">
      <button
        class="join-item btn btn-sm"
        :class="{'btn-disabled': currentPage <= 1 || isLoading}"
        :disabled="currentPage <= 1 || isLoading"
        @click="changePage(currentPage - 1)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      
      <div class="join-item flex items-center px-2 bg-base-200">
        <input
          type="number"
          class="input input-sm w-14 text-center px-1"
          :min="1"
          :max="totalPages"
          :value="currentPage"
          @change="handlePageInputChange"
          :disabled="isLoading || totalPages <= 0"
          aria-label="当前页码"
        />
        <span class="mx-1 text-sm opacity-70"> / {{ totalPages || 1 }}</span>
      </div>
      
      <button
        class="join-item btn btn-sm"
        :class="{'btn-disabled': currentPage >= totalPages || isLoading || totalPages <= 0}"
        :disabled="currentPage >= totalPages || isLoading || totalPages <= 0"
        @click="changePage(currentPage + 1)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useOcrStore } from '@/stores/ocrStore';

const props = defineProps({
  currentPage: { type: Number, required: true, default: 1 },
  totalPages: { type: Number, required: true, default: 0 },
  isLoading: { type: Boolean, default: false }
});

const emit = defineEmits(['page-change', 'height-change']);
const store = useOcrStore();
const controlsRef = ref(null);

const changePage = (newPage) => {
  if (newPage >= 1 && newPage <= props.totalPages) {
    emit('page-change', newPage);
    
    // 在页面变化后，页面渲染完成时触发一次高度检测
    setTimeout(() => {
      if (store.imageDimensions.width && store.imageDimensions.height) {
        // 触发store中PDF尺寸的更新
        store.setImageDimension('width', store.imageDimensions.width);
        store.setImageDimension('height', store.imageDimensions.height);
        
        // 模拟一个resize事件，触发容器高度重新计算
        window.dispatchEvent(new Event('resize'));
      }
    }, 300); // 给页面渲染足够的时间
  }
};

const handlePageInputChange = (event) => {
  let page = parseInt(event.target.value, 10);
  if (isNaN(page) || page < 1) {
    page = 1;
  } else if (props.totalPages > 0 && page > props.totalPages) {
    page = props.totalPages;
  }
  // Update input visually in case it was corrected
  event.target.value = page;
  // Emit change only if it's different from current page
  if (page !== props.currentPage) {
    changePage(page);
  }
};

// 设置ResizeObserver监听控件自身高度变化
let resizeObserver;
onMounted(() => {
  if (window.ResizeObserver && controlsRef.value) {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        emit('height-change', entry.contentRect.height);
      }
    });
    
    resizeObserver.observe(controlsRef.value);
  }
});

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
});
</script>

<style scoped>
/* Styles from original .pdf-nav-container */
.pdf-nav-container {
    width: 100%;
    background-color: white;
    border-bottom: 1px solid var(--border-color);
    padding: 0.5rem;
    display: flex;
    justify-content: center;
    /* Removed border radius, apply to parent wrapper or ImageCanvas */
}

.pdf-controls {
    display: flex;
    align-items: center;
    gap: 0.8rem; /* Slightly larger gap */
}

.nav-button {
    background-color: var(--primary-color);
    color: white;
    border: none;
    border-radius: 4px;
    padding: 0.4rem 0.8rem; /* Slightly larger padding */
    cursor: pointer;
    font-size: 0.85rem;
    transition: background-color 0.3s;
    white-space: nowrap;
}

.nav-button:hover:not(:disabled) {
    background-color: var(--hover-color);
}

.nav-button:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
    opacity: 0.7;
}

.page-input-container {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.9rem; /* Slightly larger font */
}

.page-input-container input {
    width: 50px; /* Wider input */
    padding: 0.4rem;
    text-align: center;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    font-size: 0.9rem;
}
.page-input-container input:disabled {
    background-color: #f0f0f0;
    cursor: not-allowed;
}
.page-input-container span {
    color: var(--text-color);
    opacity: 0.8;
}
</style>