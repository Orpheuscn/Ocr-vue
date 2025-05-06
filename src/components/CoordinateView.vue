<template>
  <div class="fixed bottom-4 right-4 z-40" v-if="store.hasOcrResult">
    <button 
      class="btn btn-circle btn-secondary shadow-lg hover-effect"
      @click="toggleCoordinateView"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 svg-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
      </svg>
        </button>
  </div>

  <div 
    v-if="showCoordinateView && store.hasOcrResult"
    class="fixed inset-0 z-40 pointer-events-none flex items-center justify-center bg-base-300 bg-opacity-50"
  >
    <!-- 使用pointer-events-auto可以让坐标视图窗口接收鼠标事件，而背景则不会阻挡其他元素 -->
    <div class="card bg-base-100 shadow-xl w-[90%] h-[90%] max-w-7xl max-h-[90vh] flex flex-col pointer-events-auto" ref="coordViewContainer">
      <div class="card-title p-4 justify-between items-center border-b border-base-300">
        <h3 class="text-lg font-medium">{{ i18n.t('coordinateView') }}</h3>
        
        <div class="flex items-center gap-2">
          <!-- 调试信息 -->
          <div class="text-xs bg-base-200 px-2 py-1 rounded">
            <span>{{ i18n.t('cachedPolygons') }}: {{ blockBoundaries.length }}, </span>
            <span>{{ i18n.t('visiblePolygons') }}: {{ visibleBlockBoundaries.length }}</span>
          </div>
          
          <!-- 缩放控制按钮 -->
          <div class="flex items-center gap-1 mx-2">
            <button 
              class="btn btn-sm btn-circle"
              @click="zoomOut"
              :disabled="zoomLevel <= 0.2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
              </svg>
            </button>
            <span class="text-xs">{{ Math.round(zoomLevel * 100) }}%</span>
            <button 
              class="btn btn-sm btn-circle"
              @click="zoomIn"
              :disabled="zoomLevel >= 2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
          
          <!-- 全屏按钮 -->
          <button 
            class="btn btn-sm btn-circle"
            @click="toggleFullscreen"
            :title="isFullscreen ? i18n.t('exitFullscreen') : i18n.t('fullscreenMode')"
          >
            <svg v-if="!isFullscreen" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 4h4M4 4h4m-4 0L8 8m12-4v4m0-4h-4m4 4h-4m4-4l-4 4M4 16v4m0-4h4m-4 4h4m-4 0l4-4m12 4v-4m0 4h-4m4-4h-4m4 4l-4-4" />
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div class="flex items-center gap-2">
            <span class="text-sm">{{ i18n.t('blockLevel') }}:</span>
            <select v-model="selectedBlockLevel" class="select select-sm select-bordered">
          <option value="blocks">{{ i18n.t('blocks') }}</option>
          <option value="paragraphs">{{ i18n.t('paragraphs') }}</option>
          <option value="words">{{ i18n.t('words') }}</option>
          <option value="symbols">{{ i18n.t('symbols') }}</option>
        </select>
      </div>
          
          <button 
            class="btn btn-sm" 
            @click="toggleBlockVisibility"
          >
            {{ showBounds ? i18n.t('hideBlocks') : i18n.t('showBlocks') }}
          </button>
          
          <button 
            class="btn btn-sm btn-ghost btn-circle"
            @click="closeCoordinateView"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      
      <div class="card-body p-4 overflow-auto">
    <div class="coordinate-system-wrapper" ref="coordSystemWrapper">
      <div
        class="coordinate-system"
        ref="coordSystemRef"
            :style="{ 
              width: systemWidth + 'px', 
              height: systemHeight + 'px',
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'top left',
              willChange: 'transform'
            }"
            @transitionend="handleTransformEnd"
      >
        <div class="y-axis" :style="{ height: store.imageDimensions.height + 'px' }"></div>
        <div class="x-axis" :style="{ width: store.imageDimensions.width + 'px' }"></div>

        <div
          v-for="label in xAxisLabels"
          :key="'x'+label.pos"
          class="axis-label x-label"
          :style="{ left: label.pos + 'px' }"
        >
          {{ label.text }}
        </div>
        <div
          v-for="label in yAxisLabels"
          :key="'y'+label.pos"
          class="axis-label y-label"
          :style="{ top: label.pos + 'px' }"
        >
          {{ label.text }}
        </div>

        <svg class="block-svg" :viewBox="`0 0 ${systemWidth} ${systemHeight}`" preserveAspectRatio="none">
              <!-- 单层多边形设计 - 添加一个始终可点击的透明层 -->
              <g v-for="(block, index) in visibleBlockBoundaries" :key="`block-${selectedBlockLevel}-${index}`">
                <!-- 可见边界 -->
          <polygon
            class="block-polygon"
            :class="{ 'polygon-hover': index === activePolygonIndex }"
            :points="block.points"
                  :data-index="index"
            :data-tooltip="block.tooltip"
                  @click="copyBlockText(block.text, $event)"
            :style="{ display: showBounds ? 'block' : 'none' }"
          />
          
                <!-- 始终存在的隐形点击层 -->
          <polygon
            class="block-polygon-click-layer"
            :points="block.points"
            @mouseenter="showPolygonHover(index, $event, block.tooltip)"
            @mousemove="updateTooltipPosition"
            @mouseleave="hidePolygonHover"
                  @click="copyBlockText(block.text, $event)"
          />
              </g>
        </svg>
        <div
          v-for="(symbol, index) in symbolBlocksToDisplay"
          :key="`symbol-${index}`"
          class="text-block"
          :style="{
            left: `${((symbol.x || 0) + 30)}px`,
            top: `${(symbol.y || 0)}px`,
            width: `${Math.max(symbol.width || 0, 20)}px`,
            height: `${Math.max(symbol.height || 0, 20)}px`,
            fontSize: symbol.fontSize || '12px'
          }"
        >
          {{ symbol.text }}
        </div>
        
        <!-- 调试信息悬浮块 -->
        <div v-if="blockBoundaries.length > 0" class="debug-info">
          {{ i18n.t('cachedPolygons') }}: {{ blockBoundaries.length }}<br>
          {{ i18n.t('visiblePolygons') }}: {{ visibleBlockBoundaries.length }}<br>
          {{ i18n.t('zoom') }}: {{ Math.round(zoomLevel.value * 100) }}%
        </div>
        
        <!-- 复制成功的通知将紧贴鼠标位置显示 -->
        <div v-if="showCopySuccess" class="mouse-follow-toast" :style="copyToastPosition">
          <div class="alert alert-success shadow-lg p-2 text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>{{ i18n.t('textCopied') }}</span>
          </div>
        </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { useOcrStore } from '@/stores/ocrStore';
import { useI18nStore } from '@/stores/i18nStore';

const store = useOcrStore();
const i18n = useI18nStore();
const coordSystemRef = ref(null);
const coordSystemWrapper = ref(null);
const coordViewContainer = ref(null);

// --- Local State ---
const showBounds = ref(true); // 控制 SVG 边界显隐
const selectedBlockLevel = ref('blocks'); // 控制 SVG 边界级别
const showCopySuccess = ref(false); // 添加复制成功状态
const showCoordinateView = ref(false); // 控制坐标视图显示
const zoomLevel = ref(1); // 坐标系缩放级别，默认为1倍
const isFullscreen = ref(false); // 全屏模式状态

// 高亮悬停多边形相关状态
const activePolygonIndex = ref(-1);
const tooltipText = ref('');
const tooltipPos = ref({ x: 0, y: 0 });
const tooltipVisible = ref(false);
const copyToastPosition = ref({ top: '0px', left: '0px' });

// 虚拟滚动相关状态
const viewportRect = ref({ top: 0, bottom: 0, left: 0, right: 0 });
const scrollTop = ref(0);
const scrollLeft = ref(0);
const viewportPadding = ref(1000); // 增加可视区域外的padding，从500增加到1000，确保用户能点击到边界附近的block

// 用于跟踪滚动位置变化
let lastScrollTop = 0;
let lastScrollLeft = 0;

// --- Computed Properties ---
const systemWidth = computed(() => (store.imageDimensions.width || 0) + 30); // 加 30px 给 Y 轴标签留空
const systemHeight = computed(() => (store.imageDimensions.height || 0) + 30); // 加 30px 给 X 轴标签留空

// X 轴刻度标签
const xAxisLabels = computed(() => {
  const width = store.imageDimensions.width || 0;
  if (width <= 0) return [];
  const labels = [];
  const step = Math.max(50, Math.ceil(width / 10)); // 每 50px 或宽度的 1/10 画一个刻度
  for (let x = 0; x <= width; x += step) {
    // 位置需要加上 Y 轴的偏移，并微调使其居中对齐刻度
    labels.push({ pos: x + 30 - 5, text: Math.round(x) });
  }
  return labels;
});

// Y 轴刻度标签
const yAxisLabels = computed(() => {
  const height = store.imageDimensions.height || 0;
  if (height <= 0) return [];
  const labels = [];
  const step = Math.max(50, Math.ceil(height / 10)); // 每 50px 或高度的 1/10 画一个刻度
  for (let y = 0; y <= height; y += step) {
    // 位置需要微调使文字大致与刻度线垂直居中
    labels.push({ pos: y - 7, text: Math.round(y) });
  }
  return labels;
});

// 符号数据（带缓存）
const symbolBlocksToDisplay = computed(() => {
  // 只显示通过过滤的符号
  return store.filteredSymbolsData.filter(s => s.isFiltered).map(symbol => ({
    text: symbol.text || '',
    x: symbol.x,
    y: symbol.y,
    width: symbol.width,
    height: symbol.height,
    fontSize: `${Math.max(12, symbol.height * 0.8)}px`
  }));
});

// SVG 边界框数据（带缓存）
let blockBoundariesCache = null;
const blockBoundaries = computed(() => {
  // 检查selectedBlockLevel是否变化，如果没有变化且已有缓存，直接返回缓存
  if (blockBoundariesCache && blockBoundariesCache.level === selectedBlockLevel.value && 
      blockBoundariesCache.zoom === zoomLevel.value) {
    return blockBoundariesCache.data;
  }
  
  const boundaries = [];
  if (!store.fullTextAnnotation?.pages) return boundaries;
  const offsetX = 30; // Y-axis label offset
  const offsetY = 0;
  let count = 1; // 用于标签计数

  // 修改 addBoundary 函数，添加 text 参数
  const addBoundary = (vertices, label, text = '') => {
    if (!vertices || vertices.length < 3) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const pointsString = vertices.map(v => {
      const x = v?.x ?? 0; // Safely access x, default to 0
      const y = v?.y ?? 0; // Safely access y, default to 0
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      return `${x + offsetX},${y + offsetY}`;
    }).join(" ");

    if(!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) return; // Skip if bounds invalid

    const width = (maxX - minX).toFixed(1);
    const height = (maxY - minY).toFixed(1);
    // 生成 Tooltip 文本
    const tooltipText = `${label}\nVertices: ${vertices.map(v => `(${(v?.x??0).toFixed(0)},${(v?.y??0).toFixed(0)})`).join(' ')}\nW:${width}, H:${height}`;

    boundaries.push({ 
      points: pointsString, 
      tooltip: tooltipText,
      text: text, // 添加文本内容用于复制
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    });
  };

  // 根据 selectedBlockLevel 遍历不同层级
  store.fullTextAnnotation.pages.forEach(page => {
    page.blocks?.forEach(block => {
      if (selectedBlockLevel.value === 'blocks') {
        // 收集区块文本
        let blockText = '';
        let hasAnyText = false; // 跟踪是否收集到任何文本
        block.paragraphs?.forEach(para => {
          para.words?.forEach(word => {
            word.symbols?.forEach(symbol => {
              // 放宽匹配条件，增加匹配半径，并根据缩放系数动态调整
              const dynamicRadius = 15 / (zoomLevel.value || 1); // 基础半径15px，随缩放调整
              const symbolData = store.filteredSymbolsData.find(fd => {
                if (!fd.isFiltered || fd.text !== symbol.text) return false;
                
                // 获取符号边界框的第一个顶点（左上角）
                const symbolX = symbol.boundingBox?.vertices?.[0]?.x ?? -999;
                const symbolY = symbol.boundingBox?.vertices?.[0]?.y ?? -999;
                
                // 增加匹配半径，并考虑缩放
                return Math.abs(fd.x - symbolX) < dynamicRadius && Math.abs(fd.y - symbolY) < dynamicRadius;
              });
              
              if (symbolData) {
                hasAnyText = true;
                blockText += symbol.text;
                if (symbolData.detectedBreak === 'SPACE' || symbolData.detectedBreak === 'EOL_SURE_SPACE') {
                  blockText += ' ';
                } else if (symbolData.detectedBreak === 'LINE_BREAK') {
                  blockText += '\n';
                }
              } else if (symbol.text) {
                // 处理倾斜文本，即使没有匹配到filteredSymbolsData
                hasAnyText = true;
                blockText += symbol.text;
                // 假设添加一个空格作为分隔符
                blockText += ' ';
              }
            });
          });
        });
        
        // 如果收集到任何文本，则添加边界
        if (hasAnyText && block.boundingBox?.vertices?.length >= 3) {
          addBoundary(block.boundingBox.vertices, `区块 ${count++}`, blockText);
        }
      } else {
        block.paragraphs?.forEach(paragraph => {
          if (selectedBlockLevel.value === 'paragraphs') {
            // 收集段落文本
            let paraText = '';
            let hasAnyText = false;
            paragraph.words?.forEach(word => {
              word.symbols?.forEach(symbol => {
                // 放宽匹配条件，增加匹配半径，并根据缩放系数动态调整
                const dynamicRadius = 15 / (zoomLevel.value || 1); // 基础半径15px，随缩放调整
                const symbolData = store.filteredSymbolsData.find(fd => {
                  if (!fd.isFiltered || fd.text !== symbol.text) return false;
                  
                  // 获取符号边界框的第一个顶点（左上角）
                  const symbolX = symbol.boundingBox?.vertices?.[0]?.x ?? -999;
                  const symbolY = symbol.boundingBox?.vertices?.[0]?.y ?? -999;
                  
                  // 增加匹配半径，并考虑缩放
                  return Math.abs(fd.x - symbolX) < dynamicRadius && Math.abs(fd.y - symbolY) < dynamicRadius;
                });
                
                if (symbolData) {
                  hasAnyText = true;
                  paraText += symbol.text;
                  if (symbolData.detectedBreak === 'SPACE' || symbolData.detectedBreak === 'EOL_SURE_SPACE') {
                    paraText += ' ';
                  } else if (symbolData.detectedBreak === 'LINE_BREAK') {
                    paraText += '\n';
                  }
                } else if (symbol.text) {
                  // 处理倾斜文本，即使没有匹配到filteredSymbolsData
                  hasAnyText = true;
                  paraText += symbol.text;
                  // 假设添加一个空格作为分隔符
                  paraText += ' ';
                }
              });
            });
            
            // 如果收集到任何文本，则添加边界
            if (hasAnyText && paragraph.boundingBox?.vertices?.length >= 3) {
              addBoundary(paragraph.boundingBox.vertices, `段落 ${count++}`, paraText);
            }
          } else {
            paragraph.words?.forEach(word => {
              if (selectedBlockLevel.value === 'words') {
                // 收集单词文本
                let wordText = '';
                let hasAnyText = false;
                word.symbols?.forEach(symbol => {
                  // 放宽匹配条件，增加匹配半径，并根据缩放系数动态调整
                  const dynamicRadius = 15 / (zoomLevel.value || 1); // 基础半径15px，随缩放调整
                  const symbolData = store.filteredSymbolsData.find(fd => {
                    if (!fd.isFiltered || fd.text !== symbol.text) return false;
                    
                    // 获取符号边界框的第一个顶点（左上角）
                    const symbolX = symbol.boundingBox?.vertices?.[0]?.x ?? -999;
                    const symbolY = symbol.boundingBox?.vertices?.[0]?.y ?? -999;
                    
                    // 增加匹配半径，并考虑缩放
                    return Math.abs(fd.x - symbolX) < dynamicRadius && Math.abs(fd.y - symbolY) < dynamicRadius;
                  });
                  
                  if (symbolData) {
                    hasAnyText = true;
                    wordText += symbol.text;
                  } else if (symbol.text) {
                    // 处理倾斜文本，即使没有匹配到filteredSymbolsData
                    hasAnyText = true;
                    wordText += symbol.text;
                  }
                });
                
                // 如果收集到任何文本，则添加边界
                if (hasAnyText && word.boundingBox?.vertices?.length >= 3) {
                  addBoundary(word.boundingBox.vertices, `单词 ${count++}`, wordText);
                }
              } else if (selectedBlockLevel.value === 'symbols') {
                word.symbols?.forEach(symbol => {
                  // 修改匹配逻辑，放宽匹配条件以支持倾斜文字
                  const dynamicRadius = 15 / (zoomLevel.value || 1); // 基础半径15px，随缩放调整
                  const symbolData = store.filteredSymbolsData.find(fd => {
                    if (!fd.isFiltered || fd.text !== symbol.text) return false;
                    
                    // 获取符号边界框的第一个顶点（左上角）
                    const symbolX = symbol.boundingBox?.vertices?.[0]?.x ?? -999;
                    const symbolY = symbol.boundingBox?.vertices?.[0]?.y ?? -999;
                    
                    // 放宽匹配标准，增加匹配半径，特别是对于倾斜文本
                    return Math.abs(fd.x - symbolX) < dynamicRadius && Math.abs(fd.y - symbolY) < dynamicRadius;
                  });
                  
                  if (symbolData) {
                    addBoundary(symbol.boundingBox?.vertices, `符号: ${symbol.text}`, symbol.text);
                  } else if (symbol.text && symbol.boundingBox?.vertices?.length >= 3) {
                    // 即使没有匹配到filteredSymbolsData，如果有文本和边界框仍然添加
                    // 这对倾斜文本特别有用
                    addBoundary(symbol.boundingBox.vertices, `符号: ${symbol.text}`, symbol.text);
                  }
                });
              }
            });
          }
        });
      }
    });
  });

  // 更新缓存，包含当前缩放级别
  blockBoundariesCache = {
    level: selectedBlockLevel.value,
    zoom: zoomLevel.value,
    data: boundaries
  };
  
  return boundaries;
});

// 只显示视口内的边界多边形（优化渲染性能）
const visibleBlockBoundaries = computed(() => {
  if (!showBounds.value) return []; // 如果不显示边界，返回空数组
  
  const { top, bottom, left, right } = viewportRect.value;
  
  // 扩展视口区域，增加边距从500px到1000px
  const extendedTop = top - viewportPadding.value;
  const extendedBottom = bottom + viewportPadding.value;
  const extendedLeft = left - viewportPadding.value;
  const extendedRight = right + viewportPadding.value;
  
  return blockBoundaries.value.filter(block => {
    // 检查边界是否与扩展视口重叠
    return !(
      (block.x + block.width + 30) < extendedLeft || // 30 是 Y 轴的偏移
      (block.x + 30) > extendedRight ||
      (block.y + block.height) < extendedTop ||
      block.y > extendedBottom
    );
  }).map((block, index) => ({
    ...block,
    originalIndex: index // 保存原始索引，以便追踪对应关系
  }));
});

// --- Methods ---
const toggleBlockVisibility = () => {
  showBounds.value = !showBounds.value;
};

// 添加鼠标位置的状态
const mousePosition = ref({ x: 0, y: 0 });

// 显示多边形悬停效果
const showPolygonHover = (index, event, tooltip) => {
  activePolygonIndex.value = index;
  tooltipText.value = tooltip;
  tooltipPos.value = { x: event.clientX, y: event.clientY };
  tooltipVisible.value = true;
  updateTooltipPosition(event);
};

// 隐藏多边形悬停效果
const hidePolygonHover = () => {
  activePolygonIndex.value = -1;
  tooltipVisible.value = false;
};

// 更新工具提示位置
const updateTooltipPosition = (event) => {
  if (tooltipVisible.value) {
    tooltipPos.value = { x: event.clientX, y: event.clientY };
  }
};

// 复制区块文本
const copyBlockText = (text, event) => {
  if (!text || !text.trim()) return;
  
  // 更新复制成功提示的位置，紧贴鼠标位置
  copyToastPosition.value = {
    top: `${event.offsetY}px`,
    left: `${event.offsetX}px`
  };
  
  // 复制到剪贴板
  navigator.clipboard.writeText(text.trim())
    .then(() => {
      showCopySuccess.value = true;
      setTimeout(() => {
        showCopySuccess.value = false;
      }, 1500);
    })
    .catch(err => {
      console.error('无法复制文本: ', err);
      store.showNotification('复制失败，请重试', 'error');
    });
};

// 更新可视区域信息
const updateViewportRect = () => {
  if (!coordSystemWrapper.value) return;
  
  const wrapperRect = coordSystemWrapper.value.getBoundingClientRect();
  const scrollInfo = coordSystemWrapper.value;
  
  scrollTop.value = scrollInfo.scrollTop;
  scrollLeft.value = scrollInfo.scrollLeft;
  
  // 计算可视区域的边界，并考虑缩放级别
  viewportRect.value = {
    top: scrollTop.value / zoomLevel.value,
    left: scrollLeft.value / zoomLevel.value,
    bottom: (scrollTop.value + wrapperRect.height) / zoomLevel.value,
    right: (scrollLeft.value + wrapperRect.width) / zoomLevel.value
  };

  // 强制刷新visibleBlockBoundaries
  nextTick(() => {
    // 通过触发reactive更新
    scrollTop.value = scrollTop.value;
  });
};

// 优化的滚动处理函数
const handleScroll = () => {
  // 立即更新可视区域，不再使用requestAnimationFrame延迟，避免点击操作延迟
  updateViewportRect();
  
  // 仍然使用requestAnimationFrame来限制额外的更新
  if (!window._scrollRequestPending) {
    window._scrollRequestPending = true;
    requestAnimationFrame(() => {
      updateViewportRect();
      // 当滚动距离较大时，可能需要重新计算缓存
      if (Math.abs(scrollTop.value - lastScrollTop) > 100 || 
          Math.abs(scrollLeft.value - lastScrollLeft) > 100) {
        blockBoundariesCache = null; // 强制重新计算缓存
      }
      lastScrollTop = scrollTop.value;
      lastScrollLeft = scrollLeft.value;
      window._scrollRequestPending = false;
    });
  }
};

// --- Lifecycle Hooks ---
onMounted(() => {
  // 初始化视口信息
  nextTick(() => {
    updateViewportRect();
    
    // 添加滚动事件监听
    if (coordSystemWrapper.value) {
      coordSystemWrapper.value.addEventListener('scroll', handleScroll);
    }
    
    // 添加窗口大小变化监听
    window.addEventListener('resize', updateViewportRect);
    
    // 添加全屏变化事件监听
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    document.addEventListener('keydown', handleKeyDown);
  });

  // 全局鼠标移动监听
  window.addEventListener('mousemove', (e) => {
    mousePosition.value = { x: e.clientX, y: e.clientY };
  });
  
  // 触摸设备支持
  window.addEventListener('touchmove', (e) => {
    if (e.touches && e.touches[0]) {
      mousePosition.value = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  });
});

onUnmounted(() => {
  // 移除事件监听器
  document.removeEventListener('mousemove', updateTooltipPosition);
  
  if (coordSystemWrapper.value) {
    coordSystemWrapper.value.removeEventListener('scroll', handleScroll);
  }
  
  window.removeEventListener('resize', updateViewportRect);
  
  // 移除全屏变化事件监听
  document.removeEventListener('fullscreenchange', handleFullscreenChange);
  document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
  document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
  document.removeEventListener('MSFullscreenChange', handleFullscreenChange);

  // 全局鼠标移动监听
  window.removeEventListener('mousemove', (e) => {
    mousePosition.value = { x: e.clientX, y: e.clientY };
  });
  
  window.removeEventListener('touchmove', (e) => {
    if (e.touches && e.touches[0]) {
      mousePosition.value = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  });

  document.removeEventListener('keydown', handleKeyDown);
});

// 监听过滤器变化，更新可视区域
watch(() => store.filteredSymbolsData, () => {
  blockBoundariesCache = null; // 强制重新计算缓存
  nextTick(updateViewportRect);
}, { deep: true });

// 监听区块级别变化，更新缓存
watch(() => selectedBlockLevel.value, () => {
  // 清除缓存，强制重新计算
  blockBoundariesCache = null;
});

// 监听缩放级别变化，更新视口和缓存
watch(() => zoomLevel.value, () => {
  // 清除缓存，强制重新计算
  blockBoundariesCache = null;
  nextTick(updateViewportRect);
}, { flush: 'post' });

// 监听全屏状态变化
const handleFullscreenChange = () => {
  isFullscreen.value = !!(document.fullscreenElement || 
                          document.webkitFullscreenElement || 
                          document.mozFullScreenElement ||
                          document.msFullscreenElement);
};

// 监听ESC键退出全屏
const handleKeyDown = (event) => {
  if (event.key === 'Escape' && isFullscreen.value) {
    toggleFullscreen();
  }
};

// 全屏模式控制
const toggleFullscreen = () => {
  if (!coordViewContainer.value) return;
  
  if (!isFullscreen.value) {
    // 进入全屏模式
    if (coordViewContainer.value.requestFullscreen) {
      coordViewContainer.value.requestFullscreen();
    } else if (coordViewContainer.value.webkitRequestFullscreen) { // Safari
      coordViewContainer.value.webkitRequestFullscreen();
    } else if (coordViewContainer.value.msRequestFullscreen) { // IE11
      coordViewContainer.value.msRequestFullscreen();
    }
  } else {
    // 退出全屏模式
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) { // Safari
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) { // IE11
      document.msExitFullscreen();
    }
  }
};

// 切换坐标视图显示
const toggleCoordinateView = () => {
  showCoordinateView.value = !showCoordinateView.value;
};

// 关闭坐标视图
const closeCoordinateView = () => {
  showCoordinateView.value = false;
  
  // 如果处于全屏状态，退出全屏
  if (isFullscreen.value) {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  }
};

// 在template部分添加调试指示器，在合适的位置插入
const cacheInfo = computed(() => {
  return {
    cached: blockBoundaries.value.length,
    visible: visibleBlockBoundaries.value.length,
    zoom: Math.round(zoomLevel.value * 100) + '%'
  };
});

// 缩放控制
const zoomIn = () => {
  zoomLevel.value = Math.min(2, zoomLevel.value + 0.1);
  // 清除缓存，强制重新计算
  blockBoundariesCache = null;
  // 更新视口信息，使用setTimeout确保DOM已更新
  updateViewportRect();
  setTimeout(() => {
    updateViewportRect();
  }, 100);
};

const zoomOut = () => {
  zoomLevel.value = Math.max(0.2, zoomLevel.value - 0.1);
  // 清除缓存，强制重新计算
  blockBoundariesCache = null;
  // 更新视口信息，使用setTimeout确保DOM已更新
  updateViewportRect();
  setTimeout(() => {
    updateViewportRect();
  }, 100);
};

// 添加一个简单的通知提示函数
const _showNotification = (message, type = 'info') => {
  // 如果store中有通知函数就使用它
  if (typeof store._showNotification === 'function') {
    store._showNotification(message, type);
  } else {
    // 否则直接使用控制台
    console.log(`[${type}] ${message}`);
  }
};

// 处理transform变换结束的事件
const handleTransformEnd = () => {
  // 在变换结束后再次更新视口，以确保多边形显示正确
  updateViewportRect();
  
  // 强制刷新可见多边形
  blockBoundariesCache = null;
  
  // 在下一帧更新数据
  nextTick(() => {
    updateViewportRect();
  });
};
</script>

<style scoped>
/* 确保坐标视图在全屏模式下填满整个屏幕 */
:deep(.fullscreen) {
  width: 100vw !important;
  height: 100vh !important;
  max-width: 100vw !important;
  max-height: 100vh !important;
  margin: 0 !important;
  border-radius: 0 !important;
}

:deep(.fullscreen) .card-body {
  height: calc(100vh - 60px); /* 减去标题栏高度 */
}

:deep(.fullscreen) .coordinate-system-wrapper {
  height: calc(100vh - 80px); /* 适应全屏模式 */
}

/* 添加平滑过渡效果 */
.coordinate-system {
  transition: transform 0.2s cubic-bezier(0.215, 0.610, 0.355, 1.000);
}

/* 调试信息样式 */
.debug-info {
  font-size: 0.75rem;
  background-color: rgba(200, 200, 200, 0.7);
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  position: absolute;
  right: 0.5rem;
  bottom: 0.5rem;
  z-index: 10;
}

/* 确保所有样式规则都在这里 */
.coordinate-view-container {
    background-color: var(--b1, white);
    border-radius: 8px;
    padding: 1rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    margin-top: 1.5rem;
}
.coordinate-view-placeholder {
    background-color: var(--b1, white);
    border-radius: 8px;
    padding: 2rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    margin-top: 1.5rem;
    text-align: center;
    color: var(--bc, #a0aec0);
}

.section-title {
    font-size: 1.2rem;
    font-weight: 600;
    margin-bottom: 1rem;
    color: var(--primary-color);
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px;
}

.coordinate-controls {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 0.9rem;
}
.coordinate-controls span {
    margin-left: 5px;
}
.coordinate-controls select {
    padding: 4px 8px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background-color: white;
    font-size: 0.85rem;
}

.toggle-button {
    background-color: transparent;
    color: var(--primary-color);
    border: 1px solid var(--primary-color);
    padding: 0.3rem 0.8rem;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
    font-size: 0.85rem;
    transition: background-color 0.3s, color 0.3s;
    white-space: nowrap;
}
.toggle-button:hover {
    background-color: var(--secondary-color);
}

.coordinate-system-wrapper {
    position: relative;
    overflow: auto;
    width: 100%;
    height: 100%;
    min-height: 500px;
    user-select: none;
}

.coordinate-system {
    position: relative;
    transition: transform 0.2s ease;
    background-color: var(--base-100);
    user-select: none;
}

.y-axis, .x-axis {
    position: absolute;
    background-color: #ddd;
    opacity: 0.5;
}

.x-axis {
    height: 1px;
    top: 0;
    left: 30px;
}

.y-axis {
    width: 1px;
    top: 0;
    left: 30px;
}

.axis-label {
    position: absolute;
    color: var(--base-content);
    opacity: 0.6;
    font-size: 10px;
    user-select: none;
    pointer-events: none;
}

.x-label {
    top: 5px;
    transform: translateX(-50%);
}

.y-label {
    left: 5px;
    transform: translateY(-50%);
}

.text-block {
    position: absolute;
    border: 1px solid rgba(0, 0, 0, 0.2);
    background-color: rgba(255, 255, 255, 0.8);
    color: #333;
    word-break: break-all;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    user-select: none;
    transition: all 0.2s ease;
}

.block-svg {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%; /* Should match coordinate-system */
    height: 100%;
    overflow: visible;
    pointer-events: none;
}

.block-polygon {
    fill: rgba(100, 149, 237, 0.2);
    stroke: rgba(100, 149, 237, 0.8);
    stroke-width: 1px;
    pointer-events: none;
    transition: all 0.2s ease;
}

.block-polygon:hover,
.polygon-hover {
    fill: rgba(100, 149, 237, 0.4);
    stroke: rgba(65, 105, 225, 1);
    stroke-width: 2px;
    stroke-dasharray: none;
    z-index: 100; /* 确保悬停时可见 */
}

.text-block {
  position: absolute;
  overflow: visible;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--bc, #333); /* 使用变量以支持暗色模式 */
  font-family: 'Inter', sans-serif;
  line-height: 1;
  text-align: center;
  white-space: nowrap;
  z-index: 50;
  cursor: default;
  user-select: none;
  pointer-events: none; /* 修改为 none，使鼠标事件穿透该元素 */
  padding: 0;
  box-sizing: border-box;
  /* 设置边框和背景为透明 */
  border: 1px solid transparent;
  background-color: transparent;
  text-shadow: 0 0 2px var(--b2, white); /* 添加文字阴影增强可读性 */
}

.text-block:hover {
  /* 完全移除悬停样式，因为现在字符元素不接收鼠标事件 */
  /* z-index: 101; */
}

/* 全局通知样式 */
.global-notification-toast {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 9999;
  pointer-events: none;
  animation: fadeInOut 2s ease-in-out;
}

.global-notification-toast .alert {
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background-color: var(--su, #36d399);
  color: var(--suc, white);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  font-weight: 500;
}

@keyframes fadeInOut {
  0% { opacity: 0; transform: translate(-50%, -40%); }
  15% { opacity: 1; transform: translate(-50%, -50%); }
  85% { opacity: 1; transform: translate(-50%, -50%); }
  100% { opacity: 0; transform: translate(-50%, -60%); }
}

/* 全局 Tooltip 样式 (如果需要的话，保持不变) */
body .coordinate-tooltip {
  position: fixed;
  background-color: var(--n, rgba(0, 0, 0, 0.8));
  color: var(--nc, white);
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
  white-space: pre-wrap; /* 让 \n 生效 */
  z-index: 1001; /* 比其他元素高 */
  pointer-events: none; /* Tooltip 本身不响应鼠标事件 */
  display: none; /* 初始隐藏 */
  line-height: 1.4;
  max-width: 300px; /* 限制最大宽度 */
}

.block-polygon-click-layer {
  fill: transparent;
  stroke: transparent;
  cursor: pointer;
  pointer-events: auto;
}

.block-polygon-click-layer:hover + .block-polygon {
  /* 根据亮暗模式使用相应的悬停样式 */
  fill: rgba(100, 149, 237, 0.4); /* 亮色模式 */
  stroke: rgba(65, 105, 225, 1);
  stroke-width: 2px;
}

[data-theme="dark"] .block-polygon-click-layer:hover + .block-polygon {
  fill: rgba(135, 206, 250, 0.3); /* 暗色模式 */
  stroke: rgba(0, 191, 255, 1);
  stroke-width: 2px;
}

/* 跟随鼠标的通知样式 */
.mouse-follow-toast {
  position: absolute;
  z-index: 50;
  pointer-events: none;
  transform: translate(-50%, -100%);
  margin-top: -10px;
  animation: fadeInOut 1s ease-in-out;
}

.mouse-follow-toast .alert {
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: rgba(54, 211, 153, 0.8); /* 修改为80%的透明度 */
  color: var(--suc, white);
  white-space: nowrap;
  font-weight: 500;
  font-size: 0.875rem;
}

@keyframes fadeInOut {
  0% { opacity: 0; transform: translate(-50%, -80%); }
  20% { opacity: 1; transform: translate(-50%, -100%); }
  80% { opacity: 1; transform: translate(-50%, -100%); }
  100% { opacity: 0; transform: translate(-50%, -80%); }
}

/* 悬停效果 */
.hover-effect {
  transition: all 0.3s ease;
}

.hover-effect:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 15px rgba(0, 0, 0, 0.2);
  filter: brightness(0.85); /* 使用亮度滤镜代替固定颜色值，保持原色系 */
  color: white;
}

.hover-effect:active {
  transform: translateY(-1px);
  box-shadow: 0 5px 10px rgba(0, 0, 0, 0.2);
}

/* 图标颜色过渡 */
.svg-icon {
  stroke: black; /* 默认为黑色 */
  transition: stroke 0.3s ease;
}

.hover-effect:hover .svg-icon {
  stroke: white; /* 悬停时为白色 */
}

.btn-sm {
  transition: all 0.2s ease;
}

.btn-sm:hover {
  transform: translateY(-1px);
  box-shadow: 0 3px 5px rgba(0, 0, 0, 0.1);
}
</style>