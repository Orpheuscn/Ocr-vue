<template>
  <div class="filter-controls-main filter-controls-fixed">
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
    background-color: rgba(80, 80, 80, 0.9); /* Darker, slightly less transparent */
    padding: 0.75rem 1.25rem;
    box-shadow: 0 -2px 5px rgba(0, 0, 0, 0.2); /* Shadow on top */
    border-radius: 10px 10px 0 0; /* Round top corners only */
    color: #f0f0f0; /* Light text */
}

/* Fixed positioning */
.filter-controls-fixed {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%; /* Full width */
    border-radius: 0; /* Override individual radius */
    z-index: 100;
    box-sizing: border-box;
}

.filter-controls-row {
    display: flex;
    justify-content: space-around; /* Space out more evenly */
    align-items: flex-start; /* Align items top */
    gap: 25px; /* Increase gap */
    max-width: 1200px; /* Max width matching main content */
    margin: 0 auto; /* Center the row */
    flex-wrap: wrap; /* Allow wrapping on smaller screens */
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
    margin-bottom: 10px; /* More space */
    font-weight: 500;
    font-size: 13px; /* Slightly smaller */
    color: #e0e0e0; /* Lighter gray */
}

.filter-container label span { /* The value part */
     color: #ffffff;
     font-weight: bold;
     background-color: rgba(0,0,0,0.2);
     padding: 1px 5px;
     border-radius: 3px;
     font-size: 12px;
}

/* Responsive adjustments */
@media (max-width: 900px) {
    .filter-container {
        min-width: 200px;
    }
}
@media (max-width: 600px) {
     .filter-controls-row {
        flex-direction: column;
        align-items: stretch; /* Stretch items full width */
        gap: 15px;
        padding: 0 10px; /* Add some padding */
     }
     .filter-container {
         min-width: unset;
         width: 100%;
     }
     .filter-controls-main {
         padding: 0.5rem 0.8rem;
     }
}

</style>