// api/services/ocrService.js
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';
import { createRequire } from 'module';
import { createCanvas, loadImage } from 'canvas';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// 从项目根目录中导入Vision API服务
const API_URL = 'https://vision.googleapis.com/v1/images:annotate';

// 简化版OCR识别函数 - 无需API密钥
export async function performOcrSimple(base64Image, languageHints = [], direction = 'horizontal', mode = 'text') {
  if (!base64Image) throw new Error("Base64图像数据缺失");

  try {
    // 由于简化版不使用Google Vision API，我们使用本地OCR识别
    // 这里模拟一个简单的OCR结果
    const detectedLanguageCode = languageHints?.length > 0 ? languageHints[0] : 'und';
    const detectedLanguageName = getLanguageName(detectedLanguageCode);
    
    // 这里我们可以集成其他开源OCR库，如Tesseract.js
    // 但目前我们返回一个模拟结果
    const originalFullText = "这是一个OCR识别结果示例。实际使用时，请集成Tesseract.js或其他OCR库。";
    
    return {
      originalFullText,
      detectedLanguageCode,
      detectedLanguageName,
      direction,
      mode
    };
  } catch (error) {
    console.error('OCR识别错误:', error);
    throw error;
  }
}

// 执行OCR识别
export async function performOcr(base64Image, apiKey, languageHints = [], direction = 'horizontal', mode = 'text') {
  if (!apiKey) throw new Error("API Key is missing");
  if (!base64Image) throw new Error("Base64 image data is missing");

  try {
    const response = await fetch(`${API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: base64Image },
          features: [
            // 请求文本检测和文档文本检测，以获取详细结构和全文
            { type: 'TEXT_DETECTION' },
            { type: 'DOCUMENT_TEXT_DETECTION' }
          ],
          imageContext: {
            languageHints: languageHints?.length > 0 ? languageHints : undefined
          }
        }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("API Error Response:", data);
      throw new Error(data?.error?.message || `HTTP error! status: ${response.status}`);
    }
    
    if (!data.responses?.[0]) {
      console.error("Invalid API Response Structure:", data);
      throw new Error('Invalid API response structure');
    }
    
    // 检查响应对象中是否存在错误
    if (data.responses[0].error) {
      console.error("API returned error object:", data.responses[0].error);
      throw new Error(data.responses[0].error.message || 'API returned an error');
    }

    // 处理OCR结果和方向设置
    const result = processOcrResult(data.responses[0], direction, mode);

    return result;
  } catch (error) {
    console.error('OCR API 请求/处理错误:', error);
    throw error;
  }
}

// 处理OCR结果
function processOcrResult(ocrResult, direction, mode) {
  // 提取和处理关键数据
  const fullTextAnnotation = ocrResult.fullTextAnnotation || null;
  const textAnnotations = ocrResult.textAnnotations || [];
  
  // 检测语言
  const detectedLanguageCode = textAnnotations[0]?.locale || 'und';
  const detectedLanguageName = getLanguageName(detectedLanguageCode);
  
  // 提取全文
  const originalFullText = fullTextAnnotation?.text || '';
  
  // 处理OCR结果，提取符号数据，并应用方向和模式设置
  const symbolsData = extractSymbolsData(ocrResult, direction, mode);
  
  return {
    ocrRawResult: ocrResult,
    fullTextAnnotation,
    originalFullText,
    detectedLanguageCode,
    detectedLanguageName,
    symbolsData,
    direction,
    mode
  };
}

// 从OCR结果中提取符号数据
function extractSymbolsData(ocrResult, direction, mode) {
  // 如果没有全文注释，则返回空数组
  if (!ocrResult.fullTextAnnotation) {
    return [];
  }
  
  const symbolsData = [];
  const pages = ocrResult.fullTextAnnotation.pages || [];
  
  // 遍历所有页面、块、段落、单词和符号
  pages.forEach(page => {
    const pageWidth = page.width || 1000;
    const pageHeight = page.height || 1000;
    
    page.blocks?.forEach(block => {
      block.paragraphs?.forEach(paragraph => {
        paragraph.words?.forEach(word => {
          word.symbols?.forEach((symbol, symbolIndex) => {
            // 如果有边界框
            if (symbol.boundingBox?.vertices) {
              const vertices = symbol.boundingBox.vertices;
              
              // 计算边界框的尺寸和中心点
              const minX = Math.min(...vertices.map(v => v?.x ?? Infinity));
              const maxX = Math.max(...vertices.map(v => v?.x ?? -Infinity));
              const minY = Math.min(...vertices.map(v => v?.y ?? Infinity));
              const maxY = Math.max(...vertices.map(v => v?.y ?? -Infinity));
              
              const width = maxX - minX;
              const height = maxY - minY;
              const midX = minX + width / 2;
              const midY = minY + height / 2;
              
              // 检测断行符
              let detectedBreak = null;
              if (symbol.property?.detectedBreak?.type) {
                detectedBreak = symbol.property.detectedBreak.type;
              }
              
              // 将符号数据添加到数组
              symbolsData.push({
                text: symbol.text,
                x: minX,
                y: minY,
                width,
                height,
                midX,
                midY,
                isFiltered: true, // 默认所有符号都是可见的
                originalIndex: symbolsData.length,
                detectedBreak,
                vertices,
                confidence: symbol.confidence || 0
              });
            }
          });
        });
      });
    });
  });
  
  return symbolsData;
}

// 处理PDF文件
export async function processPdf(pdfBuffer, apiKey, languageHints = [], pageNumber = 1, direction = 'horizontal', mode = 'text') {
  try {
    // API不直接处理PDF文件，我们需要在前端浏览器中使用pdfAdapter.js来处理
    // 在Node.js环境中，我们只能返回PDF缓冲区和元数据
    return {
      success: false,
      message: "PDF处理需要在浏览器端进行。请使用前端的pdfAdapter.js处理PDF文件。",
      pdf: {
        buffer: pdfBuffer,
        requestedPage: pageNumber
      }
    };
  } catch (error) {
    console.error('处理PDF错误:', error);
    throw error;
  }
}

// 渲染PDF页面 - 在服务器端不支持，仅返回错误
export async function renderPdfPage(pdfBuffer, pageNumber = 1, scale = 1.5) {
  throw new Error('PDF渲染功能在服务器端不可用。请在浏览器端使用pdfAdapter.js处理PDF文件。');
}

// 应用图像过滤器
export async function applyFilters(ocrResult, filters) {
  try {
    if (!ocrResult || !ocrResult.symbolsData) {
      throw new Error('无效的OCR结果数据');
    }
    
    if (!filters) {
      throw new Error('无效的过滤器设置');
    }
    
    const { minWidth, maxWidth, minX, maxX, minY, maxY } = filters;
    
    // 创建符号数据的副本
    const filteredSymbols = ocrResult.symbolsData.map(symbol => {
      // 应用过滤器
      const isFiltered = 
        symbol.width >= minWidth && 
        symbol.width <= maxWidth && 
        symbol.x >= minX && 
        symbol.x <= maxX && 
        symbol.y >= minY && 
        symbol.y <= maxY;
      
      // 返回更新后的符号数据
      return {
        ...symbol,
        isFiltered
      };
    });
    
    // 返回更新后的OCR结果
    return {
      ...ocrResult,
      symbolsData: filteredSymbols
    };
  } catch (error) {
    console.error('应用过滤器错误:', error);
    throw error;
  }
}

// 设置识别方向
export async function setRecognitionDirection(ocrResult, direction) {
  try {
    if (!ocrResult) {
      throw new Error('无效的OCR结果数据');
    }
    
    if (!direction || (direction !== 'horizontal' && direction !== 'vertical')) {
      throw new Error('无效的识别方向');
    }
    
    // 返回更新后的OCR结果
    return {
      ...ocrResult,
      direction
    };
  } catch (error) {
    console.error('设置识别方向错误:', error);
    throw error;
  }
}

// 设置显示模式
export async function setDisplayMode(ocrResult, mode) {
  try {
    if (!ocrResult) {
      throw new Error('无效的OCR结果数据');
    }
    
    if (!mode || (mode !== 'parallel' && mode !== 'paragraph' && mode !== 'table')) {
      throw new Error('无效的显示模式');
    }
    
    // 返回更新后的OCR结果
    return {
      ...ocrResult,
      mode
    };
  } catch (error) {
    console.error('设置显示模式错误:', error);
    throw error;
  }
}

// 应用表格设置
export async function setTableSettings(ocrResult, settings) {
  try {
    if (!ocrResult) {
      throw new Error('无效的OCR结果数据');
    }
    
    if (!settings) {
      throw new Error('无效的表格设置');
    }
    
    // 解析表格设置
    const { columns = 0, rows = 0 } = settings;
    
    // 返回更新后的OCR结果
    return {
      ...ocrResult,
      tableSettings: {
        columns,
        rows
      },
      mode: 'table' // 强制设置为表格模式
    };
  } catch (error) {
    console.error('应用表格设置错误:', error);
    throw error;
  }
}

// 应用遮罩
export async function applyMasks(imageBase64, masks, dimensions) {
  try {
    // Base64解码
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // 加载图像
    const image = await loadImage(buffer);
    
    // 创建Canvas并绘制原始图像
    const { width, height } = dimensions;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // 绘制原始图像
    ctx.drawImage(image, 0, 0, width, height);
    
    // 应用遮罩
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'white'; // 使用白色作为遮罩颜色
    
    masks.forEach(mask => {
      const { x, y, width: maskWidth, height: maskHeight } = mask;
      ctx.fillRect(x, y, maskWidth, maskHeight);
    });
    
    // 获取遮罩后的图像数据
    const maskedImageData = canvas.toDataURL('image/png');
    const maskedBase64 = maskedImageData.replace(/^data:image\/\w+;base64,/, '');
    
    return maskedBase64;
  } catch (error) {
    console.error('应用遮罩错误:', error);
    throw error;
  }
}

// 加载并返回语言数据
export function getLanguages() {
  // 假设语言数据存储在assets/languages.json中
  try {
    // 获取语言数据文件的路径
    const projectRoot = resolve(__dirname, '..', '..');
    const langFilePath = resolve(projectRoot, 'src', 'assets', 'languages.json');
    
    // 读取JSON文件
    const languageData = JSON.parse(fs.readFileSync(langFilePath, 'utf8'));
    
    // 将语言数据转换为API友好的格式
    const result = [];
    
    for (const [code, names] of Object.entries(languageData)) {
      // 排除特殊值，如 'und'（未定义）和带有连字符的代码
      if (code !== 'und' && !code.includes('-')) {
        result.push({ 
          code, 
          name: names['zh'] || names['en'] || code
        });
      }
    }
    
    // 按语言名称排序
    return result.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
  } catch (error) {
    console.error('获取语言数据错误:', error);
    return []; // 返回空数组作为备用
  }
}

// 获取语言名称
export function getLanguageName(code) {
  try {
    // 获取语言数据文件的路径
    const projectRoot = resolve(__dirname, '..', '..');
    const langFilePath = resolve(projectRoot, 'src', 'assets', 'languages.json');
    
    // 读取JSON文件
    const languageData = JSON.parse(fs.readFileSync(langFilePath, 'utf8'));
    
    if (languageData[code]) {
      return languageData[code]['zh'] || languageData[code]['en'] || code;
    }
    
    const baseCode = code?.split('-')[0];
    return languageData[baseCode] ? 
      languageData[baseCode]['zh'] || languageData[baseCode]['en'] : 
      code || '未知';
  } catch (error) {
    console.error('获取语言名称错误:', error);
    return code || '未知';
  }
} 