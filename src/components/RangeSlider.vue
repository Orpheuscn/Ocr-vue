<template>
  <div class="range-slider-container" ref="containerRef">
    <div class="track"></div>
    <div class="track-highlight" :style="highlightStyle"></div>
    <input
      type="range"
      :min="min"
      :max="max"
      :step="step"
      :value="localMinValue"
      @input="handleMinInput"
      class="slider min-slider"
      aria-label="Minimum value"
    />
    <input
      type="range"
      :min="min"
      :max="max"
      :step="step"
      :value="localMaxValue"
      @input="handleMaxInput"
      class="slider max-slider"
      aria-label="Maximum value"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  min: { type: Number, default: 0 },
  max: { type: Number, default: 100 },
  minValue: { type: Number, default: 0 },
  maxValue: { type: Number, default: 100 },
  step: { type: Number, default: 1 }
});

const emit = defineEmits(['update:minValue', 'update:maxValue']);

// Use local refs to manage values internally to prevent prop mutation
// and handle potential overlaps
const localMinValue = ref(props.minValue);
const localMaxValue = ref(props.maxValue);
const containerRef = ref(null);

// Update local state when props change (e.g., reset from store)
watch(() => props.minValue, (newVal) => { localMinValue.value = newVal; });
watch(() => props.maxValue, (newVal) => { localMaxValue.value = newVal; });

const handleMinInput = (event) => {
  const newValue = parseFloat(event.target.value);
  // Prevent min slider from crossing max slider
  if (newValue >= localMaxValue.value) {
    localMinValue.value = localMaxValue.value; // Snap to max value
     // Also update the input element's value directly to reflect the snap
    event.target.value = localMinValue.value;
  } else {
    localMinValue.value = newValue;
  }
  emit('update:minValue', localMinValue.value);
};

const handleMaxInput = (event) => {
  const newValue = parseFloat(event.target.value);
  // Prevent max slider from crossing min slider
  if (newValue <= localMinValue.value) {
    localMaxValue.value = localMinValue.value; // Snap to min value
    event.target.value = localMaxValue.value;
  } else {
    localMaxValue.value = newValue;
  }
  emit('update:maxValue', localMaxValue.value);
};

// Style for the highlighted track between thumbs
const highlightStyle = computed(() => {
  const range = props.max - props.min;
  if (range <= 0) return { left: '0%', right: '100%' };

  const minPercent = ((localMinValue.value - props.min) / range) * 100;
  const maxPercent = ((localMaxValue.value - props.min) / range) * 100;

  return {
    left: `${minPercent}%`,
    right: `${100 - maxPercent}%` // Calculate right offset based on max value
  };
});

</script>

<style scoped>
.range-slider-container {
    position: relative;
    height: 16px; /* 减小容器高度 */
    display: flex;
    align-items: center;
    margin: 0.5rem 0; /* 减小上下边距 */
}

.track, .track-highlight {
    position: absolute;
    left: 0;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    height: 4px; /* 减小轨道高度 */
    border-radius: 2px; /* 相应减小圆角 */
    background-color: rgba(255, 255, 255, 0.3);
    z-index: 1;
}

.track-highlight {
    background-color: var(--slider-color, #5436DA); /* 使用CSS变量或默认值 */
    box-shadow: 0 0 4px rgba(84, 54, 218, 0.5); /* 添加轻微发光效果 */
    z-index: 2;
    /* left/right由:style设置 */
}

.slider {
    position: absolute;
    width: 100%;
    height: 100%; /* Cover the container height for easier grabbing */
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
    pointer-events: none; /* Slider track shouldn't capture events */
    margin: 0;
    padding: 0;
    z-index: 3; /* Thumbs above track */
}

.slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    height: 16px; /* 减小滑块大小 */
    width: 16px;
    border-radius: 50%;
    background: var(--slider-color, #5436DA);
    border: 2px solid white;
    cursor: pointer;
    pointer-events: auto;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
    margin-top: -6px; /* 调整垂直对齐 */
    transition: transform 0.1s, box-shadow 0.1s;
}

.slider::-moz-range-thumb {
    height: 16px; /* 减小滑块大小 */
    width: 16px;
    border-radius: 50%;
    background: var(--slider-color, #5436DA);
    border: 2px solid white;
    cursor: pointer;
    pointer-events: auto;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
    transition: transform 0.1s, box-shadow 0.1s;
}

/* 悬停效果 */
.slider::-webkit-slider-thumb:hover {
    transform: scale(1.08); /* 减小放大比例 */
    box-shadow: 0 0 6px rgba(84, 54, 218, 0.6); /* 减小发光效果 */
}

.slider::-moz-range-thumb:hover {
    transform: scale(1.08);
    box-shadow: 0 0 6px rgba(84, 54, 218, 0.6);
}

/* Focus styles for accessibility */
.slider:focus {
    outline: none; /* Remove default outline */
}
.slider:focus::-webkit-slider-thumb {
    box-shadow: 0 0 0 2px rgba(84, 54, 218, 0.4); /* 减小聚焦环大小 */
}
.slider:focus::-moz-range-thumb {
     box-shadow: 0 0 0 2px rgba(84, 54, 218, 0.4);
}
</style>