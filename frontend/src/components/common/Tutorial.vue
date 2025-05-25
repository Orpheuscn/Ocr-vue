<template>
  <transition name="fade">
    <div
      v-if="isOpen"
      class="fixed inset-0 flex items-center justify-center"
      style="z-index: 9999; background-color: rgba(0, 0, 0, 0.7)"
      @click.self="closeModal"
    >
      <div class="bg-base-100 rounded-lg shadow-xl w-11/12 max-w-4xl max-h-[85vh] flex flex-col">
        <div class="flex justify-between items-center p-6 border-b">
          <h2 class="text-xl font-bold text-base-content">{{ i18n.t('tutorial') }}</h2>
          <button class="btn btn-sm btn-circle" @click="closeModal">✕</button>
        </div>
        <div class="flex-1 overflow-y-auto p-6">
          <div
            v-if="content"
            class="markdown-content text-base-content"
            v-html="renderedContent"
          ></div>
          <div v-else class="text-center py-8 text-base-content">{{ i18n.t('loading') }}</div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18nStore } from '@/stores/i18nStore'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
// 导入高亮主题
import 'highlight.js/styles/atom-one-dark.css'

const i18n = useI18nStore()
const isOpen = ref(false)
const content = ref('')

// 创建简化的 markdown-it 实例
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code class="language-${lang}">${hljs.highlight(str, { language: lang, ignoreIllegals: true }).value}</code></pre>`
      } catch {
        // 忽略高亮错误
      }
    }
    return `<pre class="hljs"><code>${hljs.highlightAuto(str).value}</code></pre>`
  },
})

// 从README.md加载内容
const loadReadmeContent = async () => {
  try {
    const response = await fetch(`/README.md?t=${Date.now()}`)
    content.value = await response.text()
  } catch (error) {
    console.error('Failed to load README.md:', error)
    content.value = '# 加载失败\n\n教程内容加载失败，请稍后再试。'
  }
}

// 将Markdown渲染为HTML
const renderedContent = computed(() => {
  if (!content.value) return ''
  try {
    return md.render(content.value)
  } catch (error) {
    console.error('Error parsing markdown:', error)
    return `<p>${content.value.replace(/\n/g, '<br>')}</p>`
  }
})

const openModal = () => {
  isOpen.value = true
  loadReadmeContent()
}

const closeModal = () => {
  isOpen.value = false
}

// 暴露方法给父组件
defineExpose({ openModal, closeModal })
</script>

<style>
/* 让highlight.js处理代码样式 */
.hljs {
  border-radius: 0.5rem;
  margin: 1rem 0;
  padding: 1rem;
}
</style>

<style scoped>
/* 简单的过渡效果 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 基本的markdown样式 */
.markdown-content :deep(h1) {
  font-size: 2rem;
  font-weight: bold;
  margin: 1.5rem 0 1rem 0;
  border-bottom: 1px solid;
  padding-bottom: 0.5rem;
}

.markdown-content :deep(h2) {
  font-size: 1.5rem;
  font-weight: bold;
  margin: 1.25rem 0 0.75rem 0;
  border-bottom: 1px solid;
  padding-bottom: 0.25rem;
}

.markdown-content :deep(h3) {
  font-size: 1.25rem;
  font-weight: bold;
  margin: 1rem 0 0.5rem 0;
}

.markdown-content :deep(p) {
  margin: 0.75rem 0;
  line-height: 1.6;
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  margin: 0.75rem 0;
  padding-left: 2rem;
}

.markdown-content :deep(li) {
  margin: 0.25rem 0;
}

.markdown-content :deep(code) {
  background-color: rgba(0, 0, 0, 0.1);
  padding: 0.2rem 0.4rem;
  border-radius: 0.25rem;
  font-family: monospace;
}

.markdown-content :deep(blockquote) {
  border-left: 4px solid;
  padding-left: 1rem;
  margin: 1rem 0;
  opacity: 0.8;
}

.markdown-content :deep(a) {
  color: #3b82f6;
  text-decoration: underline;
}
</style>
