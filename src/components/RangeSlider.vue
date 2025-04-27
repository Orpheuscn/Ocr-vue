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
    height: 20px; /* Increased height for easier interaction */
    display: flex;
    align-items: center;
    margin: 0.8rem 0; /* Adjusted margin */
}

.track, .track-highlight {
    position: absolute;
    left: 0;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    height: 4px;
    border-radius: 2px;
    background-color: var(--slider-track-color, #DDD); /* Use CSS var or default */
    z-index: 1;
}

.track-highlight {
    background-color: var(--slider-color, #5436DA); /* Use CSS var or default */
    z-index: 2;
    /* left/right set by :style */
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
    height: 18px; /* Slightly smaller thumb */
    width: 18px;
    border-radius: 50%;
    background: var(--slider-color, #5436DA);
    border: 2px solid white; /* White border for contrast */
    cursor: pointer;
    pointer-events: auto; /* Thumb should capture events */
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    margin-top: -7px; /* Adjust vertical alignment */
}

.slider::-moz-range-thumb {
    height: 18px;
    width: 18px;
    border-radius: 50%;
    background: var(--slider-color, #5436DA);
    border: 2px solid white;
    cursor: pointer;
    pointer-events: auto;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

/* Focus styles for accessibility */
.slider:focus {
    outline: none; /* Remove default outline */
}
.slider:focus::-webkit-slider-thumb {
    box-shadow: 0 0 0 3px rgba(84, 54, 218, 0.4); /* Focus ring */
}
.slider:focus::-moz-range-thumb {
     box-shadow: 0 0 0 3px rgba(84, 54, 218, 0.4); /* Focus ring */
}
</style>