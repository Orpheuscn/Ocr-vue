<template>
  <div class="coordinate-view-container" v-if="store.hasOcrResult">
    <h3 class="section-title">
      坐标视图
      <div class="coordinate-controls">
        <button class="toggle-button" @click="toggleBlockVisibility">
          {{ showBounds ? '隐藏' : '显示' }}区块
        </button>
        <span>区块级别:</span>
        <select v-model="selectedBlockLevel">
          <option value="blocks">区块</option>
          <option value="paragraphs">段落</option>
          <option value="words">单词</option>
          <option value="symbols">字符</option>
        </select>
      </div>
    </h3>

    <div class="coordinate-system-wrapper">
      <div
        class="coordinate-system"
        ref="coordSystemRef"
        :style="{ width: systemWidth + 'px', height: systemHeight + 'px' }"
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
          <polygon
            v-for="(block, index) in blockBoundaries"
            :key="`poly-${selectedBlockLevel}-${index}`"
            class="block-polygon"
            :points="block.points"
            :data-tooltip="block.tooltip"
            @mouseenter="showTooltip($event, block.tooltip)"
            @mousemove="updateTooltipPosition"
            @mouseleave="hideTooltip"
            @click="copyBlockText(block.text)"
            :style="{ display: showBounds ? 'block' : 'none' }"
          />
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
        
        <!-- 复制成功提示 -->
        <div v-if="showCopySuccess" class="copy-success-toast">
          文本已复制
        </div>
      </div>
    </div>
  </div>
  <div v-else class="coordinate-view-placeholder">
    识别完成后将在此显示坐标视图。
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useOcrStore } from '@/stores/ocrStore';

const store = useOcrStore();
const coordSystemRef = ref(null);

// --- Local State ---
const showBounds = ref(true); // 控制 SVG 边界显隐
const selectedBlockLevel = ref('blocks'); // 控制 SVG 边界级别
const showCopySuccess = ref(false); // 添加复制成功状态

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

// 添加缺失的 symbolBlocksToDisplay 计算属性
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

// SVG 边界框数据
const blockBoundaries = computed(() => {
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
      text: text // 添加文本内容用于复制
    });
  };

  // 根据 selectedBlockLevel 遍历不同层级
  store.fullTextAnnotation.pages.forEach(page => {
    page.blocks?.forEach(block => {
      if (selectedBlockLevel.value === 'blocks') {
        // 收集区块文本
        let blockText = '';
        block.paragraphs?.forEach(para => {
          para.words?.forEach(word => {
            word.symbols?.forEach(symbol => {
              const symbolData = store.filteredSymbolsData.find(fd =>
                fd.isFiltered && fd.text === symbol.text &&
                Math.abs(fd.x - (symbol.boundingBox?.vertices?.[0]?.x ?? -1)) < 2 &&
                Math.abs(fd.y - (symbol.boundingBox?.vertices?.[0]?.y ?? -1)) < 2
              );
              
              if (symbolData) {
                blockText += symbol.text;
                if (symbolData.detectedBreak === 'SPACE' || symbolData.detectedBreak === 'EOL_SURE_SPACE') {
                  blockText += ' ';
                } else if (symbolData.detectedBreak === 'LINE_BREAK') {
                  blockText += '\n';
                }
              }
            });
          });
        });
        addBoundary(block.boundingBox?.vertices, `区块 ${count++}`, blockText);
      } else {
        block.paragraphs?.forEach(paragraph => {
          if (selectedBlockLevel.value === 'paragraphs') {
            // 收集段落文本
            let paraText = '';
            paragraph.words?.forEach(word => {
              word.symbols?.forEach(symbol => {
                const symbolData = store.filteredSymbolsData.find(fd =>
                  fd.isFiltered && fd.text === symbol.text &&
                  Math.abs(fd.x - (symbol.boundingBox?.vertices?.[0]?.x ?? -1)) < 2 &&
                  Math.abs(fd.y - (symbol.boundingBox?.vertices?.[0]?.y ?? -1)) < 2
                );
                
                if (symbolData) {
                  paraText += symbol.text;
                  if (symbolData.detectedBreak === 'SPACE' || symbolData.detectedBreak === 'EOL_SURE_SPACE') {
                    paraText += ' ';
                  } else if (symbolData.detectedBreak === 'LINE_BREAK') {
                    paraText += '\n';
                  }
                }
              });
            });
            addBoundary(paragraph.boundingBox?.vertices, `段落 ${count++}`, paraText);
          } else {
            paragraph.words?.forEach(word => {
              if (selectedBlockLevel.value === 'words') {
                // 收集单词文本
                let wordText = '';
                word.symbols?.forEach(symbol => {
                  const symbolData = store.filteredSymbolsData.find(fd =>
                    fd.isFiltered && fd.text === symbol.text &&
                    Math.abs(fd.x - (symbol.boundingBox?.vertices?.[0]?.x ?? -1)) < 2 &&
                    Math.abs(fd.y - (symbol.boundingBox?.vertices?.[0]?.y ?? -1)) < 2
                  );
                  
                  if (symbolData) {
                    wordText += symbol.text;
                  }
                });
                addBoundary(word.boundingBox?.vertices, `单词 ${count++}`, wordText);
              } else if (selectedBlockLevel.value === 'symbols') {
                word.symbols?.forEach(symbol => {
                  const symbolData = store.filteredSymbolsData.find(fd =>
                    fd.isFiltered && fd.text === symbol.text &&
                    Math.abs(fd.x - (symbol.boundingBox?.vertices?.[0]?.x ?? -1)) < 2 &&
                    Math.abs(fd.y - (symbol.boundingBox?.vertices?.[0]?.y ?? -1)) < 2
                  );
                  
                  if (symbolData) {
                    addBoundary(symbol.boundingBox?.vertices, `符号: ${symbol.text}`, symbol.text);
                  }
                });
              }
            });
          }
        });
      }
    });
  });

  return boundaries;
});

// --- Methods ---
const toggleBlockVisibility = () => {
  showBounds.value = !showBounds.value;
};

// 添加复制文本功能
const copyBlockText = (text) => {
  if (!text) {
    console.log('没有文本可复制');
    return;
  }
  
  try {
    // 方法1：使用 Clipboard API (现代浏览器)
    navigator.clipboard.writeText(text)
      .then(() => {
        console.log('文本已复制：', text);
        showCopySuccess.value = true;
        setTimeout(() => {
          showCopySuccess.value = false;
        }, 2000);
      })
      .catch(err => {
        console.error('复制失败:', err);
        // 尝试备用方法
        useAlternativeCopy(text);
      });
  } catch (e) {
    console.error('复制出错，尝试备用方法', e);
    useAlternativeCopy(text);
  }
};

// 备用复制方法（处理 Clipboard API 不可用的情况）
const useAlternativeCopy = (text) => {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.top = '-9999px';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  
  try {
    const successful = document.execCommand('copy');
    if (successful) {
      console.log('使用备用方法复制成功');
      showCopySuccess.value = true;
      setTimeout(() => {
        showCopySuccess.value = false;
      }, 2000);
    } else {
      console.error('备用复制方法失败');
    }
  } catch (err) {
    console.error('备用复制方法错误:', err);
  }
  
  document.body.removeChild(textarea);
};

// Tooltip 相关方法
const getTooltipElement = () => {
  // 尝试获取，如果不存在则创建一个（更健壮的方式）
  let tooltip = document.querySelector('.coordinate-tooltip');
  if (!tooltip) {
    console.log("Creating tooltip element.");
    tooltip = document.createElement('div');
    tooltip.className = 'coordinate-tooltip';
    document.body.appendChild(tooltip);
  }
  return tooltip;
};

const showTooltip = (event, tooltipText) => {
  const tooltip = getTooltipElement();
  if (tooltip) {
    tooltip.innerHTML = tooltipText.replace(/\n/g, '<br>');
    tooltip.style.display = 'block';
    // 立即更新一次位置，避免初始闪烁在左上角
    updateTooltipPosition(event);
    // 添加事件监听器
    document.addEventListener('mousemove', updateTooltipPosition);
  }
};

const updateTooltipPosition = (event) => {
  const tooltip = getTooltipElement();
  // 检查 tooltip 是否仍然存在且可见
  if (!tooltip || tooltip.style.display === 'none') {
    return;
  }

  const x = event.clientX;
  const y = event.clientY;
  const margin = 15; // 光标与提示框的距离
  const winW = window.innerWidth;
  const winH = window.innerHeight;
  const ttW = tooltip.offsetWidth;
  const ttH = tooltip.offsetHeight;

  let left = x + margin;
  let top = y + margin;

  // 防止提示框超出窗口边界
  if (left + ttW + margin > winW) {
    left = x - ttW - margin;
  }
  if (top + ttH + margin > winH) {
    top = y - ttH - margin;
  }
  left = Math.max(margin / 2, left); // 防止贴边
  top = Math.max(margin / 2, top);

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
};

const hideTooltip = () => {
  const tooltip = getTooltipElement();
  if (tooltip) {
    tooltip.style.display = 'none';
  }
  // 移除事件监听器
  document.removeEventListener('mousemove', updateTooltipPosition);
};

// --- Lifecycle Hooks ---
onUnmounted(() => {
  document.removeEventListener('mousemove', updateTooltipPosition);
});
</script>

<style scoped>
/* 确保所有样式规则都在这里 */
.coordinate-view-container {
    background-color: white;
    border-radius: 8px;
    padding: 1rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    margin-top: 1.5rem;
}
.coordinate-view-placeholder {
    background-color: white;
    border-radius: 8px;
    padding: 2rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    margin-top: 1.5rem;
    text-align: center;
    color: #a0aec0;
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
    overflow: auto;
    border: 1px solid #ddd;
    background-color: #f9f9f9;
    padding: 0;
    margin-top: 0.5rem;
    min-height: 400px;
    position: relative;
    box-sizing: border-box; /* Ensure border is included in size */
}

.coordinate-system {
    position: relative;
    /* Width and height are set dynamically via :style */
    box-sizing: border-box; /* Ensure padding/border included if any */
}

.y-axis {
    position: absolute;
    left: 30px;
    top: 0;
    width: 1px;
    background-color: #aaa;
    /* height set dynamically */
}

.x-axis {
    position: absolute;
    left: 30px;
    bottom: 30px;
    height: 1px;
    background-color: #aaa;
     /* width set dynamically */
}

.axis-label {
    position: absolute;
    font-size: 10px;
    color: #555;
    user-select: none;
}

.x-label {
    bottom: 10px;
    transform: translateX(-50%);
}

.y-label {
    left: 5px;
     transform: translateY(-50%);
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
    stroke: red;
    stroke-width: 1.5px;
    stroke-dasharray: 4, 4;
    fill: rgba(255, 0, 0, 0.05);
    transition: fill 0.2s, stroke 0.2s, stroke-width 0.2s;
    cursor: pointer;
    pointer-events: all; /* Polygons are interactive */
}

.block-polygon:hover {
    fill: rgba(255, 0, 0, 0.2);
    stroke: #ff0000;
    stroke-width: 2px;
    stroke-dasharray: none;
    z-index: 100; /* Ensure hover is visible */
}

.text-block {
  position: absolute;
  overflow: visible;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #333; /* 保留文字颜色 */
  font-family: 'Arial', sans-serif;
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
}

.text-block:hover {
  /* 完全移除悬停样式，因为现在字符元素不接收鼠标事件 */
  /* z-index: 101; */
}

/* 复制成功提示 */
.copy-success-toast {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  z-index: 1000;
}

/* 全局 Tooltip 样式 (如果需要的话，保持不变) */
body .coordinate-tooltip {
  position: fixed;
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
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
</style>