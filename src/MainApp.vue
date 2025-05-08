<template>
  <div class="app-container" :class="theme">
    <router-view></router-view>
  </div>
</template>

<script>
import { computed } from 'vue';
import { useOcrStore } from '@/stores/ocrStore';

export default {
  name: 'MainApp',
  setup() {
    const store = useOcrStore();
    
    // 当前主题
    const theme = computed(() => {
      return store.isDarkMode ? 'dark' : 'light';
    });
    
    return {
      theme
    };
  }
};
</script>

<style>
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.dark {
  background-color: #1a1a1a;
  color: #f5f5f5;
}

.light {
  background-color: #f5f5f5;
  color: #1a1a1a;
}
</style> 