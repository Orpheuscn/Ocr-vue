<template>
  <!-- 只保留对齐按钮 -->
  <button 
    class="btn btn-sm" 
    @click="toggleGridAlign"
    v-if="selectedBlockLevel === 'symbols'"
    :class="{ 'btn-primary': showGridAlign }"
  >
    {{ showGridAlign ? i18n.t('hideGrid') : i18n.t('alignToGrid') }}
  </button>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useI18nStore } from '@/stores/i18nStore';

const i18n = useI18nStore();

// 定义props
const props = defineProps({
  // 当前选择的区块级别，控制边界显示级别（blocks/paragraphs/words/symbols）
  selectedBlockLevel: {
    type: String,
    required: true,
    validator: (value) => ['blocks', 'paragraphs', 'words', 'symbols'].includes(value)
  },
  // 过滤后的符号数据数组
  filteredSymbolsData: {
    type: Array,
    required: true
  },
  // Y轴标签的偏移量
  xAxisOffset: {
    type: Number,
    default: 30
  },
  // 初始网格单元格大小
  initialGridCellSize: {
    type: Number,
    default: 30
  },
  // 初始统一字体大小
  initialFontSize: {
    type: Number,
    default: 16
  }
});

// 定义emit
const emit = defineEmits([
  'update:selectedBlockLevel', // 用于双向绑定selectedBlockLevel
  'gridAlignChange',          // 用于通知网格对齐状态变化
  'update:alignedSymbols'     // 用于传递对齐后的符号数据
]);

// --- 本地状态 ---
const showGridAlign = ref(false);                      // 控制网格显示与字符对齐
const gridCellSize = ref(props.initialGridCellSize);   // 网格单元格大小（px）
const uniformFontSize = ref(props.initialFontSize);    // 统一的字号大小

// 根据confidence计算背景颜色
const getBackgroundColorByConfidence = (confidence) => {
  // 将confidence值限制在0-1范围内
  const safeConfidence = Math.max(0, Math.min(1, confidence || 0));
  
  // 颜色计算：将0-1的置信度分为20个级别（每5%一个级别）
  // 使用整数索引确保相同范围内的颜色完全一致
  const level = Math.floor(safeConfidence * 20);
  
  // 使用daisyUI风格的颜色方案
  // 参考daisyUI的error, warning, success色系
  // 低置信度：采用柔和的红色
  // 中等置信度：采用温暖的橙黄色
  // 高置信度：采用清新的绿色
  
  // 定义daisyUI风格的颜色数组，从红色到绿色渐变
  const colors = [
    // 低置信度区域：红色系 (0-25%)
    'rgba(239, 68, 68, 0.6)',     // 0% - 鲜红色
    'rgba(235, 86, 75, 0.6)',     // 5%
    'rgba(230, 103, 82, 0.6)',    // 10%
    'rgba(226, 121, 88, 0.6)',    // 15%
    'rgba(221, 138, 94, 0.6)',    // 20%
    
    // 中等置信度区域：橙黄色系 (25-75%)
    'rgba(217, 155, 101, 0.5)',   // 25% - 橙色
    'rgba(212, 173, 107, 0.5)',   // 30%
    'rgba(208, 190, 113, 0.5)',   // 35%
    'rgba(203, 207, 120, 0.5)',   // 40%
    'rgba(199, 224, 126, 0.5)',   // 45%
    'rgba(250, 204, 21, 0.5)',    // 50% - 标准黄色
    'rgba(191, 213, 132, 0.5)',   // 55%
    'rgba(183, 219, 137, 0.5)',   // 60%
    'rgba(175, 225, 143, 0.5)',   // 65%
    'rgba(166, 231, 149, 0.5)',   // 70%
    
    // 高置信度区域：绿色系 (75-100%)
    'rgba(158, 237, 154, 0.4)',   // 75% - 浅绿色
    'rgba(141, 239, 152, 0.4)',   // 80%
    'rgba(111, 214, 143, 0.4)',   // 85%
    'rgba(82, 189, 135, 0.4)',    // 90%
    'rgba(53, 163, 127, 0.4)',    // 95%
    'rgba(34, 197, 94, 0.4)'      // 100% - 深绿色
  ];
  
  return colors[level];
};

// 计算对齐后的符号数据
const alignedSymbolsData = computed(() => {
  if (!showGridAlign.value) return props.filteredSymbolsData.filter(s => s.isFiltered);
  
  // 创建网格单元格映射，用于合并位置相近的字符
  const gridMap = new Map();
  
  // 第一步：将字符分配到最近的网格单元格
  props.filteredSymbolsData.filter(s => s.isFiltered).forEach(symbol => {
    // 计算网格坐标（哪个单元格）
    const gridCol = Math.round(symbol.x / gridCellSize.value);
    const gridRow = Math.round(symbol.y / gridCellSize.value);
    const gridKey = `${gridCol},${gridRow}`;
    
    // 如果该网格单元格已有字符，跳过（优先保留第一个找到的字符）
    if (!gridMap.has(gridKey)) {
      // 计算单元格左上角坐标
      const cellX = gridCol * gridCellSize.value;
      const cellY = gridRow * gridCellSize.value;
      
      // 将字符完全置于单元格内部
      gridMap.set(gridKey, {
        ...symbol,
        // 设置为单元格左上角坐标，偏移会在HTML中设置
        x: cellX,
        y: cellY,
        // 设置宽高为单元格大小
        width: gridCellSize.value,
        height: gridCellSize.value,
        // 使用统一字号
        fontSize: `${uniformFontSize.value}px`,
        // 设置统一的字体样式属性
        fontFamily: '\'Arial\', sans-serif',
        fontWeight: 'normal',
        letterSpacing: 'normal',
        textAlign: 'center',
        // 添加背景颜色，基于confidence值
        backgroundColor: getBackgroundColorByConfidence(symbol.confidence)
      });
    }
  });
  
  // 转换回数组并返回
  return Array.from(gridMap.values());
});

// 用于显示的符号数据，由父组件渲染，这里只负责计算
const symbolBlocksToDisplay = computed(() => {
  if (showGridAlign.value) {
    return alignedSymbolsData.value;
  } else {
    return props.filteredSymbolsData.filter(s => s.isFiltered).map(symbol => ({
      text: symbol.text || '',
      x: symbol.x,
      y: symbol.y,
      width: Math.max(symbol.width || 0, 20),
      height: Math.max(symbol.height || 0, 20),
      fontSize: `${Math.max(12, symbol.height * 0.8)}px`,
      // 非网格模式下不添加背景颜色
      backgroundColor: 'transparent'
    }));
  }
});

// 每当symbolBlocksToDisplay变化，就通知父组件
watch(symbolBlocksToDisplay, (newSymbols) => {
  emit('update:alignedSymbols', newSymbols);
});

// 切换网格对齐状态
const toggleGridAlign = () => {
  showGridAlign.value = !showGridAlign.value;
  
  // 发送网格对齐状态变化事件
  emit('gridAlignChange', showGridAlign.value);
  
  // 同时发送更新后的符号数据
  emit('update:alignedSymbols', symbolBlocksToDisplay.value);
  
  if (showGridAlign.value && props.selectedBlockLevel !== 'symbols') {
    // 如果启用网格对齐，自动切换到符号级别
    emit('update:selectedBlockLevel', 'symbols');
  }
};

// 提供网格对齐状态和计算值给父组件
defineExpose({
  showGridAlign,
  gridCellSize,
  uniformFontSize,
  symbolBlocksToDisplay
});
</script>

<style scoped>
/* 移除所有与字符渲染相关的样式，仅保留必要的样式 */
</style> 