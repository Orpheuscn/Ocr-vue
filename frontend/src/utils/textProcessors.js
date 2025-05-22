/**
 * 文本处理工具函数
 * 用于处理不同语言的文本格式化、标点符号替换等操作
 * 包含水平/垂直、并行/段落等不同布局模式的文本处理函数
 */

import { isCJKLanguage, isNoSpaceLanguage } from '@/services/languageService'

/**
 * 替换 CJK 语言中的标点符号
 * 将西文标点替换为全角标点
 * @param {string} text 原始文本
 * @param {string} languageCode 语言代码
 * @returns {string} 处理后的文本
 */
export function replaceCJKPunctuation(text, languageCode) {
  if (!text || !languageCode) return text

  // 如果不是无空格语言，直接返回原文本
  if (!isNoSpaceLanguage(languageCode)) return text

  // 使用正则表达式一次性替换所有标点符号
  return text
    .replace(/,/g, '，') // 替换逗号
    .replace(/-/g, '——') // 替换连字符为破折号
    .replace(/;/g, '；') // 替换分号
    .replace(/!/g, '！') // 替换感叹号
    .replace(/\?/g, '？') // 替换问号
    .replace(/:/g, '：') // 替换冒号
    .replace(/\(/g, '（') // 替换左括号
    .replace(/\)/g, '）') // 替换右括号
    .replace(/\[/g, '【') // 替换左方括号
    .replace(/\]/g, '】') // 替换右方括号
    .replace(/\//g, '／') // 替换斜杠
    .replace(/\\/g, '＼') // 替换反斜杠
    .replace(/\./g, '。') // 替换句点
}

/**
 * 处理符号文本，根据语言类型应用不同的处理规则
 * @param {string} text 原始文本
 * @param {string} languageCode 语言代码
 * @param {string} breakType 断行类型
 * @returns {object} 处理结果，包含处理后的文本和是否需要添加空格
 */
export function processSymbolText(text, languageCode, breakType = '') {
  if (!text) return { text: '', needSpace: false }

  let processedText = text
  let needSpace = false

  // 对 CJK 语言进行标点符号替换
  if (isNoSpaceLanguage(languageCode)) {
    // 替换西文标点为 CJK 标点
    if (text === ',') {
      processedText = '，' // 替换逗号
    } else if (text === '-') {
      processedText = '—' // 替换连字符
    } else if (text === ';') {
      processedText = '；' // 替换分号
    } else if (text === '!') {
      processedText = '！' // 替换感叹号
    } else if (text === '?') {
      processedText = '？' // 替换问号
    } else if (text === ':') {
      processedText = '：' // 替换冒号
    } else if (text === '(') {
      processedText = '（' // 替换左括号
    } else if (text === ')') {
      processedText = '）' // 替换右括号
    } else if (text === '[') {
      processedText = '【' // 替换左方括号
    } else if (text === ']') {
      processedText = '】' // 替换右方括号
    } else if (text === '/') {
      processedText = '／' // 替换斜杠
    } else if (text === '\\') {
      processedText = '＼' // 替换反斜杠
    } else if (text === '.') {
      processedText = '。' // 替换句点
    }
  }

  // 处理空格（仅对非 CJK 语言）
  if ((breakType === 'SPACE' || breakType === 'EOL_SURE_SPACE') && !isCJKLanguage(languageCode)) {
    needSpace = true
  }

  return { processedText, needSpace }
}

/**
 * 判断是否需要跳过符号处理
 * 主要用于处理西方语言中的连字符
 * @param {string} text 符号文本
 * @param {string} languageCode 语言代码
 * @param {string} breakType 断行类型
 * @returns {boolean} 是否需要跳过处理
 */
export function shouldSkipSymbol(text, languageCode, breakType) {
  // 处理非CJK语言中的连字符 (HYPHEN或EOL_SURE_SPACE)
  return (
    !isCJKLanguage(languageCode) &&
    text === '-' &&
    (breakType === 'HYPHEN' || breakType === 'EOL_SURE_SPACE')
  )
}

/**
 * 格式化段落文本
 * 根据不同语言的特性处理段落格式
 * @param {Array} paragraphs 段落数组
 * @param {string} languageCode 语言代码
 * @returns {string} 格式化后的文本
 */
export function formatParagraphText(paragraphs, languageCode) {
  if (!paragraphs || paragraphs.length === 0) return ''

  // 按垂直位置排序段落
  const sortedParagraphs = [...paragraphs].sort((a, b) => a.y - b.y)

  // 连接段落，使用双换行符分隔
  return sortedParagraphs.map(p => p.text).join('\n\n')
}

/**
 * 清理文本中的换行符
 * @param {string} text 原始文本
 * @returns {string} 清理后的文本
 */
export function cleanLineBreaks(text) {
  if (!text) return ''
  return text.replace(/[\r\n]/g, '')
}

/**
 * 清理文本中的多余空格和换行符
 * @param {string} text 原始文本
 * @returns {string} 清理后的文本
 */
export function cleanTextSpaces(text) {
  if (!text) return ''
  return text.replace(/ +/g, ' ').replace(/\n+/g, '\n').trim()
}

/**
 * 处理水平并行模式的文本
 * @param {Array} symbols 符号数组
 * @param {string} languageCode 语言代码
 * @param {boolean} isFiltered 是否只处理过滤后的符号
 * @returns {string} 处理后的文本
 */
export function processHorizontalParallelText(symbols, languageCode, isFiltered = true) {
  if (!symbols || symbols.length === 0) return ''

  let text = ''
  symbols.forEach((symbol) => {
    // 如果需要过滤且符号未被过滤，则跳过
    if (isFiltered && !symbol.isFiltered) return

    // 使用工具函数处理符号文本
    const { processedText, needSpace } = processSymbolText(symbol.text, languageCode, symbol.detectedBreak?.type)
    text += processedText
    
    // 如果需要添加空格
    if (needSpace) {
      text += ' '
    }
    
    // 处理断行
    if (symbol.detectedBreak && (symbol.detectedBreak.type === 'LINE_BREAK' || symbol.detectedBreak.type === 'HYPHEN')) {
      text += '\n'
    }
  })

  return cleanTextSpaces(text)
}

/**
 * 处理水平段落模式的文本
 * @param {Object} fullTextAnnotation OCR识别结果
 * @param {Array} filteredSymbolsData 过滤后的符号数据
 * @param {string} languageCode 语言代码
 * @returns {string} 处理后的文本
 */
export function processHorizontalParagraphText(fullTextAnnotation, filteredSymbolsData, languageCode) {
  if (!fullTextAnnotation?.pages || !filteredSymbolsData) return ''
  
  // 添加安全检查，确保 filteredSymbolsData 是数组
  if (!Array.isArray(filteredSymbolsData)) {
    console.error('错误: processHorizontalParagraphText - filteredSymbolsData 不是数组', filteredSymbolsData)
    return ''
  }

  const paragraphsOutput = []

  fullTextAnnotation.pages.forEach((page) => {
    page.blocks?.forEach((block) => {
      block.paragraphs?.forEach((paragraph) => {
        let currentParagraphText = ''
        let paragraphHasFilteredContent = false
        let paragraphMinY = Infinity

        // 尝试获取段落边界框的Y坐标用于排序
        if (paragraph.boundingBox?.vertices) {
          paragraphMinY = Math.min(...paragraph.boundingBox.vertices.map((v) => v?.y ?? Infinity))
        }

        paragraph.words?.forEach((word) => {
          word.symbols?.forEach((symbol) => {
            // 在filteredSymbolsData中查找对应的符号
            const symbolData = filteredSymbolsData.find(
              (fd) =>
                fd.text === symbol.text &&
                Math.abs(
                  fd.midX -
                    (symbol.boundingBox
                      ? (Math.min(...symbol.boundingBox.vertices.map((v) => v?.x ?? Infinity)) +
                          Math.max(...symbol.boundingBox.vertices.map((v) => v?.x ?? -Infinity))) /
                        2
                      : -Infinity),
                ) < 5 &&
                Math.abs(
                  fd.midY -
                    (symbol.boundingBox
                      ? (Math.min(...symbol.boundingBox.vertices.map((v) => v?.y ?? Infinity)) +
                          Math.max(...symbol.boundingBox.vertices.map((v) => v?.y ?? -Infinity))) /
                        2
                      : -Infinity),
                ) < 5,
            )

            if (symbolData?.isFiltered) {
              // 检查符号是否通过过滤
              const breakType = symbolData.detectedBreak

              // 使用工具函数判断是否应该跳过该符号
              if (shouldSkipSymbol(symbol.text, languageCode, breakType)) {
                // 跳过连字符和空格的添加
                paragraphHasFilteredContent = true // 仍然标记段落包含过滤内容
              } else {
                // 使用工具函数处理符号文本
                const { processedText, needSpace } = processSymbolText(symbol.text, languageCode, breakType)
                currentParagraphText += processedText
                
                paragraphHasFilteredContent = true
                
                // 如果需要添加空格
                if (needSpace) {
                  currentParagraphText += ' '
                }
              }
            }
          }) // 符号循环结束
        }) // 单词循环结束

        if (paragraphHasFilteredContent) {
          let cleanedText = cleanTextSpaces(currentParagraphText) // 使用工具函数清理空格
          if (cleanedText.length > 0) {
            paragraphsOutput.push({
              text: cleanedText,
              y: isFinite(paragraphMinY) ? paragraphMinY : Infinity,
            })
          }
        }
      }) // 段落循环结束
    }) // 块循环结束
  }) // 页面循环结束

  if (paragraphsOutput.length === 0) {
    return ''
  }

  // 按垂直位置排序段落（从上到下）
  paragraphsOutput.sort((a, b) => a.y - b.y)

  // 用双换行符连接段落
  return paragraphsOutput.map((p) => p.text).join('\n\n')
}

/**
 * 处理垂直并行模式的文本
 * @param {Array} symbols 符号数组
 * @param {string} languageCode 语言代码
 * @param {boolean} isFiltered 是否只处理过滤后的符号
 * @returns {string} 处理后的文本
 */
export function processVerticalParallelText(symbols, languageCode, isFiltered = true) {
  if (!symbols || symbols.length === 0) return ''

  // 创建一个新数组，不修改原始数据
  const processedSymbols = symbols
    .filter(symbol => !isFiltered || symbol.isFiltered)
    .map(symbol => {
      // 使用工具函数处理符号文本
      const { processedText, needSpace } = processSymbolText(symbol.text, languageCode, symbol.detectedBreak?.type)
      return { ...symbol, text: processedText };
    });
  
  // 计算平均字符宽度
  const getAverageCharWidth = (symbols) => {
    if (!symbols || symbols.length === 0) return 15; // 默认宽度
    const validSymbols = symbols.filter(s => s.width > 0 && isFinite(s.width));
    const widthsPerChar = validSymbols
      .filter(s => s.text?.length > 0)
      .map(s => s.width / s.text.length);
    if (widthsPerChar.length > 0) {
      return widthsPerChar.reduce((a, b) => a + b, 0) / widthsPerChar.length;
    } else if (validSymbols.length > 0) {
      return validSymbols.reduce((a,b) => a + b.width, 0) / validSymbols.length;
    } else {
      return 15; // 默认宽度
    }
  };

  const avgWidth = getAverageCharWidth(processedSymbols);
  const columnThreshold = avgWidth * 0.75;
  
  // 初始排序：与 TextVerticalParallel 组件保持一致
  processedSymbols.sort((a, b) => {
    const colDiff = Math.abs(a.midX - b.midX);
    if (colDiff > columnThreshold) {
      return b.midX - a.midX;
    }
    return a.midY - b.midY;
  });
  
  // 分列：根据 X 坐标将字符分组
  const columns = [];
  let currentColumn = [];
  
  if (processedSymbols.length > 0) {
    currentColumn.push(processedSymbols[0]);
    let lastMidX = processedSymbols[0].midX;
    
    for (let i = 1; i < processedSymbols.length; i++) {
      const sym = processedSymbols[i];
      
      if (Math.abs(sym.midX - lastMidX) < columnThreshold) {
        currentColumn.push(sym);
        // 更新参考点（使用平均值）
        lastMidX = currentColumn.reduce((sum, s) => sum + s.midX, 0) / currentColumn.length;
      } else {
        // 开始新列
        currentColumn.sort((a, b) => a.midY - b.midY);
        columns.push(currentColumn);
        currentColumn = [sym];
        lastMidX = sym.midX;
      }
    }
    // 处理最后一列
    currentColumn.sort((a, b) => a.midY - b.midY);
    columns.push(currentColumn);
  }
  
  // 按列的 X 坐标排序（右到左）
  columns.sort((a, b) => {
    const avgXa = a.reduce((s, c) => s + c.midX, 0) / a.length;
    const avgXb = b.reduce((s, c) => s + c.midX, 0) / b.length;
    return avgXb - avgXa;
  });
  
  // 拼接结果 - 与 TextVerticalParallel 组件保持一致
  const resultText = columns.map(col => col.map(s => s.text).join('')).join('\n');
  return resultText.length > 0 ? resultText : '';
}

/**
 * 处理垂直段落模式的文本
 * @param {Object} fullTextAnnotation OCR识别结果
 * @param {Array} filteredSymbolsData 过滤后的符号数据
 * @param {string} languageCode 语言代码
 * @returns {string} 处理后的文本
 */
export function processVerticalParagraphText(fullTextAnnotation, filteredSymbolsData, languageCode) {
  if (!fullTextAnnotation?.pages || !filteredSymbolsData) return ''
  
  // 添加安全检查，确保 filteredSymbolsData 是数组
  if (!Array.isArray(filteredSymbolsData)) {
    console.error('错误: processVerticalParagraphText - filteredSymbolsData 不是数组', filteredSymbolsData)
    return ''
  }

  // 辅助函数，计算平均字符宽度
  const getAverageCharWidth = (symbols) => {
    if (!symbols || symbols.length === 0) return 15; // 默认宽度
    const validSymbols = symbols.filter(s => s.width > 0 && isFinite(s.width));
    const widthsPerChar = validSymbols
      .filter(s => s.text?.length > 0)
      .map(s => s.width / s.text.length);
    if (widthsPerChar.length > 0) {
      return widthsPerChar.reduce((a, b) => a + b, 0) / widthsPerChar.length;
    } else if (validSymbols.length > 0) {
      return validSymbols.reduce((a,b) => a + b.width, 0) / validSymbols.length;
    } else {
      return 15; // 默认宽度
    }
  };

  const paragraphs = [];
  
  fullTextAnnotation.pages.forEach(page => {
    page.blocks?.forEach(block => {
      block.paragraphs?.forEach(paragraph => {
        const symbolsInParagraph = [];
        let paragraphHasFilteredContent = false;
        let paragraphMinX = Infinity;
        
        // 尝试获取段落边界框的X坐标用于排序
        if (paragraph.boundingBox?.vertices) {
          paragraphMinX = Math.min(...paragraph.boundingBox.vertices.map(v => v?.x ?? Infinity));
        }
        
        paragraph.words?.forEach(word => {
          word.symbols?.forEach(symbol => {
            // 在filteredSymbolsData中查找对应的符号
            const symbolData = filteredSymbolsData.find(fd => 
              fd.originalIndex !== undefined &&
              fd.text === symbol.text &&
              Math.abs(fd.x - (symbol.boundingBox?.vertices?.[0]?.x ?? -1)) < 2 &&
              Math.abs(fd.y - (symbol.boundingBox?.vertices?.[0]?.y ?? -1)) < 2
            );
            
            if (symbolData?.isFiltered) {
              // 只清理段落内的换行符
              const cleanedText = cleanLineBreaks(symbolData.text || '');
              
              // 使用工具函数处理符号文本
              const { processedText, needSpace } = processSymbolText(cleanedText, languageCode, symbolData.detectedBreak);
              symbolsInParagraph.push({
                ...symbolData,
                text: processedText,
                needSpace: needSpace
              });
              paragraphHasFilteredContent = true;
            }
          });
        });
        
        if (paragraphHasFilteredContent && symbolsInParagraph.length > 0) {
          // 使用与processVerticalParallelText相同的列分割逻辑
          const avgWidth = getAverageCharWidth(symbolsInParagraph);
          const columnThreshold = avgWidth * 0.75;
          
          // 排序：按X坐标（右到左），次要按Y坐标（上到下）
          symbolsInParagraph.sort((a, b) => {
            const colDiff = Math.abs(a.midX - b.midX);
            if (colDiff > columnThreshold) {
              return b.midX - a.midX;
            }
            return a.midY - b.midY;
          });
          
          // 分列
          const columns = [];
          let currentColumn = [];
          
          if (symbolsInParagraph.length > 0) {
            currentColumn.push(symbolsInParagraph[0]);
            let lastMidX = symbolsInParagraph[0].midX;
            
            for (let i = 1; i < symbolsInParagraph.length; i++) {
              const sym = symbolsInParagraph[i];
              
              if (Math.abs(sym.midX - lastMidX) < columnThreshold) {
                currentColumn.push(sym);
                lastMidX = currentColumn.reduce((sum, s) => sum + s.midX, 0) / currentColumn.length;
              } else {
                currentColumn.sort((a, b) => a.midY - b.midY);
                columns.push(currentColumn);
                currentColumn = [sym];
                lastMidX = sym.midX;
              }
            }
            // 处理最后一列
            currentColumn.sort((a, b) => a.midY - b.midY);
            columns.push(currentColumn);
          }
          
          // 按列的X坐标排序（右到左）
          columns.sort((a, b) => {
            const avgXa = a.reduce((s, c) => s + c.midX, 0) / a.length;
            const avgXb = b.reduce((s, c) => s + c.midX, 0) / b.length;
            return avgXb - avgXa;
          });
          
          // 生成垂直段落文本 - 与 TextVerticalParagraph 组件保持一致
          // 列内字符直接连接，列之间不添加分隔符
          const paragraphText = columns.map(col => 
            col.map(s => s.text).join('')
          ).join('');
          
          paragraphs.push({
            text: paragraphText,
            x: isFinite(paragraphMinX) ? paragraphMinX : Infinity
          });
        }
      });
    });
  });
  
  if (paragraphs.length === 0) {
    return '';
  }
  
  // 按水平位置排序段落（从右到左）
  paragraphs.sort((a, b) => b.x - a.x);
  
  // 用双换行符连接段落
  return paragraphs.map(p => p.text).join('\n\n');
}
