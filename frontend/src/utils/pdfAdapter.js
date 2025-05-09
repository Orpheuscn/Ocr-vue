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
  // 更明确的局部变量声明，便于后续清理资源
  let pdfDocument = null;
  let canvas = null;
  
  try {
    // 获取全局pdfjsLib对象
    const pdfJS = getPdfLib();
    
    // 确保数据是Uint8Array类型并创建副本
    const pdfData = ensureUint8Array(data);
    
    // 使用更明确的配置参数，可能加快处理
    const loadingTask = pdfJS.getDocument({
      data: pdfData,
      cMapUrl: '/pdf.js/', // 如果需要支持非拉丁字符，应提供cMap
      cMapPacked: true,
      disableFontFace: false, // 启用字体会提高渲染质量
      nativeImageDecoderSupport: 'display', // 使用原生图像解码器
      useSystemFonts: true
    });
    
    // 设置合理的超时
    loadingTask.onPassword = function(updateCallback, reason) {
      // 如果PDF需要密码，返回空密码将触发密码错误
      updateCallback('');
    };
    
    pdfDocument = await loadingTask.promise;
    
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
    canvas = document.createElement('canvas');
    
    // 优化渲染质量与性能的平衡
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2); // 限制最大像素比，避免过大内存消耗
    canvas.width = Math.floor(viewport.width * pixelRatio);
    canvas.height = Math.floor(viewport.height * pixelRatio);
    canvas.style.width = `${Math.floor(viewport.width)}px`;
    canvas.style.height = `${Math.floor(viewport.height)}px`;
    
    const context = canvas.getContext('2d', { alpha: false }); // 禁用alpha通道，提高性能
    
    if (!context) {
      throw new Error('无法创建Canvas上下文');
    }
    
    // 应用像素比例
    context.scale(pixelRatio, pixelRatio);
    
    // 渲染PDF页面，使用更多优化参数
    const renderContext = {
      canvasContext: context,
      viewport: viewport,
      enableWebGL: false, // WebGL可能提高性能，但在某些环境可能不稳定
      renderInteractiveForms: false, // 不渲染表单控件，提高性能
      textLayer: false // 不生成文本层
    };
    
    // 执行渲染
    await page.render(renderContext).promise;
    
    // 将内容转换为较小的JPEG格式，节约内存（如果图像质量要求不高）
    // 对于文本内容或高质量需求，保持PNG格式
    const dataUrl = canvas.toDataURL('image/png', 0.8); // 0.8是压缩质量，平衡大小和质量
    
    // 返回渲染结果
    return {
      dataUrl,
      width: viewport.width, // 返回逻辑宽度，而非像素宽度
      height: viewport.height,
      numPages
    };
  } catch (error) {
    console.error('PDF处理失败:', error);
    throw new Error(`PDF处理失败: ${error.message}`);
  } finally {
    // 总是清理资源，即使出错也要执行
    if (pdfDocument) {
      try {
        if (typeof pdfDocument.destroy === 'function') {
          await pdfDocument.destroy();
        }
      } catch (e) {
        console.warn('PDF文档清理失败:', e);
      }
    }
    
    // 清理Canvas资源
    if (canvas) {
      // 帮助垃圾回收
      canvas.width = 1;
      canvas.height = 1;
      canvas = null;
    }
  }
}

/**
 * 获取PDF页数
 * @param {ArrayBuffer|Uint8Array} data PDF文件的数据
 * @returns {Promise<number>} 页数
 */
export async function getPdfPageCount(data) {
  // 声明pdfDocument变量用于后续清理
  let pdfDocument = null;
  
  try {
    // 获取全局pdfjsLib对象
    const pdfJS = getPdfLib();
    
    // 确保数据是Uint8Array类型并创建副本
    const pdfData = ensureUint8Array(data);
    
    // 创建一个新的PDF文档实例，使用最简配置（只需要获取页数）
    const loadingTask = pdfJS.getDocument({
      data: pdfData,
      disableFontFace: true, // 禁用字体加载
      nativeImageDecoderSupport: 'none', // 不需要图像解码器
      ignoreErrors: true, // 忽略非关键错误
    });
    
    // 添加超时处理
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('获取PDF页数超时')), 5000);
    });
    
    // 使用Promise.race处理超时
    pdfDocument = await Promise.race([loadingTask.promise, timeoutPromise]);
    
    const numPages = pdfDocument.numPages;
    
    return numPages;
  } catch (error) {
    console.error('获取PDF页数失败:', error);
    throw new Error(`获取PDF页数失败: ${error.message}`);
  } finally {
    // 始终清理资源
    if (pdfDocument) {
      try {
        if (typeof pdfDocument.destroy === 'function') {
          await pdfDocument.destroy();
        }
      } catch (e) {
        console.warn('PDF文档清理失败:', e);
      }
      pdfDocument = null; // 帮助垃圾回收
    }
  }
} 