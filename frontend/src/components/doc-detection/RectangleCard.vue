<template>
  <div class="card bg-base-100 shadow-xl h-full">
    <div class="card-body">
      <!-- 顶部标题和控制按钮 -->
      <div class="flex justify-between items-center mb-4">
        <h2 class="card-title text-accent">矩形坐标信息</h2>

        <!-- 右侧：筛选、排序、OCR和切割按钮 -->
        <div class="flex gap-1">
          <!-- 筛选按钮 -->
          <div class="dropdown dropdown-end">
            <label tabindex="0" class="btn btn-xs btn-outline">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-3 w-3"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fill-rule="evenodd"
                  d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z"
                  clip-rule="evenodd"
                />
              </svg>
            </label>
            <ul
              id="filterDropdown"
              tabindex="0"
              class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-32"
            >
              <li><a @click="handleFilterAll">全部</a></li>
              <li v-for="className in getUniqueClassNames()" :key="className">
                <a @click="handleFilterClass(className)">{{ className }}</a>
              </li>
            </ul>
          </div>

          <!-- 排序按钮 -->
          <div class="dropdown dropdown-end">
            <label tabindex="0" class="btn btn-xs btn-outline">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-3 w-3"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  d="M3 3a1 1 0 000 2h11a1 1 0 100-2H3zM3 7a1 1 0 000 2h7a1 1 0 100-2H3zM3 11a1 1 0 100 2h4a1 1 0 100-2H3zM15 8a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L15 13.586V8z"
                />
              </svg>
            </label>
            <ul
              id="sortDropdown"
              tabindex="0"
              class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-32"
            >
              <li><a @click="handleSortByPosition">坐标</a></li>
              <li><a @click="handleSortByClass">类别</a></li>
            </ul>
          </div>

          <!-- 全局OCR按钮 -->
          <button
            v-if="filteredRectangles.length > 0"
            class="btn btn-xs btn-accent"
            @click="$emit('extract-all-text')"
            :disabled="extractingAllText"
            title="对所有矩形进行OCR"
          >
            <span v-if="extractingAllText" class="loading loading-spinner loading-xs"></span>
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              class="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </button>

          <!-- 提交切割按钮 -->
          <button
            v-if="filteredRectangles.length > 0"
            class="btn btn-xs btn-primary"
            @click="$emit('submit-crop')"
            :disabled="submitting"
            title="提交切割"
          >
            <span v-if="submitting" class="loading loading-spinner loading-xs"></span>
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              class="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </button>
        </div>
      </div>

      <!-- 原图尺寸信息 -->
      <div class="text-base-content text-sm mb-4">
        原图尺寸: {{ originalImageWidth }} × {{ originalImageHeight }}
      </div>

      <!-- 矩形卡片列表 -->
      <div class="space-y-4 overflow-auto max-h-[40vh] lg:max-h-[65vh]">
        <!-- 每个矩形的信息卡片 -->
        <SingleRectangleCard
          v-for="(rect, index) in filteredRectangles"
          :key="rect.id"
          :rect="rect"
          :index="index"
          :image-id="imageId"
          @highlight="$emit('highlight', rect)"
          @unhighlight="$emit('unhighlight', rect)"
          @text-extracted="$emit('text-extracted', $event)"
          @update-rect="$emit('update-rect', $event)"
          @extract-text-for-rect="$emit('extract-text-for-rect', $event)"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
// 引入子组件
import SingleRectangleCard from './SingleRectangleCard.vue'

// 定义属性
const props = defineProps({
  rectangles: {
    type: Array,
    required: true,
  },
  originalImageWidth: {
    type: Number,
    default: 0,
  },
  originalImageHeight: {
    type: Number,
    default: 0,
  },
  extractingAllText: {
    type: Boolean,
    default: false,
  },
  submitting: {
    type: Boolean,
    default: false,
  },
  imageId: {
    type: String,
    required: true,
  },
})

// 定义事件
const emit = defineEmits([
  'highlight',
  'unhighlight',
  'text-extracted',
  'update-rect',
  'extract-all-text',
  'submit-crop',
  'extract-text-for-rect',
  'filter-changed', // 新增筛选变化事件
])

// 筛选和排序状态
const currentFilter = ref('all')
const currentSort = ref('position')
const filteredRectangles = ref([])

// 更新筛选后的矩形列表
const updateFilteredRectangles = () => {
  // 先筛选
  let filtered = [...props.rectangles]
  if (currentFilter.value !== 'all') {
    filtered = filtered.filter((rect) => (rect.class || 'unknown') === currentFilter.value)
  }

  // 再排序
  if (currentSort.value === 'class') {
    filtered.sort((a, b) => {
      const classA = a.class || 'unknown'
      const classB = b.class || 'unknown'
      return classA.localeCompare(classB)
    })
  } else if (currentSort.value === 'position') {
    filtered.sort((a, b) => {
      // 先按y坐标（从上到下）
      if (a.coords.topLeft.y !== b.coords.topLeft.y) {
        return a.coords.topLeft.y - b.coords.topLeft.y
      }
      // 再按x坐标（从左到右）
      return a.coords.topLeft.x - b.coords.topLeft.x
    })
  }

  filteredRectangles.value = filtered
}

// 监听矩形数据变化
watch(() => props.rectangles, updateFilteredRectangles, { immediate: true, deep: true })

// 获取所有唯一的类别名称
const getUniqueClassNames = () => {
  const classNames = props.rectangles.map((rect) => rect.class || 'unknown').filter(Boolean)
  // 去重
  return [...new Set(classNames)]
}

// 处理筛选"全部"
const handleFilterAll = () => {
  currentFilter.value = 'all'
  updateFilteredRectangles()
  // 通知父组件筛选状态变化
  emit('filter-changed', { filter: 'all', filteredRectangles: filteredRectangles.value })
  document.getElementById('filterDropdown')?.blur()
}

// 处理按类别筛选
const handleFilterClass = (className) => {
  currentFilter.value = className
  updateFilteredRectangles()
  // 通知父组件筛选状态变化
  emit('filter-changed', { filter: className, filteredRectangles: filteredRectangles.value })
  document.getElementById('filterDropdown')?.blur()
}

// 处理按类别排序
const handleSortByClass = () => {
  currentSort.value = 'class'
  updateFilteredRectangles()
  document.getElementById('sortDropdown')?.blur()
}

// 处理按坐标排序
const handleSortByPosition = () => {
  currentSort.value = 'position'
  updateFilteredRectangles()
  document.getElementById('sortDropdown')?.blur()
}
</script>

<style scoped>
/* 如果需要额外的样式，可以在这里添加 */
</style>
