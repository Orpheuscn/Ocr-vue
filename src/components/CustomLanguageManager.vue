<template>
  <div>
    <!-- 添加自定义语言按钮 -->
    <button 
      @click="showModal = true" 
      class="btn btn-sm btn-outline btn-primary mt-1"
    >
      <span class="flex items-center gap-1">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        添加自定义语言
      </span>
    </button>
    
    <!-- 模态框 -->
    <div v-if="showModal" class="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div class="bg-base-100 p-4 rounded-lg shadow-xl w-80 max-w-full">
        <h3 class="text-lg font-medium mb-4">{{ editingLanguage ? '编辑语言' : '添加自定义语言' }}</h3>
        
        <form @submit.prevent="saveLanguage">
          <div class="form-control">
            <label class="label">
              <span class="label-text">语言代码 (ISO 639)</span>
            </label>
            <input 
              v-model="newLanguageCode" 
              type="text" 
              placeholder="例如: jv, mn, tl" 
              class="input input-bordered w-full" 
              :disabled="!!editingLanguage"
              required
              pattern="[a-z]{2,10}"
              title="请输入2-10个小写字母的语言代码"
            />
            <label class="label">
              <span class="label-text-alt">2-10个小写字母，参考 <a href="https://cloud.google.com/translate/docs/languages" target="_blank" class="link link-primary">语言代码表</a></span>
            </label>
          </div>
          
          <div class="form-control mt-2">
            <label class="label">
              <span class="label-text">语言名称</span>
            </label>
            <input 
              v-model="newLanguageName" 
              type="text" 
              placeholder="例如: 爪哇语, 蒙古语, 他加禄语" 
              class="input input-bordered w-full" 
              required
            />
          </div>
          
          <div class="modal-action mt-4 flex justify-between">
            <button type="button" class="btn btn-ghost" @click="closeModal">取消</button>
            <div class="flex gap-2">
              <button 
                v-if="editingLanguage" 
                type="button" 
                class="btn btn-error" 
                @click="deleteLanguage"
              >
                删除
              </button>
              <button type="submit" class="btn btn-primary">保存</button>
            </div>
          </div>
        </form>
      </div>
    </div>
    
    <!-- 自定义语言列表 -->
    <div v-if="customLanguages.length > 0" class="mt-2">
      <div class="text-xs font-medium mb-1 text-base-content/70">自定义语言:</div>
      <div class="flex flex-wrap gap-1">
        <div 
          v-for="lang in customLanguages" 
          :key="lang.code"
          class="badge badge-outline gap-1 cursor-pointer hover:bg-base-200 pr-1"
          @click="editLanguage(lang)"
        >
          {{ lang.name }}
          <span class="text-xs opacity-60">({{ lang.code }})</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { getAllLanguages, saveCustomLanguage, deleteCustomLanguage } from '@/services/visionApi';

const emit = defineEmits(['language-changed']);

// 状态
const showModal = ref(false);
const newLanguageCode = ref('');
const newLanguageName = ref('');
const editingLanguage = ref(null);
const allLanguages = ref([]);

// 初始化
onMounted(() => {
  allLanguages.value = getAllLanguages();
});

// 自定义语言列表
const customLanguages = computed(() => {
  return allLanguages.value.filter(lang => lang.isCustom);
});

// 打开新增语言模态框
const openAddModal = () => {
  editingLanguage.value = null;
  newLanguageCode.value = '';
  newLanguageName.value = '';
  showModal.value = true;
};

// 打开编辑语言模态框
const editLanguage = (language) => {
  editingLanguage.value = language;
  newLanguageCode.value = language.code;
  newLanguageName.value = language.name;
  showModal.value = true;
};

// 关闭模态框
const closeModal = () => {
  showModal.value = false;
  editingLanguage.value = null;
  newLanguageCode.value = '';
  newLanguageName.value = '';
};

// 保存语言
const saveLanguage = async () => {
  try {
    await saveCustomLanguage(
      newLanguageCode.value.trim().toLowerCase(),
      newLanguageName.value.trim()
    );
    
    // 重新获取语言列表
    allLanguages.value = getAllLanguages();
    
    // 通知父组件语言列表已更新
    emit('language-changed', allLanguages.value);
    
    // 关闭模态框
    closeModal();
  } catch (error) {
    alert(`保存失败: ${error.message}`);
  }
};

// 删除语言
const deleteLanguage = async () => {
  if (!editingLanguage.value) return;
  
  if (!confirm(`确定要删除 ${editingLanguage.value.name} (${editingLanguage.value.code}) 吗？`)) {
    return;
  }
  
  try {
    await deleteCustomLanguage(editingLanguage.value.code);
    
    // 重新获取语言列表
    allLanguages.value = getAllLanguages();
    
    // 通知父组件语言列表已更新
    emit('language-changed', allLanguages.value);
    
    // 关闭模态框
    closeModal();
  } catch (error) {
    alert(`删除失败: ${error.message}`);
  }
};
</script>

<style scoped>
/* 模态框动画 */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style> 