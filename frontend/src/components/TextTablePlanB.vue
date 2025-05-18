<template>
  <div class="text-table-container">
    <!-- 表格标题 -->
    <div class="table-title" v-if="tableData.headers && tableData.headers.length > 0">
      <span class="table-info"
        >{{ tableData.headers.length }} {{ i18n.t('columns') }}, {{ tableData.rows.length }}
        {{ i18n.t('rows') }}</span
      >
    </div>

    <!-- 整个容器不设置方向，让内部内容决定方向 -->
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
import { ref, watch, onMounted } from 'vue'
import { useOcrStore } from '@/stores/ocrStore'
import { useI18nStore } from '@/stores/i18nStore'

const store = useOcrStore()
const i18n = useI18nStore()

// 表格数据结构
const tableData = ref({
  headers: [],
  rows: [],
})

// 表格样式
const tableClasses = ''

// 监听表格设置变化
watch(() => store.tableSettings, processTableData, { deep: true })

// 当OCR结果更新时，处理表格数据
watch(() => store.filteredSymbolsData, processTableData, { immediate: true })
watch(() => store.ocrRawResult, processTableData, { immediate: true })

// 监听识别模式变化，在表格模式下重新处理数据
watch(
  () => store.recognitionMode,
  (newMode) => {
    if (newMode === 'table') {
      console.log('检测到表格模式，重新处理表格数据')
      processTableData()
    }
  },
  { immediate: true },
)

onMounted(() => {
  console.log('TextTable组件已挂载，处理表格数据')
  processTableData()
})

// 处理OCR结果，转换为表格格式
function processTableData() {
  console.log('开始处理表格数据，识别模式:', store.recognitionMode)

  // 检查是否在表格模式下
  if (store.recognitionMode !== 'table') {
    console.log('不在表格模式下，跳过表格处理')
    return
  }

  try {
    // 检查是否有有效的OCR结果
    if (!store.filteredSymbolsData.length || !store.fullTextAnnotation) {
      console.log('没有有效的OCR结果，无法处理表格')
      tableData.value = { headers: ['暂无数据'], rows: [] }
      return
    }

    // 获取所有文本块
    const symbols = store.filteredSymbolsData.filter((s) => s.isFiltered)
    console.log(`处理表格数据：找到 ${symbols.length} 个符号`)

    // 获取用户指定的行列数
    const userColumns = store.tableSettings.columns || 0
    const userRows = store.tableSettings.rows || 0

    console.log(`表格设置：${userColumns} 列, ${userRows} 行`)

    // 如果用户指定了特定行列数，使用对应处理函数
    if (userColumns > 0 || userRows > 0) {
      if (userColumns === 2) {
        processTwoColumnTable(symbols)
      } else if (userColumns > 0) {
        processTableWithCustomColumns(symbols, userColumns)
      } else if (userRows > 0) {
        processTableWithCustomRows(symbols, userRows)
      }
      return
    }

    // 自动检测并处理表格（修改为使用LINE_BREAK逻辑）
    autoDetectAndProcessTable(symbols)
  } catch (error) {
    console.error('处理表格数据时出错:', error)
    // 设置一个错误消息
    tableData.value = {
      headers: ['处理错误'],
      rows: [['表格数据处理失败，请尝试使用不同的识别模式']],
    }
  }
}

// 使用LINE_BREAK信息处理每行并划分列
function processRowsByLineBreaks(lines) {
  const tableRows = []

  // 逐行处理
  lines.forEach((line) => {
    // 按X坐标排序符号（从左到右）
    const sortedSymbols = [...line].sort((a, b) => a.x - b.x)

    if (sortedSymbols.length === 0) return // 跳过空行

    // 用于存储当前行的各列数据
    const columns = []

    // 这一行的LINE_BREAK索引位置
    const lineBreakPositions = []
    sortedSymbols.forEach((symbol, index) => {
      if (symbol.detectedBreak === 'LINE_BREAK') {
        lineBreakPositions.push(index)
      }
    })

    // 如果没有LINE_BREAK，则整行作为一列
    if (lineBreakPositions.length === 0) {
      // 合并整行文本
      let rowText = ''
      sortedSymbols.forEach((symbol) => {
        rowText += symbol.text
        if (symbol.detectedBreak === 'SPACE' || symbol.detectedBreak === 'EOL_SURE_SPACE') {
          rowText += ' '
        }
      })
      columns.push(rowText)
    } else {
      // 根据LINE_BREAK位置划分列
      let startIndex = 0

      // 处理每一段（从一个LINE_BREAK到下一个LINE_BREAK）
      lineBreakPositions.forEach((breakIndex) => {
        let columnText = ''

        // 合并这一段内的所有字符
        for (let i = startIndex; i <= breakIndex; i++) {
          const symbol = sortedSymbols[i]
          columnText += symbol.text

          // 在非LINE_BREAK的断行处添加空格
          if (
            i < breakIndex &&
            (symbol.detectedBreak === 'SPACE' || symbol.detectedBreak === 'EOL_SURE_SPACE')
          ) {
            columnText += ' '
          }
        }

        // 添加到列
        columns.push(columnText)

        // 更新起始索引到下一个字符
        startIndex = breakIndex + 1
      })

      // 处理最后一段（如果有）
      if (startIndex < sortedSymbols.length) {
        let columnText = ''
        for (let i = startIndex; i < sortedSymbols.length; i++) {
          const symbol = sortedSymbols[i]
          columnText += symbol.text
          if (symbol.detectedBreak === 'SPACE' || symbol.detectedBreak === 'EOL_SURE_SPACE') {
            columnText += ' '
          }
        }
        columns.push(columnText)
      }
    }

    // 如果这一行有内容，添加到表格行
    if (columns.length > 0) {
      tableRows.push(columns)
    }
  })

  console.log(
    `基于LINE_BREAK处理后得到${tableRows.length}行，最大列数：${Math.max(...(tableRows.map((row) => row.length) || [0]))}`,
  )
  return tableRows
}

// 确定表头并最终化表格数据
function finalizeTableData(tableRows) {
  if (tableRows.length === 0) {
    tableData.value = { headers: [], rows: [] }
    return
  }

  // 找出所有行中的最大列数
  const maxColumns = Math.max(...tableRows.map((row) => row.length))

  // 规范化所有行的列数为最大列数
  const normalizedRows = tableRows.map((row) => {
    // 如果行的列数小于最大列数，补充空字符串
    if (row.length < maxColumns) {
      return [...row, ...Array(maxColumns - row.length).fill('')]
    }
    return row
  })

  // 分析第一行是否可能为表头
  const firstRow = normalizedRows[0]

  // 启发式判断第一行是否为表头的标准:
  // 1. 不含数字（通常表头是标题性文字）
  // 2. 或者与其他行格式明显不同
  const containsNumbers = firstRow.some((cell) => /\d/.test(cell))
  const isDistinctFromOtherRows =
    normalizedRows.length > 1 &&
    normalizedRows
      .slice(1)
      .every(
        (row) =>
          !row.every(
            (cell, i) =>
              cell.length > 0 &&
              firstRow[i].length > 0 &&
              (cell.startsWith(firstRow[i]) || firstRow[i].startsWith(cell)),
          ),
      )

  const isLikelyHeader = !containsNumbers || isDistinctFromOtherRows

  if (isLikelyHeader && normalizedRows.length > 1) {
    // 使用第一行作为表头
    tableData.value = {
      headers: firstRow,
      rows: normalizedRows.slice(1),
    }
  } else {
    // 生成默认表头
    const headers = new Array(maxColumns).fill('').map((_, i) => {
      return `列 ${i + 1}`
    })

    tableData.value = {
      headers: headers,
      rows: normalizedRows,
    }
  }

  console.log(
    `表格处理完成: ${tableData.value.headers.length}列 x ${tableData.value.rows.length}行`,
  )
}

// 优化的两列表格处理，特别针对索引类表格
function processTwoColumnTable(symbols) {
  console.log('处理两列索引表格...')

  // 按Y坐标分组识别行
  const rows = groupSymbolsByRows(symbols)
  console.log(`按Y坐标分组后识别到${rows.length}行`)

  if (rows.length === 0) {
    tableData.value = { headers: [], rows: [], rtlMode: false, tableClasses: '' }
    return
  }

  // 存储每行的文本及其中心X坐标
  const textWithPositions = []
  rows.forEach((row) => {
    // 按X坐标排序各行中的符号
    const sortedRow = [...row].sort((a, b) => a.x - b.x)

    // 计算各个单词/文本块及其位置
    let currentWord = ''
    let wordStart = null
    let lastSymbolEnd = null
    const wordsInRow = []

    sortedRow.forEach((symbol) => {
      // 检测间隔较大的位置作为单词分隔
      const GAP_THRESHOLD = 20 // 可根据实际情况调整

      if (wordStart === null) {
        // 第一个符号
        wordStart = symbol.x
        currentWord = symbol.text
        lastSymbolEnd = symbol.x + symbol.width
      } else if (symbol.x - lastSymbolEnd > GAP_THRESHOLD) {
        // 找到一个间隙，保存当前单词
        if (currentWord) {
          const wordCenter = (wordStart + lastSymbolEnd) / 2
          wordsInRow.push({
            text: currentWord.trim(),
            center: wordCenter,
            start: wordStart,
            end: lastSymbolEnd,
          })
        }

        // 开始新单词
        wordStart = symbol.x
        currentWord = symbol.text
        lastSymbolEnd = symbol.x + symbol.width
      } else {
        // 继续当前单词
        currentWord += symbol.text
        if (symbol.detectedBreak === 'SPACE' || symbol.detectedBreak === 'EOL_SURE_SPACE') {
          currentWord += ' '
        }
        lastSymbolEnd = symbol.x + symbol.width
      }
    })

    // 添加最后一个单词
    if (currentWord) {
      const wordCenter = (wordStart + lastSymbolEnd) / 2
      wordsInRow.push({
        text: currentWord.trim(),
        center: wordCenter,
        start: wordStart,
        end: lastSymbolEnd,
      })
    }

    // 将该行添加到结果中
    if (wordsInRow.length > 0) {
      textWithPositions.push(wordsInRow)
    }
  })

  // 分析所有行的文本位置，找出最佳列分隔位置
  const gapFrequency = {}
  let minX = Infinity
  let maxX = -Infinity

  // 收集所有间隙位置
  textWithPositions.forEach((row) => {
    if (row.length <= 1) return // 跳过只有一个文本块的行

    // 更新整体X轴范围
    row.forEach((word) => {
      minX = Math.min(minX, word.start)
      maxX = Math.max(maxX, word.end)
    })

    // 计算同一行中文本块之间的间隙
    for (let i = 0; i < row.length - 1; i++) {
      const currentEnd = row[i].end
      const nextStart = row[i + 1].start
      const gap = nextStart - currentEnd

      if (gap > 10) {
        // 忽略非常小的间隙
        // 计算间隙中点
        const gapCenter = currentEnd + gap / 2
        // 将位置量化到最接近的10个单位，以聚合相似位置
        const bucketPosition = Math.round(gapCenter / 10) * 10
        gapFrequency[bucketPosition] = (gapFrequency[bucketPosition] || 0) + 1
      }
    }
  })

  // 查找最常见的间隙位置作为列分隔点
  let bestPosition = -1
  let maxFrequency = 0

  Object.entries(gapFrequency).forEach(([position, frequency]) => {
    // 检查该位置是否在整体X范围的中间区域
    const numericPosition = Number(position)
    const relativePosition = (numericPosition - minX) / (maxX - minX)

    // 优先考虑在中间区域的间隙(30%-70%之间)
    const positionWeight = relativePosition > 0.3 && relativePosition < 0.7 ? 1.2 : 1.0
    const weightedFrequency = frequency * positionWeight

    if (weightedFrequency > maxFrequency) {
      maxFrequency = weightedFrequency
      bestPosition = numericPosition
    }
  })

  console.log(`最佳列分隔位置: ${bestPosition}, 出现频率: ${maxFrequency}`)

  // 如果找不到明显的分隔位置，使用页面中点
  if (bestPosition === -1 || maxFrequency < textWithPositions.length * 0.3) {
    bestPosition = (minX + maxX) / 2
    console.log(`未找到明显分隔，使用页面中点: ${bestPosition}`)
  }

  // 根据列分隔位置构建表格数据
  const tableRows = []

  textWithPositions.forEach((row) => {
    const leftColumn = []
    const rightColumn = []

    // 将文本分配到左列或右列
    row.forEach((word) => {
      if (word.center < bestPosition) {
        leftColumn.push(word.text)
      } else {
        rightColumn.push(word.text)
      }
    })

    // 合并每列中的文本
    const leftText = leftColumn.join(' ').trim()
    const rightText = rightColumn.join(' ').trim()

    // 跳过空行
    if (leftText || rightText) {
      tableRows.push([leftText, rightText])
    }
  })

  // 处理表头
  if (tableRows.length === 0) {
    tableData.value = { headers: [], rows: [], rtlMode: false, tableClasses: '' }
    return
  }

  // 使用通用表头或第一行作为表头
  let headers = ['项目', '索引']

  // 如果第一行看起来像是表头(没有数字)，使用它
  const firstRow = tableRows[0]
  const containsNumbers = /\d/.test(firstRow[0]) || /\d/.test(firstRow[1])

  if (!containsNumbers) {
    headers = firstRow
    tableData.value = {
      headers: headers,
      rows: tableRows.slice(1),
      rtlMode: false,
      tableClasses,
    }
  } else {
    // 所有行都是数据，用通用表头
    tableData.value = {
      headers: headers,
      rows: tableRows,
      rtlMode: false,
      tableClasses,
    }
  }
}

// 自动检测并处理表格函数 - 作为主入口
function autoDetectAndProcessTable(symbols) {
  console.log('执行智能表格分析...')

  // 使用基于LINE_BREAK的表格处理逻辑
  processTableByLineBreaks(symbols)
}

// 使用LINE_BREAK信息来划分表格列的实现函数
function processTableByLineBreaks(symbols) {
  console.log('使用LINE_BREAK信息处理表格...')

  // 第1步：将符号按行分组（通过Y坐标聚类）
  const lines = groupSymbolsByLines(symbols)
  console.log(`识别出${lines.length}行文本`)

  // 统计所有LINE_BREAK的数量
  const lineBreakCount = symbols.filter((symbol) => symbol.detectedBreak === 'LINE_BREAK').length
  console.log(`共检测到 ${lineBreakCount} 个LINE_BREAK断行标记`)

  // 第2步：使用LINE_BREAK信息处理每一行，划分列
  const tableRows = processRowsByLineBreaks(lines)

  // 统计列数分布情况
  const columnCounts = {}
  tableRows.forEach((row) => {
    const count = row.length
    columnCounts[count] = (columnCounts[count] || 0) + 1
  })
  console.log(
    '各行列数分布情况:',
    Object.entries(columnCounts)
      .map(([cols, rows]) => `${cols}列: ${rows}行`)
      .join(', '),
  )

  // 第3步：处理表头和最终表格数据
  finalizeTableData(tableRows)
}

// 按行聚类分组符号（基于Y坐标）
function groupSymbolsByLines(symbols) {
  // 计算动态行高阈值（基于符号高度的中位数）
  const heights = symbols.map((s) => s.height)
  const medianHeight = calculateMedian(heights)
  const lineThreshold = Math.max(medianHeight * 0.7, 5) // 取较大值，防止阈值过小

  console.log(`符号高度中位数: ${medianHeight}, 行分组阈值: ${lineThreshold}`)

  // 按Y坐标排序符号
  const sortedSymbols = [...symbols].sort((a, b) => a.y - b.y)

  const lines = []
  let currentLine = []
  let currentY = null

  sortedSymbols.forEach((symbol) => {
    const symbolY = symbol.y + symbol.height / 2 // 使用符号中心点的Y坐标

    // 新的一行
    if (currentY === null || Math.abs(symbolY - currentY) > lineThreshold) {
      if (currentLine.length > 0) {
        lines.push([...currentLine])
      }
      currentLine = [symbol]
      currentY = symbolY
    } else {
      // 同一行
      currentLine.push(symbol)
    }
  })

  // 添加最后一行
  if (currentLine.length > 0) {
    lines.push(currentLine)
  }

  // 对每行内的符号按X坐标排序
  return lines.map((line) => line.sort((a, b) => a.x - b.x))
}

// 为了兼容性，保持和原有函数相同功能
function groupSymbolsByRows(symbols) {
  return groupSymbolsByLines(symbols)
}

// 计算中位数辅助函数
function calculateMedian(values) {
  if (!values || values.length === 0) return 0

  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2
  } else {
    return sorted[middle]
  }
}

// eslint-disable-next-line no-unused-vars
function analyzeTableStructure(lines) {
  // 收集所有间隙信息
  const allGaps = []
  let minX = Infinity
  let maxX = -Infinity

  // 1. 分析每行内符号之间的间隙
  lines.forEach((line) => {
    if (line.length <= 1) return

    // 更新整体X范围
    line.forEach((symbol) => {
      minX = Math.min(minX, symbol.x)
      maxX = Math.max(maxX, symbol.x + symbol.width)
    })

    // 查找同一行中的间隙
    for (let i = 0; i < line.length - 1; i++) {
      const current = line[i]
      const next = line[i + 1]

      const gap = next.x - (current.x + current.width)

      // 忽略太小的间隙
      if (gap > 10) {
        const gapCenter = current.x + current.width + gap / 2
        const relativePosition = (gapCenter - minX) / (maxX - minX) // 归一化位置(0-1)

        allGaps.push({
          position: gapCenter,
          size: gap,
          relativePos: relativePosition,
        })
      }
    }
  })

  // 2. 聚类分析间隙位置（找出可能的列分隔点）
  // 使用位置量化方法（将相近位置的间隙归为一组）
  const gapClusters = {}
  const bucketSize = 20 // 量化粒度（像素）

  allGaps.forEach((gap) => {
    const bucket = Math.round(gap.position / bucketSize) * bucketSize
    if (!gapClusters[bucket]) {
      gapClusters[bucket] = { count: 0, totalSize: 0, positions: [] }
    }

    gapClusters[bucket].count++
    gapClusters[bucket].totalSize += gap.size
    gapClusters[bucket].positions.push(gap.position)
  })

  // 3. 找出主要的列分隔点（按出现频率排序）
  const significantSeparators = Object.entries(gapClusters)
    .map(([bucket, data]) => ({
      center: Number(bucket),
      count: data.count,
      avgSize: data.totalSize / data.count,
      // 加权评分：频率 × 平均宽度
      score: data.count * (data.totalSize / data.count),
    }))
    .filter(
      (cluster) =>
        // 过滤条件：至少在25%的行中出现，且平均宽度大于15像素
        cluster.count >= lines.length * 0.25 && cluster.avgSize > 15,
    )
    .sort((a, b) => b.score - a.score)

  // 4. 确定列数和分隔点
  let columnCount = 1 // 默认至少有1列
  let columnSeparators = []

  if (significantSeparators.length > 0) {
    // 有明显分隔点，选择前N个分隔点（限制最多5列）
    const maxSeparators = Math.min(significantSeparators.length, 4) // 最多4个分隔点（5列）
    columnSeparators = significantSeparators
      .slice(0, maxSeparators)
      .map((sep) => sep.center)
      .sort((a, b) => a - b) // 按位置排序

    columnCount = columnSeparators.length + 1
  } else if (allGaps.length > 0) {
    // 如果没有明显分隔点但有间隙数据，尝试使用最大间隙
    const maxGap = allGaps.reduce((max, gap) => (gap.size > max.size ? gap : max), allGaps[0])

    // 只有当最大间隙足够显著时才使用它
    if (maxGap.size > 30) {
      columnSeparators = [maxGap.position]
      columnCount = 2
    }
  }

  // 如果仍未检测到列分隔，但页面宽度足够，可以考虑使用中点作为分隔
  if (columnCount === 1 && maxX - minX > 300) {
    const midPoint = (minX + maxX) / 2
    columnSeparators = [midPoint]
    columnCount = 2
  }

  return {
    columnCount,
    columnSeparators,
    pageWidth: maxX - minX,
    minX,
    maxX,
  }
}

// 根据列分隔点构建表格行数据
// eslint-disable-next-line no-unused-vars
function constructTableRows(lines, columnSeparators) {
  const tableRows = []

  lines.forEach((line) => {
    // 为每列准备一个文本数组
    const columnTexts = new Array(columnSeparators.length + 1).fill('')

    // Step 1: 按照X坐标排序（从左到右）
    let sortedLineSymbols = [...line].sort((a, b) => a.x - b.x)

    // Step 2: 收集每一列的符号
    const columnSymbols = new Array(columnSeparators.length + 1).fill(null).map(() => [])

    sortedLineSymbols.forEach((symbol) => {
      const symbolCenter = symbol.x + symbol.width / 2
      let columnIndex = columnSeparators.length // 默认为最后一列

      // 确定符号所属的列
      for (let colIndex = 0; colIndex < columnSeparators.length; colIndex++) {
        if (symbolCenter < columnSeparators[colIndex]) {
          columnIndex = colIndex
          break
        }
      }

      // 将符号添加到对应列的收集器中
      columnSymbols[columnIndex].push(symbol)
    })

    // Step 3: 处理每一列的符号，构建列文本
    columnSymbols.forEach((symbols, colIndex) => {
      if (symbols.length === 0) return

      // 对每列中的符号重新按X坐标排序
      symbols.sort((a, b) => a.x - b.x)

      // 合并符号成文本
      let columnText = ''
      symbols.forEach((symbol) => {
        columnText += symbol.text
        if (symbol.detectedBreak === 'SPACE' || symbol.detectedBreak === 'EOL_SURE_SPACE') {
          columnText += ' '
        }
      })

      columnTexts[colIndex] = columnText.trim()
    })

    // 生成行数据
    let rowData = columnTexts

    // 只有当行包含实际内容时才添加
    if (rowData.some((text) => text.length > 0)) {
      tableRows.push(rowData)
    }
  })

  return tableRows
}

// eslint-disable-next-line no-unused-vars
function processMultiColumnTable(symbols, estimatedColumns) {
  // 获取所有行
  const rows = groupSymbolsByRows(symbols)

  // 计算列分隔位置
  const columnPositions = calculateColumnPositions(symbols, rows, estimatedColumns)

  // 根据列分隔位置组织表格数据
  const tableRows = []

  rows.forEach((row) => {
    // 按X坐标排序
    const sortedRow = [...row].sort((a, b) => a.x - b.x)

    // 初始化每列的文本
    const rowData = new Array(columnPositions.length + 1).fill('')

    // 将符号分配到相应的列
    sortedRow.forEach((symbol) => {
      // 确定符号所在的列
      const symbolCenter = symbol.x + symbol.width / 2
      let columnIndex = columnPositions.length // 默认是最后一列

      // 确定当前符号应该在哪一列
      for (let i = 0; i < columnPositions.length; i++) {
        if (symbolCenter < columnPositions[i]) {
          columnIndex = i
          break
        }
      }

      // 添加文本到相应的列
      rowData[columnIndex] += symbol.text
      if (symbol.detectedBreak === 'SPACE' || symbol.detectedBreak === 'EOL_SURE_SPACE') {
        rowData[columnIndex] += ' '
      }
    })

    // 修剪每列文本并添加到表格行
    tableRows.push(rowData.map((text) => text.trim()))
  })

  // 处理表头和数据行
  if (tableRows.length === 0) {
    tableData.value = { headers: [], rows: [] }
    return
  }

  // 第一行是否看起来像表头?
  const firstRow = tableRows[0]
  const isFirstRowHeader = firstRow.some(
    (cell) => cell.length > 0 && !/\d+/.test(cell) && cell.length < 20,
  )

  if (isFirstRowHeader) {
    tableData.value = {
      headers: firstRow,
      rows: tableRows.slice(1),
    }
  } else {
    // 生成通用表头
    const headers = new Array(firstRow.length).fill('').map((_, i) => `列 ${i + 1}`)
    tableData.value = {
      headers: headers,
      rows: tableRows,
    }
  }
}

// 计算列分隔位置
function calculateColumnPositions(symbols, rows, estimatedColumns) {
  // 如果列数已知，均匀分配
  if (estimatedColumns <= 1) {
    return []
  }

  // 查找最可能的列分隔位置
  const gapFrequency = {}

  rows.forEach((row) => {
    if (row.length < 2) return

    // 按X坐标排序
    const sortedRow = [...row].sort((a, b) => a.x - b.x)

    // 找出每行中的所有间隙
    for (let i = 0; i < sortedRow.length - 1; i++) {
      const current = sortedRow[i]
      const next = sortedRow[i + 1]

      const gap = next.x - (current.x + current.width)

      if (gap > 15) {
        // 只考虑有意义的间隙
        const position = Math.round((current.x + current.width + gap / 2) / 10) * 10 // 四舍五入到最近的10单位
        gapFrequency[position] = (gapFrequency[position] || 0) + 1
      }
    }
  })

  // 根据出现频率排序间隙位置
  const sortedGaps = Object.entries(gapFrequency)
    .map(([position, count]) => ({ position: Number(position), count }))
    .sort((a, b) => b.count - a.count)

  // 选择出现频率最高的几个间隙作为列分隔点
  const columnPositions = sortedGaps
    .slice(0, estimatedColumns - 1)
    .map((gap) => gap.position)
    .sort((a, b) => a - b)

  return columnPositions
}

// 用户指定列数的表格处理（简化版）
function processTableWithCustomColumns(symbols, columns) {
  if (columns === 2) {
    return processTwoColumnTable(symbols)
  }

  // 按行分组
  const rows = groupSymbolsByRows(symbols)

  // 计算页面宽度范围
  let minX = Infinity,
    maxX = -Infinity
  symbols.forEach((symbol) => {
    minX = Math.min(minX, symbol.x)
    maxX = Math.max(maxX, symbol.x + symbol.width)
  })

  // 均匀划分列
  const columnWidth = (maxX - minX) / columns
  const columnPositions = []
  for (let i = 1; i < columns; i++) {
    columnPositions.push(minX + i * columnWidth)
  }

  // 组织表格数据
  const tableRows = []

  rows.forEach((row) => {
    // 按X坐标排序
    const sortedRow = [...row].sort((a, b) => a.x - b.x)

    // 初始化每列的文本
    const rowData = new Array(columns).fill('')

    // 将符号分配到相应的列
    sortedRow.forEach((symbol) => {
      // 确定符号所在的列
      const symbolCenter = symbol.x + symbol.width / 2
      let columnIndex = columns - 1 // 默认是最后一列

      // 确定当前符号应该在哪一列
      for (let i = 0; i < columnPositions.length; i++) {
        if (symbolCenter < columnPositions[i]) {
          columnIndex = i
          break
        }
      }

      // 添加文本到相应的列
      rowData[columnIndex] += symbol.text
      if (symbol.detectedBreak === 'SPACE' || symbol.detectedBreak === 'EOL_SURE_SPACE') {
        rowData[columnIndex] += ' '
      }
    })

    // 修剪每列文本并添加到表格行
    tableRows.push(rowData.map((text) => text.trim()))
  })

  // 处理表头和数据行
  if (tableRows.length === 0) {
    tableData.value = { headers: [], rows: [] }
    return
  }

  // 检查第一行是否像表头
  const firstRow = tableRows[0]
  const isFirstRowHeader = firstRow.some(
    (cell) => cell.length > 0 && !/\d+/.test(cell) && cell.length < 20,
  )

  if (isFirstRowHeader) {
    tableData.value = {
      headers: firstRow,
      rows: tableRows.slice(1),
    }
  } else {
    // 生成通用表头
    const headers = new Array(columns).fill('').map((_, i) => `列 ${i + 1}`)
    tableData.value = {
      headers: headers,
      rows: tableRows,
    }
  }
}

// 用户指定行数的表格处理
function processTableWithCustomRows(symbols, rows) {
  // 按Y坐标排序
  const sortedSymbols = [...symbols].sort((a, b) => a.y - b.y)

  // 简单平均分割成指定行数
  const symbolsPerRow = Math.ceil(sortedSymbols.length / rows)

  // 估计列数
  const estimatedColumns = estimateTableColumns(sortedSymbols)

  // 平均分割成行
  const tableRows = []

  for (let r = 0; r < rows; r++) {
    const startIndex = r * symbolsPerRow
    const endIndex = Math.min(startIndex + symbolsPerRow, sortedSymbols.length)

    if (startIndex >= sortedSymbols.length) break

    // 获取这一行的符号
    const rowSymbols = sortedSymbols.slice(startIndex, endIndex)

    // 如果是两列表格
    if (estimatedColumns === 2) {
      const separateRows = groupSymbolsByRows(rowSymbols)
      const processedRows = []

      separateRows.forEach((separateRow) => {
        const leftColumn = []
        const rightColumn = []

        // 找出横向中点
        let minX = Infinity,
          maxX = -Infinity

        separateRow.forEach((symbol) => {
          minX = Math.min(minX, symbol.x)
          maxX = Math.max(maxX, symbol.x + symbol.width)
        })

        const midX = (minX + maxX) / 2

        // 分到左右两列
        separateRow
          .sort((a, b) => a.x - b.x)
          .forEach((symbol) => {
            const center = symbol.x + symbol.width / 2
            if (center < midX) {
              leftColumn.push(symbol)
            } else {
              rightColumn.push(symbol)
            }
          })

        // 组合左右列文本
        const leftText = combineSymbols(leftColumn)
        const rightText = combineSymbols(rightColumn)

        processedRows.push([leftText, rightText])
      })

      // 添加所有处理后的行
      processedRows.forEach((processedRow) => {
        tableRows.push(processedRow)
      })
    } else {
      // 对于多列表格，按X坐标进行分组
      const columnGroups = []

      // 简单分析符号横向分布，找到可能的列
      let minX = Infinity,
        maxX = -Infinity
      rowSymbols.forEach((symbol) => {
        minX = Math.min(minX, symbol.x)
        maxX = Math.max(maxX, symbol.x + symbol.width)
      })

      // 平均划分列
      const columnWidth = (maxX - minX) / estimatedColumns

      // 初始化每列的符号数组
      for (let c = 0; c < estimatedColumns; c++) {
        columnGroups.push([])
      }

      // 分配符号到列
      rowSymbols.forEach((symbol) => {
        const center = symbol.x + symbol.width / 2
        const relativeX = center - minX
        const columnIndex = Math.floor(relativeX / columnWidth)
        const finalIndex = Math.min(Math.max(0, columnIndex), estimatedColumns - 1)

        columnGroups[finalIndex].push(symbol)
      })

      // 合并每列的文本
      const rowData = columnGroups.map((group) => combineSymbols(group))
      tableRows.push(rowData)
    }
  }

  // 处理表头
  if (tableRows.length === 0) {
    tableData.value = { headers: [], rows: [] }
    return
  }

  // 生成通用表头
  const firstRow = tableRows[0]
  const headers = new Array(firstRow.length).fill('').map((_, i) => `列 ${i + 1}`)

  tableData.value = {
    headers: headers,
    rows: tableRows,
  }
}

// 合并符号为文本
function combineSymbols(symbols) {
  if (symbols.length === 0) return ''

  // 按X排序
  symbols.sort((a, b) => a.x - b.x)

  let columnText = ''
  symbols.forEach((symbol) => {
    columnText += symbol.text
    if (symbol.detectedBreak === 'SPACE' || symbol.detectedBreak === 'EOL_SURE_SPACE') {
      columnText += ' '
    }
  })

  return columnText.trim()
}

// 导出表格为Markdown格式
function getMarkdownTable() {
  if (!tableData.value.headers.length) return ''

  const { headers, rows } = tableData.value

  // 创建表头行
  let markdownTable = '| ' + headers.join(' | ') + ' |\n'

  // 添加分隔行
  markdownTable += '| ' + headers.map(() => '---').join(' | ') + ' |\n'

  // 添加数据行
  rows.forEach((row) => {
    let rowContent = row.join(' | ')
    markdownTable += '| ' + rowContent + ' |\n'
  })

  return markdownTable
}

// 获取表格数据，用于复制纯文本表格
function getTableData() {
  return {
    ...tableData.value,
    isRtl: false,
  }
}

// 暴露方法给父组件使用
defineExpose({
  getMarkdownTable,
  getTableData,
})

// 估计表格列数的辅助函数
function estimateTableColumns(symbols) {
  // 简单估计：通过横向分布分析
  let minX = Infinity,
    maxX = -Infinity
  symbols.forEach((symbol) => {
    minX = Math.min(minX, symbol.x)
    maxX = Math.max(maxX, symbol.x + symbol.width)
  })

  const pageWidth = maxX - minX

  // 基于页面宽度的简单启发式判断
  if (pageWidth < 200) return 1 // 非常窄，可能只有一列
  if (pageWidth < 400) return 2 // 较窄，可能有两列
  if (pageWidth < 700) return 3 // 中等宽度，可能有三列
  return 4 // 较宽，假设有四列
}
</script>

<style scoped>
/* 表格容器样式 */
.text-table-container {
  width: 100%;
  overflow-x: auto;
  padding: 8px;
  margin-bottom: 16px;
  background-color: var(--b1, #ffffff);
}

:root[data-theme='dark'] .text-table-container {
  background-color: var(--b1, #1e1e1e);
}

/* 表格标题样式 */
.text-table-container .table-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 14px;
}

/* 表格标题样式 */
.text-table-container .table-info {
  color: var(--bc, #333333);
  font-size: 12px;
  font-weight: 500;
}

:root[data-theme='dark'] .text-table-container .table-info {
  color: var(--bc, #dddddd);
}

/* 表格主体样式 */
.text-table-container .notes-style-table {
  width: 100%;
  border-collapse: collapse;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  background-color: var(--b1, #ffffff);
  border: 1px solid #555555;
  color: var(--bc, #333333);
}

:root[data-theme='dark'] .text-table-container .notes-style-table {
  background-color: var(--b1, #1e1e1e);
  color: var(--bc, #dddddd);
}

/* 表头样式 */
.text-table-container .notes-style-table thead th {
  background-color: var(--b2, #f2f2f2);
  color: var(--bc, #333333);
  font-weight: 600;
  padding: 10px;
  text-align: left;
  border: 1px solid #555555;
}

:root[data-theme='dark'] .text-table-container .notes-style-table thead th {
  background-color: var(--b2, #2a2a2a);
  color: var(--bc, #dddddd);
}

/* 单元格样式 */
.text-table-container .notes-style-table tbody td {
  padding: 8px 10px;
  text-align: left;
  border: 1px solid #555555;
  background-color: var(--b1, #ffffff);
  color: var(--bc, #333333);
}

:root[data-theme='dark'] .text-table-container .notes-style-table tbody td {
  background-color: var(--b1, #1e1e1e);
  color: var(--bc, #dddddd);
}

/* 悬停效果 - 亮色模式 */
.text-table-container .notes-style-table tbody tr:hover td {
  background-color: #e0e0e0;
  transition: all 0.2s ease;
}

/* 暗色模式样式覆盖 */
:root[data-theme='dark'] .text-table-container .notes-style-table,
:root[data-theme='dark'] .text-table-container .notes-style-table thead th,
:root[data-theme='dark'] .text-table-container .notes-style-table tbody td {
  border-color: #aaaaaa;
}

/* 悬停效果 - 暗色模式 */
:root[data-theme='dark'] .text-table-container .notes-style-table tbody tr:hover td {
  background-color: #333333;
}
</style>
