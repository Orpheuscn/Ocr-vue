<template>
  <div>
    <!-- 悬浮按钮 -->
    <div class="fixed left-4 bottom-24 z-40" v-if="store.hasOcrResult || store.currentFiles.length > 0">
      <button 
        class="btn btn-circle btn-warning shadow-lg hover-btn"
        @click="toggleMaskingMode"
        :class="{'btn-active': isMaskingActive}"
        :title="isMaskingActive ? i18n.t('exitMaskingMode') : i18n.t('addMaskingArea')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11h2m-2 4v3a2 2 0 01-2 2H5a2 2 0 01-2-2v-3m0-4h2m12-4V5a2 2 0 00-2-2H9a2 2 0 00-2 2v3" />
          <circle cx="9" cy="13" r="2" />
          <circle cx="15" cy="13" r="2" />
        </svg>
      </button>
    </div>

    <!-- 遮挡工具说明与控制 -->
    <div 
      v-if="isMaskingActive"
      class="fixed top-0 left-0 right-0 bg-base-200 p-2 z-50 flex items-center justify-between shadow-md"
    >
      <div class="flex items-center gap-2">
        <span class="badge badge-warning">{{ i18n.t('maskingMode') }}</span>
        <span class="text-sm">{{ i18n.t('dragToSelectMaskingArea') }}</span>
      </div>
      <div class="flex gap-2">
        <button class="btn btn-sm btn-ghost" @click="clearAllMasks">{{ i18n.t('clearAll') }}</button>
        <button class="btn btn-sm btn-ghost" @click="toggleMaskingMode">{{ i18n.t('exit') }}</button>
      </div>
    </div>

    <!-- 遮挡绘制层 - 只在遮挡模式激活时显示 -->
    <div 
      v-if="isMaskingActive" 
      class="fixed inset-0 z-40 cursor-crosshair"
      @mousedown="startDrawing"
      @mousemove="updateDrawing"
      @mouseup="finishDrawing"
      @mouseleave="cancelDrawing"
    >
      <!-- 绘制预览 -->
      <div 
        v-if="isDrawing" 
        class="absolute border-2 border-warning bg-white opacity-70"
        :style="{
          left: `${Math.min(startX, currentX)}px`,
          top: `${Math.min(startY, currentY)}px`,
          width: `${Math.abs(currentX - startX)}px`,
          height: `${Math.abs(currentY - startY)}px`
        }"
      ></div>
    </div>

    <!-- 遮挡区域显示 - 使用绝对定位的div显示每个遮挡区域 -->
    <div class="masking-areas-container">
      <div 
        v-for="(area, index) in visibleMaskedAreas" 
        :key="`area-${index}`"
        class="mask-area"
        :style="{
          left: `${area.displayX}px`,
          top: `${area.displayY}px`,
          width: `${area.displayWidth}px`,
          height: `${area.displayHeight}px`
        }"
      ></div>
    </div>
    
    <!-- 遮挡区域删除按钮 - 完全独立的层 -->
    <div class="mask-buttons-container" v-if="isMaskingActive">
      <button
        v-for="(area, index) in visibleMaskedAreas"
        :key="`btn-${index}`"
        type="button"
        class="delete-mask-btn"
        :style="{
          left: `${area.displayX + area.displayWidth - 10}px`,
          top: `${area.displayY - 10}px`
        }"
        @click="handleDeleteMask(index)"
      >×</button>
    </div>
    
    <!-- 调试信息 -->
    <div v-if="showDebug" class="fixed bottom-2 right-2 bg-black text-white p-2 z-50 text-xs max-w-xs overflow-auto max-h-40">
      <p>{{ i18n.t('maskingAreasCount') }}: {{ store.maskedAreas?.length || 0 }}</p>
      <p>{{ i18n.t('visibleMaskingAreasCount') }}: {{ visibleMaskedAreas?.length || 0 }}</p>
      <p v-if="lastImageInfo">{{ i18n.t('imagePosition') }}: ({{ lastImageInfo.left }}, {{ lastImageInfo.top }})</p>
      <p v-if="lastImageInfo">{{ i18n.t('imageSize') }}: {{ lastImageInfo.width }}x{{ lastImageInfo.height }}</p>
      <p v-if="lastImageInfo">{{ i18n.t('scale') }}: {{ lastImageInfo.scale }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useOcrStore } from '@/stores/ocrStore';
import { useI18nStore } from '@/stores/i18nStore';

const store = useOcrStore();
const i18n = useI18nStore();
// 状态
const isMaskingActive = ref(false);
const isDrawing = ref(false);
const startX = ref(0);
const startY = ref(0);
const currentX = ref(0);
const currentY = ref(0);
const showDebug = ref(false); // 是否显示调试信息
const lastImageInfo = ref(null); // 最后一次获取的图像信息

// 图像容器信息
const imageContainerInfo = ref({
  left: 0,
  top: 0,
  width: 0,
  height: 0,
  scale: 1
});

// 更新图像容器信息
const updateImageContainerInfo = () => {
  // 尝试不同的选择器定位图像
  const selectors = [
    '.image-container img', 
    '.card-body img',
    '.card img',
    'img[src]'
  ];
  
  let imageElement = null;
  
  // 尝试每个选择器直到找到图像
  for (const selector of selectors) {
    imageElement = document.querySelector(selector);
    if (imageElement) break;
  }
  
  if (!imageElement) {
    console.error('无法找到图像元素');
    return false;
  }
  
  const rect = imageElement.getBoundingClientRect();
  const origWidth = store.imageDimensions.width || 0;
  const origHeight = store.imageDimensions.height || 0;
  
  if (origWidth <= 0 || origHeight <= 0) {
    // console.error('图像尺寸无效:', origWidth, origHeight);
    return false;
  }
  
  const scale = origWidth / rect.width;
  
  // 存储图像信息
  const newInfo = {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    right: rect.right,
    bottom: rect.bottom,
    scale: scale
  };
  
  imageContainerInfo.value = newInfo;
  lastImageInfo.value = { ...newInfo };
  
  // console.log('图像容器信息已更新:', newInfo);
  return true;
};

// 计算显示用的遮挡区域（转换坐标）
const visibleMaskedAreas = computed(() => {
  if (!store.maskedAreas || store.maskedAreas.length === 0) {
    return [];
  }
  
  // 尝试更新图像容器信息
  updateImageContainerInfo();
  
  const { left, top, scale } = imageContainerInfo.value;
  
  // 不再输出每次计算的日志
  // console.log(`计算遮挡区域显示，当前有${store.maskedAreas.length}个区域`);
  
  return store.maskedAreas.map((area, index) => {
    const displayArea = {
      ...area,
      displayX: left + (area.x / scale),
      displayY: top + (area.y / scale),
      displayWidth: area.width / scale,
      displayHeight: area.height / scale
    };
    
    // 不再输出每个区域的详细信息
    // console.log(`区域#${index}: 显示坐标(${Math.round(displayArea.displayX)}, ${Math.round(displayArea.displayY)}, ${Math.round(displayArea.displayWidth)}, ${Math.round(displayArea.displayHeight)})`);
    
    return displayArea;
  });
});

// 切换遮挡模式
const toggleMaskingMode = () => {
  isMaskingActive.value = !isMaskingActive.value;
  showDebug.value = isMaskingActive.value; // 开启遮挡模式时显示调试信息
  // console.log('遮挡模式:', isMaskingActive.value ? '开启' : '关闭');
  
  if (isMaskingActive.value) {
    // 更新图像信息
    updateImageContainerInfo();
    // 强制重新计算区域位置
    setTimeout(() => {
      updateImageContainerInfo();
      forceUpdate();
    }, 100);
  } else {
    // 取消绘制
    isDrawing.value = false;
  }
};

// 强制组件更新
const forceUpdate = () => {
  // 通过修改store.maskedAreas的引用来触发计算属性更新
  if (store.maskedAreas && store.maskedAreas.length > 0) {
    const copy = [...store.maskedAreas];
    store.maskedAreas.splice(0, store.maskedAreas.length, ...copy);
  }
};

// 开始绘制
const startDrawing = (e) => {
  // 更新图像容器信息
  if (!updateImageContainerInfo()) {
    // console.error('无法获取图像信息，取消绘制');
    return;
  }
  
  isDrawing.value = true;
  startX.value = e.clientX;
  startY.value = e.clientY;
  currentX.value = startX.value;
  currentY.value = startY.value;
  
  // console.log(`开始绘制，起点: (${startX.value}, ${startY.value})`);
  e.preventDefault();
};

// 更新绘制
const updateDrawing = (e) => {
  if (!isDrawing.value) return;
  
  currentX.value = e.clientX;
  currentY.value = e.clientY;
  e.preventDefault();
};

// 完成绘制
const finishDrawing = (e) => {
  if (!isDrawing.value) return;
  
  const { left, top, right, bottom, scale } = imageContainerInfo.value;
  
  // 矩形在屏幕上的坐标
  const rectLeft = Math.min(startX.value, currentX.value);
  const rectTop = Math.min(startY.value, currentY.value);
  const rectRight = Math.max(startX.value, currentX.value);
  const rectBottom = Math.max(startY.value, currentY.value);
  
  // 矩形的宽高
  const width = rectRight - rectLeft;
  const height = rectBottom - rectTop;
  
  // 忽略太小的区域
  if (width < 10 || height < 10) {
    // console.log('绘制区域太小，已忽略');
    isDrawing.value = false;
    return;
  }
  
  // 计算与图像的交集
  const overlapLeft = Math.max(left, rectLeft);
  const overlapTop = Math.max(top, rectTop);
  const overlapRight = Math.min(right, rectRight);
  const overlapBottom = Math.min(bottom, rectBottom);
  
  // 检查是否有交集
  if (overlapRight <= overlapLeft || overlapBottom <= overlapTop) {
    // console.log('绘制区域与图像无交集，已忽略');
    isDrawing.value = false;
    return;
  }
  
  // 计算交集在图像原始尺寸中的坐标
  const imageX = (overlapLeft - left) * scale;
  const imageY = (overlapTop - top) * scale;
  const imageWidth = (overlapRight - overlapLeft) * scale;
  const imageHeight = (overlapBottom - overlapTop) * scale;
  
  // 创建遮挡区域（使用原始图像的坐标）
  const maskArea = {
    x: Math.round(imageX),
    y: Math.round(imageY),
    width: Math.round(imageWidth),
    height: Math.round(imageHeight)
  };
  
  // console.log('添加遮挡区域:', maskArea);
  
  // 更新store - 使用直接推送
  store.maskedAreas.push(maskArea);
  
  // 结束绘制
  isDrawing.value = false;
  e.preventDefault();
  
  // 强制更新视图
  nextTick(() => {
    updateImageContainerInfo();
  });
};

// 取消绘制
const cancelDrawing = () => {
  if (isDrawing.value) {
    // console.log('取消绘制');
    isDrawing.value = false;
  }
};

// 处理删除遮挡区域按钮点击
const handleDeleteMask = (index) => {
  // console.log(`尝试删除遮挡区域 #${index}，当前数量:`, store.maskedAreas.length);
  
  try {
    if (index >= 0 && index < store.maskedAreas.length) {
      // 执行删除
      store.maskedAreas.splice(index, 1);
      
      // 强制更新视图
      nextTick(() => {
        forceUpdate();
      });
    } else {
      console.error('索引超出范围:', index, '当前数量:', store.maskedAreas.length);
    }
  } catch (error) {
    console.error('删除遮挡区域时出错:', error);
  }
};

// 清除所有遮挡区域
const clearAllMasks = () => {
  // console.log('清除所有遮挡区域');
  try {
    const count = store.maskedAreas.length;
    
    // 清空数组
    store.maskedAreas.splice(0, count);
    // console.log(`已清除${count}个遮挡区域`);
    
    // 强制更新视图
    nextTick(() => {
      forceUpdate();
    });
  } catch (error) {
    console.error('清除所有遮挡区域时出错:', error);
  }
};

// 监听窗口滚动和调整大小
const handleWindowChange = () => {
  if (store.maskedAreas && store.maskedAreas.length > 0) {
    updateImageContainerInfo();
  }
};

// 监听文件变化、页面变化
watch(() => store.filePreviewUrl, () => {
  clearAllMasks();
  // 延迟更新图像信息，确保图像已加载
  setTimeout(() => {
    updateImageContainerInfo();
  }, 500);
});

watch(() => store.currentPage, () => {
  if (store.isPdfFile) {
    clearAllMasks();
    // 延迟更新图像信息，确保PDF页面已渲染
    setTimeout(() => {
      updateImageContainerInfo();
    }, 500);
  }
});

// 组件生命周期
onMounted(() => {
  // console.log('MaskingTool 组件已挂载');
  
  // 添加快捷键切换调试信息
  const handleKeyDown = (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
      showDebug.value = !showDebug.value;
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('resize', handleWindowChange);
  window.addEventListener('scroll', handleWindowChange);
  
  // 定期更新位置
  const updateInterval = setInterval(() => {
    if (store.maskedAreas && store.maskedAreas.length > 0) {
      updateImageContainerInfo();
    }
  }, 2000);
  
  // 尝试立即更新一次
  setTimeout(() => {
    updateImageContainerInfo();
  }, 500);
  
  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('resize', handleWindowChange);
    window.removeEventListener('scroll', handleWindowChange);
    clearInterval(updateInterval);
  });
});
</script>

<style>
/* 遮挡区域容器 */
.masking-areas-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 35;
}

/* 遮挡区域样式 */
.mask-area {
  position: absolute;
  background-color: white;
  border: 2px solid #FFB800;
  opacity: 0.7;
  box-shadow: 0 0 0 2px rgba(255, 200, 0, 0.8);
  animation: pulse-border 2s infinite;
  pointer-events: none;
}

/* 删除按钮容器 */
.mask-buttons-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 45;
}

/* 删除按钮样式 */
.delete-mask-btn {
  position: absolute;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: #f44;
  color: white;
  font-weight: bold;
  text-align: center;
  line-height: 18px;
  border: none;
  cursor: pointer;
  box-shadow: 0 0 3px rgba(0, 0, 0, 0.5);
  pointer-events: auto;
  z-index: 9999;
  padding: 0;
  font-size: 16px;
  transform: translate(-50%, -50%);
  transition: all 0.3s ease;
}

/* 按钮悬停效果 */
.delete-mask-btn:hover {
  background-color: #f00;
  transform: translate(-50%, -50%) scale(1.1);
}

/* 悬停按钮效果 */
.hover-btn {
  transition: all 0.3s ease;
}

.hover-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
  background-color: #ffaa00; /* 悬停时加深黄色 */
  color: white;
}

.hover-btn:active {
  transform: translateY(-1px);
  box-shadow: 0 5px 10px rgba(0, 0, 0, 0.2);
}

/* 动画效果 */
@keyframes pulse-border {
  0% { box-shadow: 0 0 0 2px rgba(255, 200, 0, 0.8); }
  50% { box-shadow: 0 0 0 4px rgba(255, 200, 0, 0.4); }
  100% { box-shadow: 0 0 0 2px rgba(255, 200, 0, 0.8); }
}

.btn-active {
  background-color: var(--warning);
  color: white;
}
</style> 