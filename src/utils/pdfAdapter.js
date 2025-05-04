/**
 * PDF.js 3.4.120 适配器
 * 通过直接提供封装函数来绕过私有成员问题
 */

// 获取PDF.js全局对象
function getPdfLib() {
  if (typeof window === 'undefined' || !window.pdfjsLib) {
    throw new Error('PDF.js库未加载。请确保在HTML中通过<script>标签引入了pdf.min.js');
  }
  return window.pdfjsLib;
}

/**
 * 确保数据是Uint8Array类型
 * @param {ArrayBuffer|Uint8Array} data 输入数据
 * @returns {Uint8Array} 转换后的Uint8Array
 */
function ensureUint8Array(data) {
  if (data instanceof Uint8Array) {
    // 创建数据副本，防止原始数据被分离
    return new Uint8Array(data);
  } else if (data instanceof ArrayBuffer) {
    // 创建ArrayBuffer数据副本，防止原始数据被分离
    return new Uint8Array(new Uint8Array(data));
  } else {
    throw new Error('输入数据必须是Uint8Array或ArrayBuffer');
  }
}

// 基本渲染函数
export async function renderPdfPage(data, pageNumber, scale = 1.5) {
  try {
    // 获取全局pdfjsLib对象
    const pdfJS = getPdfLib();
    
    // 确保数据是Uint8Array类型并创建副本
    const pdfData = ensureUint8Array(data);
    
    // 每次调用都创建新的PDF文档实例，使用Uint8Array
    const loadingTask = pdfJS.getDocument({ data: pdfData });
    const pdfDocument = await loadingTask.promise;
    
    // 获取PDF页面信息
    const numPages = pdfDocument.numPages;
    
    // 如果请求的页面超出范围，返回错误
    if (pageNumber < 1 || pageNumber > numPages) {
      throw new Error(`无效的页码: ${pageNumber}，PDF共有 ${numPages} 页`);
    }
    
    // 获取页面
    const page = await pdfDocument.getPage(pageNumber);
    
    // 创建渲染目标
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) {
      throw new Error('无法创建Canvas上下文');
    }
    
    // 设置Canvas尺寸
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    // 渲染PDF页面
    const renderContext = {
      canvasContext: context,
      viewport: viewport
    };
    
    await page.render(renderContext).promise;
    
    // 转换为数据URL
    const dataUrl = canvas.toDataURL('image/png');
    
    // 尝试清理资源
    try {
      if (pdfDocument && typeof pdfDocument.destroy === 'function') {
        await pdfDocument.destroy();
      }
    } catch (e) {
      console.warn('PDF文档清理失败:', e);
    }
    
    // 返回渲染结果
    return {
      dataUrl,
      width: canvas.width,
      height: canvas.height,
      numPages
    };
  } catch (error) {
    console.error('PDF处理失败:', error);
    throw new Error(`PDF处理失败: ${error.message}`);
  }
}

/**
 * 获取PDF页数
 * @param {ArrayBuffer|Uint8Array} data PDF文件的数据
 * @returns {Promise<number>} 页数
 */
export async function getPdfPageCount(data) {
  try {
    // 获取全局pdfjsLib对象
    const pdfJS = getPdfLib();
    
    // 确保数据是Uint8Array类型并创建副本
    const pdfData = ensureUint8Array(data);
    
    // 创建一个新的PDF文档实例，使用Uint8Array
    const loadingTask = pdfJS.getDocument({ data: pdfData });
    const pdfDocument = await loadingTask.promise;
    const numPages = pdfDocument.numPages;
    
    // 清理资源
    try {
      if (pdfDocument && typeof pdfDocument.destroy === 'function') {
        await pdfDocument.destroy();
      }
    } catch (e) {
      console.warn('PDF文档清理失败:', e);
    }
    
    return numPages;
  } catch (error) {
    console.error('获取PDF页数失败:', error);
    throw new Error(`获取PDF页数失败: ${error.message}`);
  }
} 