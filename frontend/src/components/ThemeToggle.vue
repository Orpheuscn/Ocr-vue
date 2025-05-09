<template>
  <button 
    @click="toggleTheme" 
    class="btn btn-ghost btn-circle"
    aria-label="切换主题"
  >
    <transition name="fade" mode="out-in">
      <svg v-if="currentTheme === 'light'" xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
      <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    </transition>
  </button>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue';

const currentTheme = ref('light');

// 初始化主题
onMounted(() => {
  // 从localStorage中获取保存的主题或使用系统默认
  const savedTheme = localStorage.getItem('theme') || 
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  
  // 立即应用主题防止闪烁
  setTheme(savedTheme);

  // 确保初始状态与实际DOM一致
  nextTick(() => {
    // 检查主题是否真的应用了
    const actualTheme = document.documentElement.getAttribute('data-theme');
    if (actualTheme !== currentTheme.value) {
      console.log('主题同步：', actualTheme, currentTheme.value);
      setTheme(currentTheme.value);
    }
  });
});

function toggleTheme() {
  const newTheme = currentTheme.value === 'light' ? 'dark' : 'light';
  setTheme(newTheme);
}

function setTheme(theme) {
  // 更新状态
  currentTheme.value = theme;
  
  // 更新DOM
  document.documentElement.setAttribute('data-theme', theme);
  document.body.setAttribute('data-theme', theme); // 同时设置 body 的 data-theme
  
  // 更新 class，用于其他基于 class 的模式切换
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  
  // 保存到localStorage
  localStorage.setItem('theme', theme);
}

// 监听系统主题变化
onMounted(() => {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
  // 添加变化监听器
  const handleChange = (e) => {
    const newTheme = e.matches ? 'dark' : 'light';
    // 仅当用户未主动设置主题时跟随系统
    if (!localStorage.getItem('theme')) {
      setTheme(newTheme);
    }
  };
  
  // 添加事件监听器
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handleChange);
  } else {
    // 兼容旧版浏览器
    mediaQuery.addListener(handleChange);
  }
});
</script> 