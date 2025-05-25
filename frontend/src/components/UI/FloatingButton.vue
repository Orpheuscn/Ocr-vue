<template>
  <div :class="positionClasses" :style="positionStyles" v-if="visible">
    <button :class="buttonClasses" @click="handleClick" :title="tooltip" :disabled="disabled">
      <slot name="icon">
        <!-- 默认图标 -->
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
      </slot>
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'

// Props 定义
const props = defineProps({
  // 按钮类型：warning, info, secondary, primary, accent, success, error
  type: {
    type: String,
    default: 'primary',
    validator: (value) =>
      ['warning', 'info', 'secondary', 'primary', 'accent', 'success', 'error'].includes(value),
  },

  // 位置配置
  position: {
    type: String,
    default: 'bottom-right',
    validator: (value) =>
      [
        'bottom-left',
        'bottom-right',
        'top-left',
        'top-right',
        'left-bottom',
        'left-center',
        'left-top',
        'right-bottom',
        'right-center',
        'right-top',
      ].includes(value),
  },

  // 自定义位置偏移
  offset: {
    type: Object,
    default: () => ({ x: 4, y: 4 }), // 默认 1rem (4 * 0.25rem)
  },

  // 层级偏移（用于多个按钮堆叠）
  stackOffset: {
    type: Number,
    default: 0,
  },

  // 是否显示
  visible: {
    type: Boolean,
    default: true,
  },

  // 工具提示
  tooltip: {
    type: String,
    default: '',
  },

  // 是否禁用
  disabled: {
    type: Boolean,
    default: false,
  },

  // 自定义CSS类
  customClass: {
    type: String,
    default: '',
  },

  // 悬停效果类型
  hoverEffect: {
    type: String,
    default: 'lift',
    validator: (value) => ['lift', 'scale', 'glow', 'none'].includes(value),
  },
})

// Events 定义
const emit = defineEmits(['click'])

// 计算位置类
const positionClasses = computed(() => {
  const baseClasses = ['fixed', 'z-40']

  switch (props.position) {
    case 'left-center':
      return [...baseClasses, 'top-1/2', '-translate-y-1/2']
    case 'right-center':
      return [...baseClasses, 'top-1/2', '-translate-y-1/2']
    default:
      return baseClasses
  }
})

// 计算位置样式
const positionStyles = computed(() => {
  const { x, y } = props.offset
  const stackY = props.stackOffset * 16 // 16px per stack level
  const xPx = x * 4 // 转换为像素 (1 = 0.25rem = 4px)
  const yPx = y * 4 + stackY // 转换为像素并加上堆叠偏移

  const styles = {}

  switch (props.position) {
    case 'bottom-left':
      styles.left = `${xPx}px`
      styles.bottom = `${yPx}px`
      break
    case 'bottom-right':
      styles.right = `${xPx}px`
      styles.bottom = `${yPx}px`
      break
    case 'top-left':
      styles.left = `${xPx}px`
      styles.top = `${yPx}px`
      break
    case 'top-right':
      styles.right = `${xPx}px`
      styles.top = `${yPx}px`
      break
    case 'left-bottom':
      styles.left = `${xPx}px`
      styles.bottom = `${yPx}px`
      break
    case 'left-center':
      styles.left = `${xPx}px`
      break
    case 'left-top':
      styles.left = `${xPx}px`
      styles.top = `${yPx}px`
      break
    case 'right-bottom':
      styles.right = `${xPx}px`
      styles.bottom = `${yPx}px`
      break
    case 'right-center':
      styles.right = `${xPx}px`
      break
    case 'right-top':
      styles.right = `${xPx}px`
      styles.top = `${yPx}px`
      break
    default:
      styles.right = `${xPx}px`
      styles.bottom = `${yPx}px`
      break
  }

  return styles
})

// 计算按钮类
const buttonClasses = computed(() => {
  const baseClasses = ['btn', 'btn-circle', 'shadow-lg']
  const typeClass = `btn-${props.type}`
  const hoverClass = `floating-btn-${props.hoverEffect}`

  return [...baseClasses, typeClass, hoverClass, props.customClass].filter(Boolean).join(' ')
})

// 处理点击事件
const handleClick = () => {
  if (!props.disabled) {
    emit('click')
  }
}
</script>

<style scoped>
/* 基础悬停效果 - lift */
.floating-btn-lift {
  transition: all 0.3s ease;
  color: var(--btn-text-color, currentColor);
}

.floating-btn-lift:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 15px rgba(0, 0, 0, 0.2);
}

.floating-btn-lift:active {
  transform: translateY(-1px);
  box-shadow: 0 5px 10px rgba(0, 0, 0, 0.2);
}

/* 缩放悬停效果 - scale */
.floating-btn-scale {
  transition: all 0.3s ease;
}

.floating-btn-scale:hover {
  transform: scale(1.1);
  box-shadow: 0 8px 12px rgba(0, 0, 0, 0.15);
}

.floating-btn-scale:active {
  transform: scale(1.05);
}

/* 为 scale 效果添加颜色变化 */
.btn-warning.floating-btn-scale:hover {
  background-color: var(--floating-btn-warning-hover, #f59e0b);
  color: white;
}

.btn-info.floating-btn-scale:hover {
  background-color: var(--floating-btn-info-hover, #4aa8d8);
  color: white;
}

.btn-secondary.floating-btn-scale:hover {
  background-color: var(--floating-btn-secondary-hover, #8b5cf6);
  color: white;
}

.btn-primary.floating-btn-scale:hover {
  background-color: var(--floating-btn-primary-hover, #3b82f6);
  color: white;
}

.btn-accent.floating-btn-scale:hover {
  background-color: var(--floating-btn-accent-hover, #f59e0b);
  color: white;
}

.btn-success.floating-btn-scale:hover {
  background-color: var(--floating-btn-success-hover, #10b981);
  color: white;
}

.btn-error.floating-btn-scale:hover {
  background-color: var(--floating-btn-error-hover, #ef4444);
  color: white;
}

/* 发光悬停效果 - glow */
.floating-btn-glow {
  transition: all 0.3s ease;
}

.floating-btn-glow:hover {
  box-shadow: 0 0 20px rgba(var(--btn-color-rgb, 59, 130, 246), 0.5);
  transform: translateY(-1px);
}

/* 无悬停效果 - none */
.floating-btn-none {
  transition: none;
}

/* 特定按钮类型的悬停颜色 - 使用CSS变量 */
.btn-warning.floating-btn-lift:hover {
  background-color: var(--floating-btn-warning-hover, #f59e0b);
  color: white;
}

.btn-info.floating-btn-lift:hover {
  background-color: var(--floating-btn-info-hover, #4aa8d8);
  color: white;
}

.btn-secondary.floating-btn-lift:hover {
  background-color: var(--floating-btn-secondary-hover, #8b5cf6);
  color: white;
}

.btn-primary.floating-btn-lift:hover {
  background-color: var(--floating-btn-primary-hover, #3b82f6);
  color: white;
}

.btn-accent.floating-btn-lift:hover {
  background-color: var(--floating-btn-accent-hover, #f59e0b);
  color: white;
}

.btn-success.floating-btn-lift:hover {
  background-color: var(--floating-btn-success-hover, #10b981);
  color: white;
}

.btn-error.floating-btn-lift:hover {
  background-color: var(--floating-btn-error-hover, #ef4444);
  color: white;
}

/* 禁用状态 */
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none !important;
}

/* 确保图标大小一致 */
.btn-circle svg {
  width: 1.5rem;
  height: 1.5rem;
}

/* 响应式调整 */
@media (max-width: 640px) {
  .btn-circle {
    width: 3rem;
    height: 3rem;
  }

  .btn-circle svg {
    width: 1.25rem;
    height: 1.25rem;
  }
}
</style>
