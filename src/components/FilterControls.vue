<template>
  <div class="filter-controls-main filter-controls-fixed">
    <div class="filter-title">文本过滤控制</div>
    <div class="filter-controls-row">
      <div class="filter-container">
        <label>字符宽度: <span>{{ formatRange(currentFilters.minWidth, currentFilters.maxWidth) }}</span></label>
        <RangeSlider
          :min="bounds.width.min"
          :max="bounds.width.max"
          :min-value="currentFilters.minWidth"
          :max-value="currentFilters.maxWidth"
          @update:min-value="updateFilter('minWidth', $event)"
          @update:max-value="updateFilter('maxWidth', $event)"
        />
      </div>

      <div class="filter-container">
        <label>X坐标: <span>{{ formatRange(currentFilters.minX, currentFilters.maxX) }}</span></label>
         <RangeSlider
          :min="bounds.x.min"
          :max="bounds.x.max"
          :min-value="currentFilters.minX"
          :max-value="currentFilters.maxX"
          @update:min-value="updateFilter('minX', $event)"
          @update:max-value="updateFilter('maxX', $event)"
        />
      </div>

      <div class="filter-container">
        <label>Y坐标: <span>{{ formatRange(currentFilters.minY, currentFilters.maxY) }}</span></label>
         <RangeSlider
          :min="bounds.y.min"
          :max="bounds.y.max"
          :min-value="currentFilters.minY"
          :max-value="currentFilters.maxY"
          @update:min-value="updateFilter('minY', $event)"
          @update:max-value="updateFilter('maxY', $event)"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, reactive, computed } from 'vue';
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
    if (min === undefined || max === undefined) return '未设置';
    // Check if range covers the entire possible bounds
    // Need bounds prop for this comparison
    // const boundMin = props.bounds[keyPrefix]?.min ?? min;
    // const boundMax = props.bounds[keyPrefix]?.max ?? max;
    // if(min === boundMin && max === boundMax) return '全部';
    return `${Math.round(min)}-${Math.round(max)}`;
};

</script>

<style scoped>
/* Styles adapted from .filter-controls-main etc */
.filter-controls-main {
    background-color: rgba(80, 80, 80, 0.9); /* 深色半透明背景 */
    padding: 0.85rem 1.5rem; /* 增加内边距 */
    box-shadow: 0 -2px 5px rgba(0, 0, 0, 0.2), 0 0 10px rgba(0, 0, 0, 0.1); /* 增强阴影效果 */
    border-radius: 16px; /* 四个角都是圆角 */
    color: #f0f0f0; /* 浅色文字 */
}

/* 标题样式 */
.filter-title {
    font-size: 14px;
    font-weight: 600;
    text-align: center;
    margin-bottom: 12px;
    color: #ffffff;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    letter-spacing: 0.5px;
}

/* 固定定位 */
.filter-controls-fixed {
    position: fixed;
    bottom: 20px; /* 距离底部20px */
    left: 50%; /* 居中定位 */
    transform: translateX(-50%); /* 水平居中 */
    width: 90%; /* 宽度为视口的90% */
    max-width: 1200px; /* 最大宽度 */
    z-index: 100;
    box-sizing: border-box;
    backdrop-filter: blur(5px); /* 添加模糊背景效果 */
    -webkit-backdrop-filter: blur(5px); /* Safari兼容 */
}

.filter-controls-row {
    display: flex;
    justify-content: space-around; /* 均匀分布 */
    align-items: flex-start; /* 顶部对齐 */
    gap: 25px; /* 元素间隔 */
    margin: 0 auto; /* 居中 */
    flex-wrap: wrap; /* 允许换行 */
}

.filter-container {
    flex: 1; /* Allow flexible width */
    min-width: 250px; /* Minimum width before wrapping */
    /* width: 100%; */ /* Removed for flex */
    padding-bottom: 5px; /* Space below slider */
}

.filter-container label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    font-weight: 500;
    font-size: 13px;
    color: #e0e0e0;
}

.filter-container label span { /* 值部分 */
     color: #ffffff;
     font-weight: bold;
     background-color: rgba(255, 255, 255, 0.15);
     padding: 2px 8px;
     border-radius: 12px;
     font-size: 12px;
}

/* 响应式调整 */
@media (max-width: 900px) {
    .filter-container {
        min-width: 200px;
    }
    .filter-controls-fixed {
        width: 95%; /* 小屏幕上稍宽一些 */
        bottom: 15px; /* 距底部更近 */
    }
}

@media (max-width: 600px) {
    .filter-controls-row {
        flex-direction: column;
        align-items: stretch; /* 拉伸元素填满宽度 */
        gap: 15px;
    }
    .filter-container {
        min-width: unset;
        width: 100%;
    }
    .filter-controls-main {
        padding: 0.7rem 1rem;
    }
    .filter-controls-fixed {
        width: 95%; /* 更小屏幕上更宽 */
        bottom: 10px; /* 距底部更近 */
    }
}

</style>