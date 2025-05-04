// src/stores/ocrStore.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
// 确保正确导入你的 API 服务文件路径
import { performOcrRequest, getLanguageName } from '@/services/visionApi';
// 导入PDF适配器
import { renderPdfPage, getPdfPageCount } from '@/utils/pdfAdapter';
// 不再需要导入PDF.js，使用全局对象
// worker设置已经在main.js中完成

export const useOcrStore = defineStore('ocr', () => {
  // --- 私有辅助函数 ---
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result;
        if (typeof result === 'string') {
          // 确保只返回 base64 部分
          const base64String = result.split(',')[1];
          if (base64String) {
            resolve(base64String);
          } else {
            reject(new Error("无法从 Data URL 提取 Base64 数据"));
          }
        } else {
          reject(new Error("无法将文件读取为 Base64 字符串"));
        }
      };
      reader.onerror = error => reject(error);
    });
  };

  // --- 状态 (State) ---

  // API 相关
  const apiKey = ref(localStorage.getItem('googleVisionApiKey') || '');
  const showApiSettings = ref(!apiKey.value); // 如果没有保存的 key，默认显示设置

  // 文件和预览相关
  const currentFiles = ref([]); // 存储 File 对象数组 (虽然目前只处理第一个)
  const filePreviewUrl = ref(''); // 用于 <img> src (Blob URL 或 Data URL)
  const isPdfFile = ref(false);
  const pdfDataArray = ref(null); // 存储PDF文件的Uint8Array
  const currentPage = ref(1);
  const totalPages = ref(0);

  // UI 状态
  const isLoading = ref(false);
  const loadingMessage = ref('处理中...');
  const notification = ref({ message: '', type: 'info', visible: false, key: 0 }); // Key 用于强制更新通知组件
  const isDimensionsKnown = ref(false); // 新增：标记图片/PDF 尺寸是否已知

  // OCR 结果相关
  const ocrRawResult = ref(null); // 存储原始 API 响应中的 responses[0]
  const fullTextAnnotation = ref(null); // API 的 fullTextAnnotation 对象
  const originalFullText = ref(''); // 提取出的完整文本字符串
  const imageDimensions = ref({ width: 0, height: 0 }); // 图片或当前 PDF 页面的自然/渲染尺寸
  const detectedLanguageCode = ref('und');
  const detectedLanguageName = ref('未确定');

  // 过滤和显示相关
  const filterSettings = ref({
    minWidth: 0, maxWidth: 100, // 初始值会根据图片调整
    minX: 0, maxX: 1000,
    minY: 0, maxY: 1000,
  });
  const filterBounds = ref({ // 滑块的最大可选范围
     width: { min: 0, max: 100 },
     x: { min: 0, max: 1000 },
     y: { min: 0, max: 1000 },
  });
  // 处理后的符号数据，用于文本显示和坐标系
  const filteredSymbolsData = ref([]);
  // { text, x, y, width, height, midX, midY, isFiltered, originalIndex, detectedBreak, vertices }[]

  const initialTextDirection = ref('horizontal'); // 'horizontal' 或 'vertical'
  const textDisplayMode = ref('parallel'); // 'parallel' 或 'paragraph'

  // --- 计算属性 (Getters / Computed) ---
  const hasApiKey = computed(() => !!apiKey.value);
  // **重要：** 确保可以开始 OCR 的条件包含 isDimensionsKnown
  const canStartOcr = computed(() =>
    currentFiles.value.length > 0 &&
    hasApiKey.value &&
    !isLoading.value &&
    isDimensionsKnown.value // 只有尺寸已知才能开始
  );
  const textStats = computed(() => {
      const text = originalFullText.value || '';
      const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;
      const charCount = text.length;
      return { words: wordCount, chars: charCount };
  });
  const hasOcrResult = computed(() => !!fullTextAnnotation.value || originalFullText.value.length > 0);

  // --- 动作 (Actions) ---

  // 显示通知 (内部使用)
  const _showNotification = (msg, type = 'info') => {
    notification.value = { message: msg, type: type, visible: true, key: Date.now() };
    // 自动隐藏交给 NotificationBar 组件处理
  };

  // 重置 OCR 相关数据
  const resetOcrData = () => {
      ocrRawResult.value = null;
      fullTextAnnotation.value = null;
      originalFullText.value = '';
      filteredSymbolsData.value = [];
      // imageDimensions 应该在加载新文件时重置，这里不重置
      detectedLanguageCode.value = 'und';
      detectedLanguageName.value = '未确定';
      // 过滤器设置和范围在 setupFilterBounds 中处理
      // textDisplayMode.value = 'parallel'; // 按需重置
      // initialTextDirection.value = 'horizontal'; // 按需重置
  };

  // 重置 PDF 相关状态
  const resetPdfState = () => {
      // 清理PDF资源
      pdfDataArray.value = null;
      currentPage.value = 1;
      totalPages.value = 0;
      isPdfFile.value = false;
  };

  // 重置整个 UI 状态（例如，上传新文件时）
  function resetUIState() {
      currentFiles.value = [];
      filePreviewUrl.value = ''; // 清除预览 URL
      resetPdfState();
      resetOcrData();
      imageDimensions.value = { width: 0, height: 0 }; // 重置尺寸
      isDimensionsKnown.value = false; // **重要：重置尺寸已知状态**
      isLoading.value = false;
      loadingMessage.value = '处理中...';
      // 可以选择是否重置 API 设置显示状态
      // showApiSettings.value = !hasApiKey.value;
      // 重置过滤器到最大范围（如果需要）
      // filterSettings.value = { ...filterBounds.value }; // 这需要 filterBounds 先被设置
  }

  // 设置 API Key
  function setApiKey(key) {
    const trimmedKey = key ? key.trim() : ''; // 处理 null 或 undefined
    apiKey.value = trimmedKey;
    if (trimmedKey) {
        localStorage.setItem('googleVisionApiKey', trimmedKey);
        _showNotification('API 密钥已保存', 'success');
        showApiSettings.value = false;
    } else {
        localStorage.removeItem('googleVisionApiKey');
        _showNotification('API 密钥已清除', 'info');
        // 用户清除了key，可能需要提示他们输入
        showApiSettings.value = true;
    }
  }

  // 切换 API 设置面板显示
  function toggleApiSettings() {
      showApiSettings.value = !showApiSettings.value;
  }

  // 加载用户选择的文件
  async function loadFiles(files) {
      if (!files || files.length === 0) return;
      
      resetUIState(); // 重置状态

      const file = files[0]; // 只处理第一个文件
      currentFiles.value = [file];

      isLoading.value = true;
      loadingMessage.value = '加载文件中...';

      try {
          if (file.type === 'application/pdf') {
              isPdfFile.value = true;
              
              try {
                  // 读取文件数据为ArrayBuffer
                  const buffer = await file.arrayBuffer();
                  
                  // 创建ArrayBuffer数据的独立副本
                  const tempArray = new Uint8Array(buffer);
                  const bufferCopy = new Uint8Array(tempArray.length);
                  bufferCopy.set(tempArray);
                  
                  // 存储数据副本
                  pdfDataArray.value = bufferCopy;
                  
                  // 获取PDF页数
                  totalPages.value = await getPdfPageCount(pdfDataArray.value);
                  currentPage.value = 1;
                  
                  // 渲染第一页
                  await renderCurrentPdfPageToPreview();
              } catch (pdfError) {
                  console.error("PDF处理错误:", pdfError);
                  throw new Error(`PDF文件处理失败: ${pdfError.message}`);
              }
              
          } else if (file.type.startsWith('image/')) {
              isPdfFile.value = false;
              // 释放之前可能存在的 Blob URL
              if (filePreviewUrl.value && filePreviewUrl.value.startsWith('blob:')) {
                  URL.revokeObjectURL(filePreviewUrl.value);
              }
              filePreviewUrl.value = URL.createObjectURL(file); // 使用 Blob URL 进行预览
              // 尺寸将在 ImageCanvas 组件加载图片后通过事件设置
              // isDimensionsKnown 会在事件回调中设置为 true
          } else {
              currentFiles.value = [];
              throw new Error(`不支持的文件类型: ${file.type || '未知'}`);
          }
      } catch (error) {
          console.error("文件加载错误:", error);
          _showNotification(`文件加载失败: ${error.message || error}`, 'error');
          resetUIState();
      } finally {
          // 如果不是PDF，加载状态在图片@load事件后由setImageDimension解除
          // 如果是PDF，加载状态在renderCurrentPdfPageToPreview中解除
          if (!isPdfFile.value) {
              isLoading.value = false; // 对于图片，加载文件本身很快
          }
      }
  }

  // 渲染当前 PDF 页面到 Data URL (用于预览和 OCR)
  async function renderCurrentPdfPageToPreview() {
      if (!pdfDataArray.value || !isPdfFile.value) return;

      isLoading.value = true;
      loadingMessage.value = `渲染 PDF 第 ${currentPage.value} 页...`;
      isDimensionsKnown.value = false; // 渲染新页面时，尺寸暂时未知

      try {
          // 直接传递原始数据，不要在这里创建Uint8Array副本
          // 让pdfAdapter处理数据副本的创建
          const result = await renderPdfPage(pdfDataArray.value, currentPage.value, 1.5);
          
          // 设置尺寸已知状态
          imageDimensions.value = { width: result.width, height: result.height };
          isDimensionsKnown.value = true;

          // 释放旧的 URL
          if (filePreviewUrl.value && filePreviewUrl.value.startsWith('data:')) {
             // Data URLs 不需要释放
          } else if (filePreviewUrl.value && filePreviewUrl.value.startsWith('blob:')) {
             URL.revokeObjectURL(filePreviewUrl.value);
          }

          // 使用适配器返回的数据URL
          filePreviewUrl.value = result.dataUrl;
          
          resetOcrData(); // 清除旧 OCR 结果
          _showNotification(`PDF 第 ${currentPage.value} 页渲染完成`, 'success');

      } catch (error) {
          console.error(`PDF 页面 ${currentPage.value} 渲染错误:`, error);
          _showNotification(`渲染 PDF 第 ${currentPage.value} 页失败: ${error.message}`, 'error');
          filePreviewUrl.value = ''; // 清除预览
          imageDimensions.value = { width: 0, height: 0 }; // 重置尺寸
      } finally {
          isLoading.value = false;
      }
  }

  // 切换 PDF 页面
  async function changePdfPage(newPage) {
      if (!isPdfFile.value || newPage < 1 || newPage > totalPages.value || isLoading.value) {
          return; // 防止无效切换或加载时切换
      }
      if (newPage !== currentPage.value) {
          currentPage.value = newPage;
          await renderCurrentPdfPageToPreview(); // 重新渲染页面
          // 注意：切换页面后需要用户再次点击"开始识别"
      }
  }

  // 由 ImageCanvas 组件调用，设置图片尺寸
  function setImageDimension(dimension, value) {
      // 确保传入的值是数字且大于0
      const numericValue = Number(value);
      if (!isNaN(numericValue) && numericValue > 0) {
          // 更新对应的维度
          imageDimensions.value = { ...imageDimensions.value, [dimension]: numericValue };
          console.log(`图像尺寸更新: ${dimension} = ${numericValue}`);

          // **重要：检查是否 width 和 height 都已有效**
          if (imageDimensions.value.width > 0 && imageDimensions.value.height > 0) {
              // 只有当两个维度都有效时，才认为尺寸已知
              if (!isDimensionsKnown.value) {
                 isDimensionsKnown.value = true; // 设置为 true
                 console.log("图像尺寸已完全设置:", imageDimensions.value);

                 // 如果 OCR 结果已存在（说明之前可能尺寸未知），重新处理
                 if (hasOcrResult.value) {
                    console.log("尺寸在 OCR 后更新，重新计算过滤器范围并应用过滤器。");
                    // 确保 setupFilterBounds 使用的是最新的有效尺寸
                    setupFilterBounds(imageDimensions.value.width, imageDimensions.value.height);
                    applyFilters(filterSettings.value); // 使用当前的过滤器设置重新应用
                 }
              }
          }
          // else {
          //   // 如果只有一个维度有效，isDimensionsKnown 保持 false
          //   console.log(`图像尺寸部分设置: <span class="math-inline">\{dimension\}\=</span>{numericValue}, 另一个维度尚未设置或无效。`);
          // }
      } else {
          // **修改警告信息或移除**
          // 如果确实想警告无效输入，可以保留，但信息要准确
          console.warn(`尝试设置无效或非正数的图像尺寸: ${dimension} = ${value}`);
          // 这里不应该重置 imageDimensions 或 isDimensionsKnown，
          // 因为可能另一个维度是有效的，或者这次调用本身就是无效的。
      }
  }

  // 开始 OCR 处理
  async function startOcrProcess(direction) {
      // 再次检查是否可以开始 (防御性编程)
      if (!canStartOcr.value || !currentFiles.value[0]) {
          _showNotification('无法开始识别，请检查文件、API Key 和图像尺寸。', 'error');
          if (!isDimensionsKnown.value) {
              _showNotification('图像尺寸尚未加载完成，请稍候。', 'info');
          }
          if (!hasApiKey.value) {
              _showNotification('请先设置 API Key。', 'error');
              showApiSettings.value = true;
          }
          return;
      }

      initialTextDirection.value = direction; // 锁定用户选择的方向
      isLoading.value = true;
      loadingMessage.value = '正在识别文本...';
      resetOcrData(); // 清除旧结果

      try {
          let base64Image = '';
          const processDimensions = imageDimensions.value; // 使用已知的尺寸

          if (isPdfFile.value) {
              // 对于 PDF，使用当前渲染页面的 Data URL
              if (!filePreviewUrl.value.startsWith('data:image/png;base64,')) {
                  throw new Error("PDF 页面预览数据无效，请重新加载文件");
              }
              base64Image = filePreviewUrl.value.split(',')[1];
          } else {
              // 对于图片，将 File 对象转换为 Base64
              base64Image = await fileToBase64(currentFiles.value[0]);
          }

          // 调用 API 服务
          const result = await performOcrRequest(base64Image, apiKey.value);
          ocrRawResult.value = result; // 存储原始结果

          // 解析和处理结果
          fullTextAnnotation.value = result.fullTextAnnotation || null;
          const textAnns = result.textAnnotations || [];
          originalFullText.value = fullTextAnnotation.value?.text || (textAnns[0]?.description || '');

          // 检测语言
          const langCode = fullTextAnnotation.value?.pages?.[0]?.property?.detectedLanguages?.[0]?.languageCode
                           || textAnns[0]?.locale;
          detectedLanguageCode.value = langCode || 'und';
          detectedLanguageName.value = getLanguageName(langCode);

          // 设置过滤器范围
          setupFilterBounds(processDimensions.width, processDimensions.height);

          // 应用过滤器（使用重置后的最大范围）
          applyFilters(filterSettings.value);

          _showNotification('识别完成', 'success');

      } catch (error) {
          console.error("OCR 处理错误:", error);
          _showNotification(`识别失败: ${error.message || error}`, 'error');
          resetOcrData(); // 失败时清除结果
      } finally {
          isLoading.value = false;
      }
  }

  // 设置过滤器边界（滑块范围）
  function setupFilterBounds(imgW = 1000, imgH = 1000) {
        // ... (这部分逻辑与之前 store 中的实现相同，计算 min/max W/X/Y) ...
        let minW = Infinity, maxW = 0, minX = Infinity, maxX = 0, minY = Infinity, maxY = 0;
        let hasBounds = false;

        if (fullTextAnnotation.value?.pages) {
             fullTextAnnotation.value.pages.forEach(p => p.blocks?.forEach(b => b.paragraphs?.forEach(pg => pg.words?.forEach(w => w.symbols?.forEach(s => {
                 if (s.boundingBox?.vertices) {
                     let sMinX = Infinity, sMinY = Infinity, sMaxX = -Infinity, sMaxY = -Infinity;
                     s.boundingBox.vertices.forEach(v => {
                         sMinX = Math.min(sMinX, v?.x ?? Infinity); sMinY = Math.min(sMinY, v?.y ?? Infinity);
                         sMaxX = Math.max(sMaxX, v?.x ?? -Infinity); sMaxY = Math.max(sMaxY, v?.y ?? -Infinity);
                     });
                     if(isFinite(sMinX) && isFinite(sMinY) && isFinite(sMaxX) && isFinite(sMaxY)) {
                         const width = sMaxX - sMinX;
                         minW = Math.min(minW, width); maxW = Math.max(maxW, width);
                         minX = Math.min(minX, sMinX); maxX = Math.max(maxX, sMaxX);
                         minY = Math.min(minY, sMinY); maxY = Math.max(maxY, sMaxY);
                         hasBounds = true;
                     }
                 }
             })))));
        }

        if (!hasBounds || !isFinite(imgW) || imgW <= 0 || !isFinite(imgH) || imgH <= 0) {
             // 使用默认或图像尺寸作为回退
             imgW = Math.max(1000, imgW || 1000); // 确保有基础值
             imgH = Math.max(1000, imgH || 1000);
             minW = 0; maxW = Math.max(Math.round(imgW / 10), 50);
             minX = 0; maxX = imgW;
             minY = 0; maxY = imgH;
        } else {
            minW = Math.floor(minW); maxW = Math.ceil(maxW);
            minX = Math.floor(minX); maxX = Math.ceil(maxX);
            minY = Math.floor(minY); maxY = Math.ceil(maxY);
        }

        if (maxW <= minW) maxW = minW + 1;
        if (maxX <= minX) maxX = minX + 1;
        if (maxY <= minY) maxY = minY + 1;

        filterBounds.value = {
            width: { min: minW, max: maxW },
            x: { min: minX, max: maxX },
            y: { min: minY, max: maxY },
        };

        // 重要：设置完边界后，将当前过滤器重置为最大范围
        filterSettings.value = {
            minWidth: minW, maxWidth: maxW,
            minX: minX, maxX: maxX,
            minY: minY, maxY: maxY,
        };
        console.log("过滤器范围已设置:", filterBounds.value);
  }

  // 应用过滤器设置，计算 filteredSymbolsData
  function applyFilters(newFilters) {
      filterSettings.value = { ...newFilters }; // 更新当前设置

      if (!fullTextAnnotation.value?.pages) {
          filteredSymbolsData.value = [];
          return;
      }

      const { minWidth, maxWidth, minX, maxX, minY, maxY } = filterSettings.value;
      const symbols = [];
      let charIndex = 0; // 尝试跟踪原始文本索引

      // --- 遍历符号并应用过滤器 ---
      try { // 添加 try...catch 块来捕获此复杂循环中的潜在错误
          fullTextAnnotation.value.pages.forEach(page => {
              page.blocks?.forEach(block => {
                  block.paragraphs?.forEach(paragraph => {
                      paragraph.words?.forEach(word => {
                          word.symbols?.forEach(symbol => {
                              const symbolData = {
                                  text: symbol.text || '',
                                  x: 0, y: 0, width: 0, height: 0,
                                  midX: 0, midY: 0, isFiltered: false,
                                  originalIndex: charIndex,
                                  detectedBreak: symbol.property?.detectedBreak?.type,
                                  vertices: symbol.boundingBox?.vertices || []
                              };

                              let validBounds = false;
                              if (symbolData.vertices.length >= 4) {
                                  let sMinX = Infinity, sMinY = Infinity, sMaxX = -Infinity, sMaxY = -Infinity;
                                  symbolData.vertices.forEach(v => {
                                      sMinX = Math.min(sMinX, v?.x ?? Infinity); sMinY = Math.min(sMinY, v?.y ?? Infinity);
                                      sMaxX = Math.max(sMaxX, v?.x ?? -Infinity); sMaxY = Math.max(sMaxY, v?.y ?? -Infinity);
                                  });

                                  if(isFinite(sMinX) && isFinite(sMinY) && isFinite(sMaxX) && isFinite(sMaxY)) {
                                      symbolData.x = sMinX;
                                      symbolData.y = sMinY;
                                      symbolData.width = sMaxX - sMinX;
                                      symbolData.height = sMaxY - sMinY;
                                      symbolData.midX = sMinX + symbolData.width / 2;
                                      symbolData.midY = sMinY + symbolData.height / 2;
                                      validBounds = true;

                                      symbolData.isFiltered = (
                                          symbolData.width >= minWidth && symbolData.width <= maxWidth &&
                                          symbolData.x >= minX && (symbolData.x + symbolData.width) <= maxX &&
                                          symbolData.y >= minY && (symbolData.y + symbolData.height) <= maxY
                                      );
                                  } else {
                                      // 如果边界无效，则认为未通过过滤
                                      symbolData.isFiltered = false;
                                  }
                              } else {
                                  symbolData.isFiltered = false; // 没有边界信息，无法过滤
                              }

                              symbols.push(symbolData);

                              // --- 索引跟踪 (保持简单，可能不完美) ---
                              // 仅在原始文本存在时尝试增加索引
                              const originalText = originalFullText.value || '';
                              if (originalText && charIndex < originalText.length) {
                                // 假设 API 符号顺序与文本顺序大体一致
                                charIndex += symbolData.text.length;
                                // 粗略处理换行/空格，可能不准确
                                if (symbolData.detectedBreak === 'SPACE' || symbolData.detectedBreak === 'EOL_SURE_SPACE') {
                                    if (originalText[charIndex] === ' ') charIndex++;
                                } else if (symbolData.detectedBreak === 'LINE_BREAK') {
                                    if (originalText[charIndex] === '\n') charIndex++;
                                    else if (originalText[charIndex] === '\r' && originalText[charIndex+1] === '\n') charIndex += 2;
                                }
                              } else {
                                 charIndex += symbolData.text.length; // 回退方案
                              }
                              // --- 结束索引跟踪 ---

                          }); // end symbol loop
                      }); // end word loop
                  }); // end paragraph loop
              }); // end block loop
          }); // end page loop
      } catch (error) {
          console.error("Error during symbol processing and filtering:", error);
          _showNotification("处理符号数据时出错", "error");
          filteredSymbolsData.value = []; // 出错时清空
          return; // 提前退出
      }
      // --- 结束遍历 ---

      filteredSymbolsData.value = symbols;
      console.log("过滤器已应用，处理符号数量:", filteredSymbolsData.value.length);
  }

  // 更新文本显示模式
  function setTextDisplayMode(mode) {
      if (mode === 'parallel' || mode === 'paragraph') {
          textDisplayMode.value = mode;
      }
  }


  // --- 返回 Store 的 state, getters, actions ---
  return {
    // State
    apiKey, showApiSettings, currentFiles, filePreviewUrl, isPdfFile, pdfDataArray, currentPage, totalPages, isLoading, loadingMessage, ocrRawResult, fullTextAnnotation, originalFullText, imageDimensions, detectedLanguageCode, detectedLanguageName, filterSettings, filterBounds, filteredSymbolsData, initialTextDirection, textDisplayMode, notification, isDimensionsKnown,
    // Getters
    hasApiKey, canStartOcr, textStats, hasOcrResult,
    // Actions
    setApiKey, toggleApiSettings, resetUIState, loadFiles, changePdfPage, setImageDimension, startOcrProcess, applyFilters, setTextDisplayMode, _showNotification,
    // setupFilterBounds // 暴露 setupFilterBounds 可能不是必需的，除非想手动触发
  };
});