import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// 翻译数据
const translations = {
  zh: {
    // 页面标题
    appTitle: 'OCR 文本识别工具',

    // 按钮和操作
    upload: '上传',
    startOcr: '开始识别',
    selectFile: '选择文件',
    dragFileHere: '拖放或点击上传',
    copy: '复制',
    copied: '已复制',
    copyOriginalText: '复制原始文本',
    copyFilteredText: '复制过滤后文本',
    copyMarkdownTable: '复制Markdown表格',
    or: '或',
    pressCtrlV: '按',
    clear: '清除',
    table: '表格',
    planA: '方案1',
    planB: '方案2',
    tutorial: '教程',
    loading: '加载中...',
    copyright: '版权所有',
    // 网格对齐工具
    hideGrid: '隐藏网格',
    alignToGrid: '网格对齐',

    // 结果和信息
    results: '识别结果',
    noResults: '尚未识别任何文本。上传图片并点击开始识别。',
    statistics: '统计',
    characters: '字',
    textDirection: '文本方向',
    horizontal: '横排',
    vertical: '竖排',
    displayMode: '显示模式',
    parallel: '原始排版',
    paragraph: '分段排版',
    size: '尺寸',
    language: '语言',
    undetermined: '未确定',
    pleaseStartOcr: '请点击"开始识别"',
    recognizing: '正在识别中...',
    resultsWillShowHere: '识别结果将显示在此处',

    // 状态反馈消息
    processing: '处理中...',
    loadingFile: '加载文件中...',
    convertingHeic: '正在转换HEIC格式...',
    renderingPdfPage: '渲染 PDF 第 {page} 页...',
    recognizingText: '正在识别文本...',
    processingMasks: '正在处理图像遮挡({count}个区域)...',
    recognitionComplete: '识别完成{lang}',
    recognitionFailed: '识别失败: {error}',
    fileLoadFailed: '文件加载失败: {error}',
    pdfRenderSuccess: 'PDF 第 {page} 页渲染完成',
    pdfRenderFailed: '渲染 PDF 第 {page} 页失败: {error}',
    cannotStartOcr: '无法开始识别，请检查文件和图像尺寸。',
    imageSizeNotLoaded: '图像尺寸尚未加载完成，请稍候。',
    errorProcessingSymbols: '处理符号数据时出错',

    // 文件类型
    supportedFiles: '图片或PDF',

    // 坐标视图
    coordinateView: '坐标视图',
    cachedPolygons: '缓存多边形',
    visiblePolygons: '可见多边形',
    blockLevel: '区块级别',
    blocks: '区块',
    paragraphs: '段落',
    words: '单词',
    symbols: '字符',
    showBlocks: '显示区块',
    hideBlocks: '隐藏区块',
    exitFullscreen: '退出全屏',
    fullscreenMode: '全屏模式',
    zoom: '缩放',
    textCopied: '文本已复制',
    copyFailed: '复制失败，请重试',

    // 遮挡工具
    exitMaskingMode: '退出遮挡模式',
    addMaskingArea: '添加遮挡区域',
    maskingMode: '遮挡模式',
    dragToSelectMaskingArea: '拖动鼠标选择要遮挡的区域',
    clearAll: '清除所有',
    apply: '应用',
    cancel: '取消',
    exit: '退出',
    maskingAreasCount: '遮挡区域数量',
    visibleMaskingAreasCount: '可见遮挡区域数量',
    imagePosition: '图像位置',
    imageSize: '图像尺寸',
    scale: '比例',

    // ActionControls组件
    recognitionDirection: '识别方式',
    languageHint: '语言提示',
    searchLanguage: '搜索语言名称或代码...',
    languageTip: '选择多种语言可提高混合文本识别率',
    autoDetectLanguage: '自动检测语言',

    // FilterControls组件
    textFilter: '文本过滤',
    characterWidth: '字符宽度',
    xCoordinate: 'X坐标',
    yCoordinate: 'Y坐标',
    notSet: '未设置',

    // 语言切换
    switchLanguage: '切换语言',
  },
  en: {
    // Page Title
    appTitle: 'OCR Text Recognition Tool',

    // Buttons and Actions
    upload: 'Upload',
    startOcr: 'Start OCR',
    selectFile: 'Select File',
    dragFileHere: 'Drag & drop or click to upload',
    copy: 'Copy',
    copied: 'Copied',
    copyOriginalText: 'Copy original text',
    copyFilteredText: 'Copy filtered text',
    copyMarkdownTable: 'Copy Markdown Table',
    or: 'or',
    pressCtrlV: 'press',
    clear: 'Clear',
    table: 'Table',
    planA: 'PlanA',
    planB: 'PlanB',
    tutorial: 'Tutorial',
    loading: 'Loading...',
    copyright: 'Copyright',
    // Grid alignment tool
    hideGrid: 'Hide Grid',
    alignToGrid: 'Align to Grid',

    // Results and Information
    results: 'Recognition Results',
    noResults: 'No text has been recognized yet. Upload an image and click Start OCR.',
    statistics: 'Statistics',
    characters: 'chars',
    textDirection: 'Text Direction',
    horizontal: 'Normal',
    vertical: 'Vertical',
    displayMode: 'Display Mode',
    parallel: 'Original Layout',
    paragraph: 'Paragraph',
    size: 'Size',
    language: 'Language',
    undetermined: 'Undetermined',
    pleaseStartOcr: 'Please click "Start OCR"',
    recognizing: 'Recognizing...',
    resultsWillShowHere: 'Results will show here',

    // 状态反馈消息
    processing: 'Processing...',
    loadingFile: 'Loading file...',
    convertingHeic: 'Converting HEIC format...',
    renderingPdfPage: 'Rendering PDF page {page}...',
    recognizingText: 'Recognizing text...',
    processingMasks: 'Processing image masks ({count} areas)...',
    recognitionComplete: 'Recognition complete{lang}',
    recognitionFailed: 'Recognition failed: {error}',
    fileLoadFailed: 'File loading failed: {error}',
    pdfRenderSuccess: 'PDF page {page} rendered successfully',
    pdfRenderFailed: 'Failed to render PDF page {page}: {error}',
    cannotStartOcr: 'Cannot start recognition, please check file and image dimensions.',
    imageSizeNotLoaded: 'Image dimensions not yet loaded, please wait.',
    errorProcessingSymbols: 'Error processing symbol data',

    // File Types
    supportedFiles: 'Image or PDF',

    // Coordinate View
    coordinateView: 'Coordinate View',
    cachedPolygons: 'Cached polygons',
    visiblePolygons: 'Visible polygons',
    blockLevel: 'Block level',
    blocks: 'Blocks',
    paragraphs: 'Paragraphs',
    words: 'Words',
    symbols: 'Symbols',
    showBlocks: 'Show blocks',
    hideBlocks: 'Hide blocks',
    exitFullscreen: 'Exit fullscreen',
    fullscreenMode: 'Fullscreen mode',
    zoom: 'Zoom',
    textCopied: 'Text copied',
    copyFailed: 'Copy failed, please try again',

    // Masking Tool
    exitMaskingMode: 'Exit masking mode',
    addMaskingArea: 'Add masking area',
    maskingMode: 'Masking Mode',
    dragToSelectMaskingArea: 'Drag to select area for masking',
    clearAll: 'Clear All',
    apply: 'Apply',
    cancel: 'Cancel',
    exit: 'Exit',
    maskingAreasCount: 'Masking areas count',
    visibleMaskingAreasCount: 'Visible masking areas',
    imagePosition: 'Image position',
    imageSize: 'Image size',
    scale: 'Scale',

    // ActionControls component
    recognitionDirection: 'Recognition Mode',
    languageHint: 'Language Hint',
    searchLanguage: 'Search languages by name or code...',
    languageTip: 'Selecting multiple languages can improve recognition',
    autoDetectLanguage: 'Auto-detect language',

    // FilterControls component
    textFilter: 'Text Filter',
    characterWidth: 'Character Width',
    xCoordinate: 'X Coordinate',
    yCoordinate: 'Y Coordinate',
    notSet: 'Not set',

    // 语言切换
    switchLanguage: 'Switch Language',
  },
}

export const useI18nStore = defineStore('i18n', () => {
  // 当前语言
  const currentLang = ref(localStorage.getItem('language') || 'zh')

  // 设置语言
  function setLanguage(lang) {
    if (lang === 'zh' || lang === 'en') {
      currentLang.value = lang
      localStorage.setItem('language', lang)
    }
  }

  // 当前语言的翻译数据（响应式）
  const currentTranslations = computed(() => translations[currentLang.value] || {})

  // 获取翻译
  function t(key) {
    return currentTranslations.value[key] || key
  }

  // 格式化翻译，替换占位符
  function tf(key, params = {}) {
    let text = t(key)

    // 替换所有 {paramName} 占位符
    Object.keys(params).forEach((paramKey) => {
      const regex = new RegExp(`{${paramKey}}`, 'g')
      text = text.replace(regex, params[paramKey])
    })

    return text
  }

  // 切换语言
  function toggleLanguage() {
    const newLang = currentLang.value === 'zh' ? 'en' : 'zh'
    setLanguage(newLang)
  }

  return {
    currentLang,
    currentTranslations,
    setLanguage,
    toggleLanguage,
    t,
    tf,
  }
})
