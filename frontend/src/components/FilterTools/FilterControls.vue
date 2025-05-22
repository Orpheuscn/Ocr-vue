<template>
  <div>
    <!-- 悬浮显示/隐藏按钮 -->
    <div class="fixed left-4 bottom-4 z-40" v-if="store.hasOcrResult">
      <button 
        class="btn btn-circle btn-info shadow-lg hover-effect"
        @click="toggleVisibility"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      </button>
    </div>
    
    <!-- 小型浮动滑块控制面板 -->
    <div 
      v-if="isVisible && store.hasOcrResult"
      class="fixed left-4 bottom-16 z-50 pointer-events-auto"
    >
      <div class="card bg-base-100 shadow-xl w-64 overflow-hidden rounded-xl">
        <div class="card-title p-2 justify-between items-center border-b border-base-300 text-sm">
          <h3 class="text-base">{{ i18n.t('textFilter') }}</h3>
          
          <button 
            class="btn btn-xs btn-ghost btn-circle"
            @click="toggleVisibility"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
    </div>
    
        <div class="card-body p-3">
          <div class="flex flex-col gap-3">
            <div class="form-control">
              <label class="label py-0">
                <span class="label-text text-xs">{{ i18n.t('characterWidth') }}: {{ formatRange(currentFilters.minWidth, currentFilters.maxWidth) }}</span>
              </label>
            <RangeSlider
              :min="bounds.width.min"
              :max="bounds.width.max"
              :min-value="currentFilters.minWidth"
              :max-value="currentFilters.maxWidth"
              @update:min-value="updateFilter('minWidth', $event)"
              @update:max-value="updateFilter('maxWidth', $event)"
                small
            />
          </div>

            <div class="form-control">
              <label class="label py-0">
                <span class="label-text text-xs">{{ i18n.t('xCoordinate') }}: {{ formatRange(currentFilters.minX, currentFilters.maxX) }}</span>
              </label>
             <RangeSlider
              :min="bounds.x.min"
              :max="bounds.x.max"
              :min-value="currentFilters.minX"
              :max-value="currentFilters.maxX"
              @update:min-value="updateFilter('minX', $event)"
              @update:max-value="updateFilter('maxX', $event)"
                small
            />
          </div>

            <div class="form-control">
              <label class="label py-0">
                <span class="label-text text-xs">{{ i18n.t('yCoordinate') }}: {{ formatRange(currentFilters.minY, currentFilters.maxY) }}</span>
              </label>
             <RangeSlider
              :min="bounds.y.min"
              :max="bounds.y.max"
              :min-value="currentFilters.minY"
              :max-value="currentFilters.maxY"
              @update:min-value="updateFilter('minY', $event)"
              @update:max-value="updateFilter('maxY', $event)"
                small
            />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, reactive, onMounted } from 'vue';
import { useOcrStore } from '@/stores/ocrStore';
import { useI18nStore } from '@/stores/i18nStore';
import RangeSlider from './RangeSlider.vue'; // Import the reusable slider

const props = defineProps({
  bounds: { // Min/Max possible values for filters
    type: Object,
    required: true,
    default: () => ({
      width: { min: 0, max: 100 },
      x: { min: 0, max: 1000 },
      y: { min: 0, max: 1000 },
    })
  },
  initialFilters: { // Current filter values from store
     type: Object,
     required: true,
     default: () => ({
        minWidth: 0, maxWidth: 100,
        minX: 0, maxX: 1000,
        minY: 0, maxY: 1000,
     })
  }
});

const emit = defineEmits(['filters-changed']);
const store = useOcrStore();
const i18n = useI18nStore();

// 控制面板显示状态
const isVisible = ref(false); // 默认隐藏

// 切换显示/隐藏状态
const toggleVisibility = () => {
  isVisible.value = !isVisible.value;
  
  // 尝试保存到本地存储，下次打开时记住状态
  try {
    localStorage.setItem('filterControlsVisible', isVisible.value ? 'true' : 'false');
  } catch (e) {
    console.warn('无法保存过滤器显示状态', e);
  }
};

// 在组件挂载时从本地存储读取显示状态
onMounted(() => {
  try {
    const savedState = localStorage.getItem('filterControlsVisible');
    if (savedState !== null) {
      isVisible.value = savedState === 'true';
    }
  } catch (e) {
    console.warn('无法读取过滤器显示状态', e);
  }
});

// Use local reactive state synced with props to manage slider values
// This prevents direct mutation of props and allows debouncing/throttling
const currentFilters = reactive({ ...props.initialFilters });

// Watch the initialFilters prop (coming from store) to reset local state if needed
watch(() => props.initialFilters, (newFilters) => {
  Object.assign(currentFilters, newFilters);
}, { deep: true });

// Debounce emitting filter changes to avoid excessive updates
let debounceTimer = null;
const debounceEmit = () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    // Ensure min <= max before emitting
    const cleanFilters = {
        minWidth: Math.min(currentFilters.minWidth, currentFilters.maxWidth),
        maxWidth: Math.max(currentFilters.minWidth, currentFilters.maxWidth),
        minX: Math.min(currentFilters.minX, currentFilters.maxX),
        maxX: Math.max(currentFilters.minX, currentFilters.maxX),
        minY: Math.min(currentFilters.minY, currentFilters.maxY),
        maxY: Math.max(currentFilters.minY, currentFilters.maxY),
    };
    // Update local state if needed after cleaning
    Object.assign(currentFilters, cleanFilters);
    emit('filters-changed', { ...cleanFilters }); // Emit a clone
  }, 150); // Adjust debounce time as needed (e.g., 150ms)
};

const updateFilter = (key, value) => {
  if (typeof value === 'number') {
    currentFilters[key] = value;
    debounceEmit();
  }
};

// Helper to display range
const formatRange = (min, max) => {
    if (min === undefined || max === undefined) return i18n.t('notSet');
    return `${Math.round(min)}-${Math.round(max)}`;
};
</script>

<style scoped>
/* 过渡动画 */
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(20px);
  opacity: 0;
}

/* 悬停按钮效果 */
.hover-effect {
  transition: all 0.3s ease;
}

.hover-effect:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 15px rgba(0, 0, 0, 0.2);
  background-color: #4aa8d8; /* 悬停时加深蓝色 */
  color: white;
}

.hover-effect:active {
  transform: translateY(-1px);
  box-shadow: 0 5px 10px rgba(0, 0, 0, 0.2);
}

/* 小按钮悬停效果 */
.btn-xs {
  transition: all 0.2s ease;
}

.btn-xs:hover {
  transform: scale(1.1);
}
</style>