<template>
  <div class="text-table-container">
    <table class="notes-style-table">
      <thead>
        <tr>
          <th v-for="(col, colIndex) in tableData.headers" :key="colIndex">
            {{ col }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, rowIndex) in tableData.rows" :key="rowIndex">
          <td v-for="(cell, cellIndex) in row" :key="cellIndex">
            {{ cell }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useOcrStore } from '@/stores/ocrStore';

const props = defineProps({
  isRtl: {
    type: Boolean,
    default: false
  }
});

const store = useOcrStore();

// 表格数据结构
const tableData = ref({
  headers: [],
  rows: []
});

// 当OCR结果更新时，处理表格数据
watch(() => store.filteredSymbolsData, processTableData, { immediate: true });
watch(() => store.ocrRawResult, processTableData, { immediate: true });

onMounted(() => {
  processTableData();
});

// 处理OCR结果，转换为表格格式
function processTableData() {
  if (!store.filteredSymbolsData.length || !store.fullTextAnnotation) {
    tableData.value = { headers: [], rows: [] };
    return;
  }

  // 获取所有文本块
  const symbols = store.filteredSymbolsData.filter(s => s.isFiltered);
  
  // 步骤1: 收集所有行和列的位置信息
  const rows = new Set();
  const columns = new Set();
  
  // 特殊的Y轴距离阈值，如果两个元素的Y坐标差距小于这个值，认为它们在同一行
  const ROW_THRESHOLD = 5;
  // 特殊的X轴距离阈值，如果两个元素的X坐标差距小于这个值，认为它们在同一列
  const COLUMN_THRESHOLD = 10;
  
  // 收集所有可能的行和列位置
  symbols.forEach(symbol => {
    // 根据Y坐标确定行
    const y = Math.round(symbol.y);
    
    // 检查是否已经有相近的行坐标
    let foundMatchingRow = false;
    for (const existingY of rows) {
      if (Math.abs(existingY - y) < ROW_THRESHOLD) {
        foundMatchingRow = true;
        break;
      }
    }
    
    if (!foundMatchingRow) {
      rows.add(y);
    }
    
    // 根据X坐标确定列
    const x = Math.round(symbol.x);
    
    // 检查是否已经有相近的列坐标
    let foundMatchingColumn = false;
    for (const existingX of columns) {
      if (Math.abs(existingX - x) < COLUMN_THRESHOLD) {
        foundMatchingColumn = true;
        break;
      }
    }
    
    if (!foundMatchingColumn) {
      columns.add(x);
    }
  });
  
  // 将行和列转换为有序数组
  const rowPositions = Array.from(rows).sort((a, b) => a - b);
  const columnPositions = Array.from(columns).sort((a, b) => a - b);
  
  // 步骤2: 创建表格单元格网格
  const grid = [];
  
  // 初始化空网格
  for (let i = 0; i < rowPositions.length; i++) {
    grid[i] = [];
    for (let j = 0; j < columnPositions.length; j++) {
      grid[i][j] = '';
    }
  }
  
  // 步骤3: 将文本放入对应的单元格
  symbols.forEach(symbol => {
    // 找到符号所在的行
    let rowIndex = -1;
    for (let i = 0; i < rowPositions.length; i++) {
      if (Math.abs(symbol.y - rowPositions[i]) < ROW_THRESHOLD) {
        rowIndex = i;
        break;
      }
    }
    
    // 找到符号所在的列
    let colIndex = -1;
    for (let j = 0; j < columnPositions.length; j++) {
      if (Math.abs(symbol.x - columnPositions[j]) < COLUMN_THRESHOLD) {
        colIndex = j;
        break;
      }
    }
    
    // 如果找到有效的行和列，将文本添加到对应单元格
    if (rowIndex >= 0 && colIndex >= 0) {
      grid[rowIndex][colIndex] += symbol.text;
      
      // 根据断行类型添加空格或换行
      if (symbol.detectedBreak === 'SPACE' || symbol.detectedBreak === 'EOL_SURE_SPACE') {
        grid[rowIndex][colIndex] += ' ';
      } else if (symbol.detectedBreak === 'LINE_BREAK') {
        // 在表格单元格内，我们不添加换行符
      }
    }
  });
  
  // 步骤4: 清理和转换网格数据为表格结构
  // 假设第一行是表头
  const headers = grid[0] ? grid[0].map(cell => cell.trim()) : [];
  const dataRows = grid.slice(1).map(row => row.map(cell => cell.trim()));
  
  tableData.value = {
    headers: headers,
    rows: dataRows
  };
}

// 导出表格为Markdown格式
function getMarkdownTable() {
  if (!tableData.value.headers.length) return '';
  
  const { headers, rows } = tableData.value;
  
  // 创建表头
  let markdownTable = '| ' + headers.join(' | ') + ' |\n';
  
  // 添加分隔线
  markdownTable += '| ' + headers.map(() => '---').join(' | ') + ' |\n';
  
  // 添加数据行
  rows.forEach(row => {
    markdownTable += '| ' + row.join(' | ') + ' |\n';
  });
  
  return markdownTable;
}

// 暴露方法给父组件使用
defineExpose({
  getMarkdownTable
});
</script>

<style scoped>
.text-table-container {
  width: 100%;
  overflow-x: auto;
  padding: 0.5rem;
}

.notes-style-table {
  width: 100%;
  border-collapse: collapse;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: #333;
  margin: 0 auto;
  background-color: transparent;
}

.notes-style-table th,
.notes-style-table td {
  border: 0.5px solid #d1d1d1;
  padding: 8px 12px;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
}

.notes-style-table th {
  background-color: #f7f7f7;
  font-weight: 500;
  color: #333;
}

.notes-style-table tr {
  background-color: white;
}

.notes-style-table tr:nth-child(even) {
  background-color: #fafafa;
}
</style> 