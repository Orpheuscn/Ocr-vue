<template>
  <!-- 遮挡工具图标 -->
  <svg
    v-if="type === 'masking'"
    viewBox="0 0 282 282"
    version="1.1"
    xmlns="http://www.w3.org/2000/svg"
    :class="size"
    stroke="currentColor"
  >
    <path
      fill="currentColor"
      stroke="currentColor"
      stroke-width="1"
      opacity="0.9882352941176471"
      d="M 231.5 10 Q 255.7 10.3 265 25.5 Q 272.3 34.2 272 50.5 L 269 61.5 L 265 68.5 L 146.5 187 L 104.5 198 L 92.5 200 Q 86.8 198.8 84 194.5 L 82 186.5 L 95 135.5 L 213.5 17 L 220.5 13 L 231.5 10 Z M 232 34 L 228 36 L 116 148 L 111 167 L 112 172 L 135 166 L 246 55 L 248 51 Q 249 43 246 40 L 239 34 L 232 34 Z "
    />
    <path
      fill="currentColor"
      stroke="currentColor"
      stroke-width="1"
      opacity="0.9882352941176471"
      d="M 43.5 35 L 131.5 35 Q 137.6 36.4 140 41.5 L 141 49.5 Q 139.6 55.6 134.5 58 L 131.5 59 L 43.5 59 L 38 62.5 L 35 68.5 L 35 236.5 Q 36.3 242.3 40.5 245 L 45.5 247 L 213.5 247 L 220 244 L 223 238.5 L 223 150.5 Q 224.4 144.4 229.5 142 L 237.5 141 Q 243.6 142.4 246 147.5 L 247 150.5 L 247 238.5 Q 244.4 254.9 233.5 263 L 218.5 270 L 40.5 270 Q 25.4 266.6 18 255.5 L 12 241.5 L 12 63.5 Q 15.4 50.4 24.5 43 L 32.5 38 L 43.5 35 Z "
    />
  </svg>

  <!-- 过滤器图标 -->
  <svg
    v-else-if="type === 'filter'"
    xmlns="http://www.w3.org/2000/svg"
    :class="size"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
    />
  </svg>

  <!-- 坐标视图图标 -->
  <svg
    v-else-if="type === 'coordinate'"
    xmlns="http://www.w3.org/2000/svg"
    :class="size"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5"
    />
  </svg>

</template>

<script setup>
// Props 定义
const props = defineProps({
  // 图标类型
  type: {
    type: String,
    required: true,
    validator: (value) => ['masking', 'filter', 'coordinate'].includes(value),
  },

  // 图标大小
  size: {
    type: String,
    default: 'h-6 w-6',
    validator: (value) => ['h-4 w-4', 'h-5 w-5', 'h-6 w-6', 'h-7 w-7', 'h-8 w-8'].includes(value),
  },
})
</script>

<style scoped>
/* 确保图标继承父元素的颜色 */
svg {
  color: inherit;
}
</style>
