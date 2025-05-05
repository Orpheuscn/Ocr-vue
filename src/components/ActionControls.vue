<template>
  <div class="card bg-base-100 shadow-sm p-4">
    <div class="flex flex-col md:flex-row items-center justify-between gap-4">
      <div class="flex items-center gap-4">
        <span class="text-sm font-medium">识别方向:</span>
        <div class="btn-group">
          <button 
            :class="[
              'btn btn-sm',
              selectedDirection === 'horizontal' ? 'btn-primary' : 'btn-outline'
            ]"
            :disabled="isProcessing"
            @click="updateDirection('horizontal')"
          >
            正常
          </button>
          <button 
            :class="[
              'btn btn-sm',
              selectedDirection === 'vertical' ? 'btn-primary' : 'btn-outline'
            ]"
            :disabled="isProcessing" 
            @click="updateDirection('vertical')"
          >
            竖排
          </button>
        </div>
      </div>
      
      <!-- 语言选择下拉框 -->
      <div class="form-control w-full max-w-xs">
        <label class="label">
          <span class="label-text text-sm font-medium">语言提示:</span>
          <span class="label-text-alt text-xs">
            <button 
              class="btn btn-xs btn-ghost" 
              @click="clearLanguages"
              :disabled="isProcessing"
            >
              清除
            </button>
          </span>
        </label>
        <div class="relative w-full" ref="dropdownRef">
          <button 
            :class="['btn btn-sm w-full justify-start', isProcessing ? 'btn-disabled' : '']"
            :disabled="isProcessing"
            @click.stop="toggleDropdown"
          >
            {{ selectedLanguagesDisplay }}
            <span class="ml-auto text-xs opacity-70">{{ selectedLanguages.length ? `(${selectedLanguages.length})` : '' }}</span>
          </button>
          <div 
            v-if="showDropdown" 
            class="absolute top-full left-0 right-0 mt-1 bg-base-100 shadow rounded-box z-50 max-h-60 overflow-auto"
            @click.stop
          >
            <div class="p-2">
              <div class="grid grid-cols-2 gap-1">
                <div
                  v-for="lang in availableLanguages"
                  :key="lang.code"
                  :class="[
                    'form-control flex-row items-center px-2 py-1 rounded hover:bg-base-200 cursor-pointer',
                    selectedLanguages.includes(lang.code) ? 'bg-base-200' : ''
                  ]"
                  @click="toggleLanguage(lang.code, $event)"
                >
                  <label class="label cursor-pointer justify-start gap-2 w-full">
                    <input 
                      type="checkbox" 
                      :checked="selectedLanguages.includes(lang.code)" 
                      class="checkbox checkbox-sm" 
                      @click.stop
                      @change="toggleLanguage(lang.code, $event)"
                    />
                    <span class="label-text">{{ lang.name }}</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
        <label class="label">
          <span class="label-text-alt text-xs">选择多种语言可提高混合文本识别率</span>
        </label>
      </div>

      <button
        class="btn btn-primary w-full md:w-auto"
        :class="{'btn-disabled': !canStart || isProcessing, 'loading': isProcessing}"
        :disabled="!canStart || isProcessing"
        @click="startOcr"
      >
        {{ isProcessing ? '识别中...' : '开始识别' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed, onMounted, onUnmounted } from 'vue';
import { useOcrStore } from '@/stores/ocrStore';
import { getAllLanguages } from '@/services/visionApi';

const props = defineProps({
  canStart: { type: Boolean, default: false },
  isProcessing: { type: Boolean, default: false },
  initialDirection: { type: String, default: 'horizontal' } // From store
});

const emit = defineEmits(['start-ocr']);
const store = useOcrStore();

const selectedDirection = ref(props.initialDirection);
const availableLanguages = ref(getAllLanguages());
const selectedLanguages = ref([]);

// 初始化组件时从store获取语言设置
onMounted(() => {
  // 确保store已初始化语言设置
  if (typeof store.initSelectedLanguages === 'function') {
    store.initSelectedLanguages();
  }
  
  // 从store复制当前选择的语言
  selectedLanguages.value = [...store.selectedLanguages];
  
  // 添加点击外部关闭下拉菜单的事件监听
  document.addEventListener('click', handleClickOutside);
});

// 组件卸载时移除事件监听
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

// 下拉菜单显示状态
const showDropdown = ref(false);
const dropdownRef = ref(null);

// 切换下拉菜单显示状态
const toggleDropdown = () => {
  if (!props.isProcessing) {
    showDropdown.value = !showDropdown.value;
  }
};

// 处理点击外部关闭下拉菜单
const handleClickOutside = (event) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    showDropdown.value = false;
  }
};

// 显示当前选择的语言
const selectedLanguagesDisplay = computed(() => {
  if (selectedLanguages.value.length === 0) {
    return '自动检测语言';
  }
  
  // 显示前2个语言名称，后面用+N表示
  const selectedNames = selectedLanguages.value.map(code => {
    const lang = availableLanguages.value.find(l => l.code === code);
    return lang ? lang.name : code;
  });
  
  if (selectedNames.length <= 2) {
    return selectedNames.join(', ');
  }
  
  return `${selectedNames[0]}, ${selectedNames[1]} +${selectedNames.length - 2}`;
});

// Update local state if prop changes (e.g., on reset)
watch(() => props.initialDirection, (newVal) => {
  selectedDirection.value = newVal;
});

const updateDirection = (direction) => {
  selectedDirection.value = direction;
};

// 切换语言选择状态
const toggleLanguage = (code, event) => {
  // 阻止事件冒泡，避免触发外部点击事件导致下拉菜单关闭
  if (event) {
    event.stopPropagation();
  }
  
  const index = selectedLanguages.value.indexOf(code);
  if (index === -1) {
    // 添加语言
    selectedLanguages.value.push(code);
  } else {
    // 移除语言
    selectedLanguages.value.splice(index, 1);
  }
  
  // 更新store中的语言设置
  store.updateSelectedLanguages(selectedLanguages.value);
};

// 清除所有选中的语言
const clearLanguages = () => {
  selectedLanguages.value = [];
  store.updateSelectedLanguages([]);
};

const startOcr = () => {
  emit('start-ocr', selectedDirection.value);
};
</script>

<style scoped>
/* Styles from original .action-buttons and .display-options-container */
.action-controls-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
}

.display-options-container {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 15px;
    padding: 0.5rem;
    background-color: white;
    border-radius: 4px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    flex-wrap: wrap; /* Allow wrapping */
}
.display-options-container span {
    font-weight: 500;
    font-size: 0.9rem;
}
.display-options-container label {
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 0.9rem;
}
.display-options-container input[type="radio"] {
    cursor: pointer;
}
.display-options-container input[type="radio"]:disabled {
    cursor: not-allowed;
}
.display-options-container label:has(input:disabled) { /* Style label when radio is disabled */
     color: #aaa;
     cursor: not-allowed;
}


.action-buttons {
    display: flex;
    justify-content: center;
    gap: 1rem; /* If more buttons are added */
}

.primary-button {
    background-color: var(--primary-color);
    color: white;
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 4px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.3s, opacity 0.3s;
    min-width: 150px;
    text-align: center;
}

.primary-button:hover:not(:disabled) {
    background-color: var(--hover-color);
}

.primary-button:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
    opacity: 0.7;
}
</style>