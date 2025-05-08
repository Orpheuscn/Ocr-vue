<template>
  <transition name="fade">
    <div v-if="isOpen" class="tutorial-overlay" @click.self="closeModal">
      <div class="tutorial-modal">
        <div class="tutorial-header">
          <h2>{{ i18n.t('tutorial') }}</h2>
          <button class="close-btn" @click="closeModal">×</button>
        </div>
        <div class="tutorial-content">
          <div v-if="content" class="markdown-content" v-html="renderedContent"></div>
          <div v-else class="loading">{{ i18n.t('loading') }}</div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, onMounted, computed, nextTick } from 'vue';
import { useI18nStore } from '@/stores/i18nStore';
import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';
// 导入高亮主题
import 'highlight.js/styles/atom-one-dark.css';

const i18n = useI18nStore();
const isOpen = ref(false);
const content = ref('');

// 自定义渲染函数，添加行号和复制按钮
const customRender = (tokens, idx, options, env, slf) => {
  if (tokens[idx].type === 'fence') {
    const token = tokens[idx];
    const langName = token.info.trim().split(/\s+/g)[0] || '';
    let code = token.content;
    
    // 存储原始代码，用于复制
    const originalCode = code;
    
    // 使用 highlight.js 进行代码高亮
    let highlightedCode = langName && hljs.getLanguage(langName)
      ? hljs.highlight(code, { language: langName, ignoreIllegals: true }).value
      : hljs.highlightAuto(code).value;
    
    // 添加行号
    const lines = highlightedCode.split('\n');
    const numberedLines = lines.map((line, index) => 
      `<span class="line-number">${index + 1}</span><span class="line-content">${line}</span>`
    ).join('\n');
    
    // 创建代码块ID，用于查找对应的原始代码
    const codeBlockId = `code-block-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // 创建复制按钮和代码块，关键是使用自定义的数据属性存储原始代码
    return `
      <div class="code-block" id="${codeBlockId}">
        <div class="code-header">
          <span class="code-language">${langName || 'text'}</span>
          <button class="copy-button" data-code="${encodeURIComponent(originalCode)}" onclick="
            const button = this;
            const originalCode = decodeURIComponent(button.getAttribute('data-code'));
            navigator.clipboard.writeText(originalCode).then(
              () => {
                button.innerText = '已复制';
                setTimeout(() => { button.innerText = '复制'; }, 2000);
              },
              () => { 
                button.innerText = '复制失败'; 
                setTimeout(() => { button.innerText = '复制'; }, 2000);
              }
            );
          ">复制</button>
        </div>
        <pre class="hljs"><code class="code-with-line-numbers">${numberedLines}</code></pre>
      </div>
    `;
  }

  // 对于其他类型的标记，使用默认的渲染方法
  return slf.renderToken(tokens, idx, options, env, slf);
};

// 创建 markdown-it 实例
const md = new MarkdownIt({
  html: true,      // 启用 HTML 标签
  linkify: true,   // 自动识别链接并转换为a标签
  typographer: true,  // 启用一些语言中立的替换和引号美化
  highlight: function(str, lang) {
    // 默认的高亮处理，将由自定义渲染器覆盖
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang, ignoreIllegals: true }).value;
      } catch (__) {}
    }
    return ''; // 使用默认的转义处理
  }
});

// 覆盖默认的fence渲染器
const defaultFence = md.renderer.rules.fence || function(tokens, idx, options, env, self) {
  return self.renderToken(tokens, idx, options, env);
};
md.renderer.rules.fence = function(tokens, idx, options, env, self) {
  return customRender(tokens, idx, options, env, self);
};

// 从README.md加载内容
const loadReadmeContent = async () => {
  try {
    const response = await fetch('/README.md');
    content.value = await response.text();
    console.log('README.md loaded successfully');
    
    // 在渲染后执行代码，初始化复制按钮的事件监听
    nextTick(() => {
      setupCopyButtons();
    });
  } catch (error) {
    console.error('Failed to load README.md:', error);
    content.value = '加载教程内容失败，请稍后再试。';
  }
};

// 设置复制按钮的事件监听（可选）
const setupCopyButtons = () => {
  // 已使用内联事件处理，这里无需额外处理
};

// 将Markdown渲染为HTML
const renderedContent = computed(() => {
  if (!content.value) return '';
  
  try {
    return md.render(content.value);
  } catch (error) {
    console.error('Error parsing markdown:', error);
    return content.value.replace(/\n/g, '<br>');
  }
});

const openModal = () => {
  isOpen.value = true;
  loadReadmeContent();
};

const closeModal = () => {
  isOpen.value = false;
};

// 暴露方法给父组件
defineExpose({ openModal, closeModal });
</script>

<style>
/* 代码块样式 */
.code-block {
  margin-bottom: 1.5rem;
  border-radius: 0.375rem;
  overflow: hidden;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

/* 代码头部样式 */
.code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  background-color: #23272e;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

/* 语言标签样式 */
.code-language {
  font-size: 0.8rem;
  color: #e6e6e6;
  font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace;
}

/* 复制按钮样式 */
.copy-button {
  background-color: rgba(255, 255, 255, 0.1);
  color: #e6e6e6;
  border: none;
  border-radius: 0.25rem;
  padding: 0.25rem 0.75rem;
  font-size: 0.8rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.copy-button:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.copy-button:active {
  background-color: rgba(255, 255, 255, 0.3);
}

/* 代码块主体样式 */
.hljs {
  display: block;
  overflow-x: auto;
  padding: 0;
  margin: 0;
  background-color: #282c34;
}

/* 行号和代码内容 */
.code-with-line-numbers {
  display: block;
  padding: 1rem 0;
  counter-reset: line;
}

/* 每一行的样式 */
.line-number {
  display: inline-block;
  width: 2.5rem;
  text-align: right;
  padding-right: 1rem;
  margin-right: 1rem;
  color: rgba(220, 220, 220, 0.6);
  border-right: 1px solid rgba(220, 220, 220, 0.2);
  user-select: none;
}

.line-content {
  display: inline;
}
</style>

<style scoped>
/* 淡入淡出效果 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.8s ease, transform 0.8s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: scale(0.98);
}

.fade-enter-to,
.fade-leave-from {
  opacity: 1;
  transform: scale(1);
}

.tutorial-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.tutorial-modal {
  background-color: var(--fallback-b1, hsl(var(--b1)));
  border-radius: 0.5rem;
  width: 90%;
  max-width: 900px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  /* 添加变换起点 */
  transform-origin: center;
}

.tutorial-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--fallback-bc, hsl(var(--bc) / 0.2));
}

.tutorial-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: var(--fallback-bc, hsl(var(--bc)));
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--fallback-bc, hsl(var(--bc)));
}

.tutorial-content {
  padding: 1rem;
  overflow-y: auto;
  flex-grow: 1;
  color: var(--fallback-bc, hsl(var(--bc)));
}

/* Markdown样式 */
.markdown-content {
  line-height: 1.6;
  font-size: 1rem;
}

.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3),
.markdown-content :deep(h4),
.markdown-content :deep(h5),
.markdown-content :deep(h6) {
  margin-top: 1.5rem;
  margin-bottom: 1rem;
  font-weight: 600;
  line-height: 1.25;
}

.markdown-content :deep(h1) {
  font-size: 2rem;
  padding-bottom: 0.3rem;
  border-bottom: 1px solid var(--fallback-bc, hsl(var(--bc) / 0.2));
}

.markdown-content :deep(h2) {
  font-size: 1.5rem;
  padding-bottom: 0.3rem;
  border-bottom: 1px solid var(--fallback-bc, hsl(var(--bc) / 0.2));
}

.markdown-content :deep(h3) {
  font-size: 1.25rem;
}

.markdown-content :deep(p) {
  margin-top: 0;
  margin-bottom: 1rem;
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  margin-top: 0;
  margin-bottom: 1rem;
  padding-left: 2rem;
}

.markdown-content :deep(li) {
  margin-bottom: 0.5rem;
}

.markdown-content :deep(code) {
  font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace;
  font-size: 0.85em;
}

.markdown-content :deep(p code) {
  padding: 0.2rem 0.4rem;
  border-radius: 0.25rem;
  background-color: var(--fallback-b2, hsl(var(--b2)));
}

.markdown-content :deep(pre) {
  margin: 0;
  padding: 0;
  overflow-x: auto;
}

.markdown-content :deep(a) {
  color: var(--fallback-p, hsl(var(--p)));
  text-decoration: none;
}

.markdown-content :deep(a:hover) {
  text-decoration: underline;
}

.markdown-content :deep(blockquote) {
  padding: 0 1rem;
  border-left: 4px solid var(--fallback-bc, hsl(var(--bc) / 0.2));
  color: var(--fallback-bc, hsl(var(--bc) / 0.8));
  margin: 0 0 1rem 0;
}

.markdown-content :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin-bottom: 1rem;
}

.markdown-content :deep(table th),
.markdown-content :deep(table td) {
  padding: 0.5rem;
  border: 1px solid var(--fallback-bc, hsl(var(--bc) / 0.2));
}

.markdown-content :deep(table th) {
  background-color: var(--fallback-b2, hsl(var(--b2)));
}

.markdown-content :deep(img) {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 0 auto;
}

.markdown-content :deep(hr) {
  height: 0.15em;
  padding: 0;
  margin: 1.5rem 0;
  background-color: var(--fallback-bc, hsl(var(--bc) / 0.2));
  border: 0;
}

.loading {
  text-align: center;
  padding: 1.25rem;
  color: var(--fallback-bc, hsl(var(--bc) / 0.7));
}
</style> 