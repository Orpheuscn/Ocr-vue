// backend/services/ocrService.js
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import fs from "fs";
import { createRequire } from "module";
// 暂时注释掉canvas相关导入，这个库需要本地编译
// import { createCanvas, loadImage } from 'canvas';
import fetchWithProxy from "../utils/fetchHelper.js";

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// 从项目根目录中导入Vision API服务
const API_URL = "https://vision.googleapis.com/v1/images:annotate";

// 简化版OCR识别函数 - 无需API密钥
export async function performOcrSimple(base64Image, languageHints = [], mode = "text") {
  if (!base64Image) throw new Error("Base64图像数据缺失");

  try {
    // 由于简化版不使用Google Vision API，我们使用本地OCR识别
    // 这里模拟一个简单的OCR结果
    const detectedLanguageCode = languageHints?.length > 0 ? languageHints[0] : "und";
    const detectedLanguageName = getLanguageName(detectedLanguageCode);

    // 这里我们可以集成其他开源OCR库，如Tesseract.js
    // 但目前我们返回一个模拟结果
    const originalFullText = "这是一个OCR识别结果示例。实际使用时，请集成Tesseract.js或其他OCR库。";

    return {
      originalFullText,
      detectedLanguageCode,
      detectedLanguageName,
      mode,
    };
  } catch (error) {
    console.error("OCR识别错误:", error);
    throw error;
  }
}

// 执行OCR识别
export async function performOcr(base64Image, apiKey, languageHints = [], mode = "text") {
  if (!apiKey) throw new Error("API Key is missing");
  if (!base64Image) throw new Error("Base64 image data is missing");

  try {
    console.log(`开始OCR识别请求 - 模式: ${mode}`);
    console.log(`语言提示: ${languageHints.length > 0 ? languageHints.join(", ") : "无"}`);
    console.log(`API密钥前缀: ${apiKey.substring(0, 8)}...`);

    const apiUrl = `${API_URL}?key=${apiKey}`;
    console.log(`API URL: ${API_URL}`);

    const requestBody = {
      requests: [
        {
          image: { content: base64Image },
          features: [
            // 请求文本检测和文档文本检测，以获取详细结构和全文
            { type: "TEXT_DETECTION" },
            { type: "DOCUMENT_TEXT_DETECTION" },
          ],
          imageContext: {
            languageHints: languageHints?.length > 0 ? languageHints : undefined,
          },
        },
      ],
    };

    console.log("发送API请求...");

    // 使用我们的fetchWithProxy函数，它会根据环境自动处理代理
    // 设置超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时

    const response = await fetchWithProxy(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log(`API响应状态: ${response.status}`);
    const data = await response.json();

    if (!response.ok) {
      console.error("API错误响应:", JSON.stringify(data, null, 2));
      throw new Error(data?.error?.message || `HTTP error! status: ${response.status}`);
    }

    if (!data.responses?.[0]) {
      console.error("无效的API响应结构:", JSON.stringify(data, null, 2));
      throw new Error("Invalid API response structure");
    }

    // 检查响应对象中是否存在错误
    if (data.responses[0].error) {
      console.error("API返回错误对象:", JSON.stringify(data.responses[0].error, null, 2));
      throw new Error(data.responses[0].error.message || "API returned an error");
    }

    console.log("API响应成功，处理OCR结果...");
    // 处理OCR结果
    const result = processOcrResult(data.responses[0], mode);
    console.log("OCR结果处理完成");

    return result;
  } catch (error) {
    console.error("OCR API 请求/处理错误:", error);
    console.error("错误堆栈:", error.stack);
    throw error;
  }
}

// 处理OCR结果
function processOcrResult(ocrResult, mode) {
  // 提取和处理关键数据
  const fullTextAnnotation = ocrResult.fullTextAnnotation || null;
  const textAnnotations = ocrResult.textAnnotations || [];

  // 检测语言
  const detectedLanguageCode = textAnnotations[0]?.locale || "und";
  const detectedLanguageName = getLanguageName(detectedLanguageCode);

  // 提取全文
  const originalFullText = fullTextAnnotation?.text || "";

  // 处理OCR结果，提取符号数据，并应用模式设置
  const symbolsData = extractSymbolsData(ocrResult, mode);

  return {
    ocrRawResult: ocrResult,
    fullTextAnnotation,
    originalFullText,
    detectedLanguageCode,
    detectedLanguageName,
    symbolsData,
    mode,
  };
}

// 从OCR结果中提取符号数据
function extractSymbolsData(ocrResult, mode) {
  // 如果没有全文注释，则返回空数组
  if (!ocrResult.fullTextAnnotation) {
    return [];
  }

  const symbolsData = [];
  const pages = ocrResult.fullTextAnnotation.pages || [];

  // 遍历所有页面、块、段落、单词和符号
  pages.forEach((page) => {
    const pageWidth = page.width || 1000;
    const pageHeight = page.height || 1000;

    page.blocks?.forEach((block) => {
      block.paragraphs?.forEach((paragraph) => {
        paragraph.words?.forEach((word) => {
          word.symbols?.forEach((symbol, symbolIndex) => {
            // 如果有边界框
            if (symbol.boundingBox?.vertices) {
              const vertices = symbol.boundingBox.vertices;

              // 计算边界框的尺寸和中心点
              const minX = Math.min(...vertices.map((v) => v?.x ?? Infinity));
              const maxX = Math.max(...vertices.map((v) => v?.x ?? -Infinity));
              const minY = Math.min(...vertices.map((v) => v?.y ?? Infinity));
              const maxY = Math.max(...vertices.map((v) => v?.y ?? -Infinity));

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
                confidence: symbol.confidence || 0,
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
export async function processPdf(
  pdfBuffer,
  apiKey,
  languageHints = [],
  pageNumber = 1,
  mode = "text"
) {
  try {
    // API不直接处理PDF文件，我们需要在前端浏览器中使用pdfAdapter.js来处理
    // 在Node.js环境中，我们只能返回PDF缓冲区和元数据
    return {
      success: false,
      message: "PDF处理需要在浏览器端进行。请使用前端的pdfAdapter.js处理PDF文件。",
      pdf: {
        buffer: pdfBuffer,
        requestedPage: pageNumber,
      },
    };
  } catch (error) {
    console.error("处理PDF错误:", error);
    throw error;
  }
}

// 渲染PDF页面 - 在服务器端不支持，仅返回错误
export async function renderPdfPage(pdfBuffer, pageNumber = 1, scale = 1.5) {
  throw new Error("PDF渲染功能在服务器端不可用。请在浏览器端使用pdfAdapter.js处理PDF文件。");
}

// 应用图像过滤器
export async function applyFilters(ocrResult, filters) {
  try {
    if (!ocrResult || !ocrResult.symbolsData) {
      throw new Error("无效的OCR结果数据");
    }

    if (!filters) {
      throw new Error("无效的过滤器设置");
    }

    const { minWidth, maxWidth, minX, maxX, minY, maxY } = filters;

    // 创建符号数据的副本
    const filteredSymbols = ocrResult.symbolsData.map((symbol) => {
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
        isFiltered,
      };
    });

    // 返回更新后的OCR结果
    return {
      ...ocrResult,
      symbolsData: filteredSymbols,
    };
  } catch (error) {
    console.error("应用过滤器错误:", error);
    throw error;
  }
}

// 设置识别方向
export async function setRecognitionDirection(ocrResult, direction) {
  try {
    if (!ocrResult) {
      throw new Error("无效的OCR结果数据");
    }

    if (!direction || (direction !== "horizontal" && direction !== "vertical")) {
      throw new Error("无效的识别方向");
    }

    // 返回更新后的OCR结果
    return {
      ...ocrResult,
      direction,
    };
  } catch (error) {
    console.error("设置识别方向错误:", error);
    throw error;
  }
}

// 设置显示模式
export async function setDisplayMode(ocrResult, mode) {
  try {
    if (!ocrResult) {
      throw new Error("无效的OCR结果数据");
    }

    if (!mode || (mode !== "parallel" && mode !== "paragraph" && mode !== "table")) {
      throw new Error("无效的显示模式");
    }

    // 返回更新后的OCR结果
    return {
      ...ocrResult,
      mode,
    };
  } catch (error) {
    console.error("设置显示模式错误:", error);
    throw error;
  }
}

// 应用表格设置
export async function setTableSettings(ocrResult, settings) {
  try {
    if (!ocrResult) {
      throw new Error("无效的OCR结果数据");
    }

    if (!settings) {
      throw new Error("无效的表格设置");
    }

    // 解析表格设置
    const { columns = 0, rows = 0 } = settings;

    // 返回更新后的OCR结果
    return {
      ...ocrResult,
      tableSettings: {
        columns,
        rows,
      },
      mode: "table", // 强制设置为表格模式
    };
  } catch (error) {
    console.error("应用表格设置错误:", error);
    throw error;
  }
}

// 应用遮罩
export async function applyMasks(imageBase64, masks, dimensions) {
  try {
    // 由于canvas库已被注释掉，这里提供一个临时的实现
    console.warn("警告: applyMasks函数正在使用临时实现，因为canvas库未安装");
    console.warn("要使用完整功能，请安装canvas库: npm install canvas");

    // 返回原始图像，并添加一个警告说明遮罩未应用
    return {
      imageBase64,
      warning: "遮罩未应用 - canvas库未安装",
      masks,
      dimensions,
    };

    /* 原始实现需要canvas库
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
    */
  } catch (error) {
    console.error("应用遮罩错误:", error);
    throw error;
  }
}

// 加载并返回语言数据
export function getLanguages() {
  // 语言数据现在存储在frontend/src/assets/languages.json中
  try {
    // 获取语言数据文件的路径
    const projectRoot = resolve(__dirname, "..", "..");
    const langFilePath = resolve(projectRoot, "frontend", "src", "assets", "languages.json");

    // 如果文件不存在，返回空数组
    if (!fs.existsSync(langFilePath)) {
      console.warn(`语言文件不存在: ${langFilePath}`);
      return [];
    }

    // 读取JSON文件
    const languageData = JSON.parse(fs.readFileSync(langFilePath, "utf8"));

    // 将语言数据转换为API友好的格式
    const result = [];

    for (const [code, names] of Object.entries(languageData)) {
      // 排除特殊值，如 'und'（未定义）和带有连字符的代码
      if (code !== "und" && !code.includes("-")) {
        result.push({
          code,
          name: names["en"] || code, // 移除硬编码的"zh"，只使用"en"作为后备
        });
      }
    }

    // 按语言名称排序
    return result.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
  } catch (error) {
    console.error("获取语言数据错误:", error);
    return []; // 返回空数组作为备用
  }
}

// 获取语言名称
export function getLanguageName(code) {
  try {
    // 获取语言数据文件的路径
    const projectRoot = resolve(__dirname, "..", "..");
    const langFilePath = resolve(projectRoot, "frontend", "src", "assets", "languages.json");

    // 如果文件不存在，返回代码本身或'未知'
    if (!fs.existsSync(langFilePath)) {
      console.warn(`语言文件不存在: ${langFilePath}`);
      return code || "未知";
    }

    // 读取JSON文件
    const languageData = JSON.parse(fs.readFileSync(langFilePath, "utf8"));

    if (languageData[code]) {
      return languageData[code]["en"] || code; // 移除硬编码的"zh"
    }

    const baseCode = code?.split("-")[0];
    return languageData[baseCode] ? languageData[baseCode]["en"] : code || "Unknown";
  } catch (error) {
    console.error("获取语言名称错误:", error);
    return code || "Unknown"; // 移除硬编码的中文
  }
}
