<template>
  <div class="card bg-base-100 shadow-sm w-full">
    <div
      ref="dropZoneRef"
      class="card-body flex flex-col items-center justify-center py-8 px-4 cursor-pointer border-2 border-dashed rounded-xl transition-all duration-300 hover-effect"
      :class="{ 
        'border-primary bg-primary/5': isDragOver, 
        'border-base-300': !isDragOver && !isHovering,
        'border-accent bg-accent/5': !isDragOver && isHovering
      }"
      @dragenter.prevent.stop="onDragEnter"
      @dragover.prevent.stop="onDragOver"
      @dragleave.prevent.stop="onDragLeave"
      @drop.prevent.stop="onDrop"
      @click="triggerFileInput"
      @mouseenter="isHovering = true"
      @mouseleave="isHovering = false"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 mb-3 text-accent transition-transform duration-300" :class="{'scale-110': isHovering}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
      
      <h3 class="text-lg font-medium mb-1 transition-colors duration-300" :class="{'text-accent': isHovering}">{{ i18n.t('dragFileHere') }}</h3>
      <p class="text-sm opacity-70 mb-3">{{ i18n.t('supportedFiles') }}</p>
      
      <input
        ref="fileInputRef"
        type="file"
        id="fileInput"
        accept="image/*,.pdf,.heic,.heif"
        multiple
        @change="onFileSelected"
        class="hidden"
      />
      
      <div class="flex items-center gap-2">
        <button class="btn btn-accent btn-sm shadow-sm hover:shadow-md transition-shadow duration-300" @click.stop="triggerFileInput">
          {{ i18n.t('selectFile') }}
        </button>
        <span class="text-xs opacity-50">{{ i18n.t('or') }}</span>
        <span class="text-xs flex items-center gap-1">
          {{ i18n.t('pressCtrlV') }} <kbd class="kbd kbd-xs">Ctrl</kbd>+<kbd class="kbd kbd-xs">V</kbd>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useI18nStore } from '@/stores/i18nStore';

const i18n = useI18nStore();
const emit = defineEmits(['files-selected']);

const dropZoneRef = ref(null);
const fileInputRef = ref(null);
const isDragOver = ref(false);
const isHovering = ref(false);

const onDragEnter = () => { isDragOver.value = true; };
const onDragOver = () => { isDragOver.value = true; }; // Needed for drop event
const onDragLeave = (e) => {
  // Prevent flickering when dragging over child elements
  if (dropZoneRef.value && !dropZoneRef.value.contains(e.relatedTarget)) {
    isDragOver.value = false;
  }
};
const onDrop = (e) => {
  isDragOver.value = false;
  const files = e.dataTransfer?.files;
  if (files && files.length > 0) {
    emit('files-selected', Array.from(files));
  }
};

const triggerFileInput = () => {
  fileInputRef.value?.click();
};

const onFileSelected = (e) => {
  const files = e.target?.files;
  if (files && files.length > 0) {
    emit('files-selected', Array.from(files));
  }
  // Reset input value to allow selecting the same file again
  if (fileInputRef.value) {
    fileInputRef.value.value = '';
  }
};

const handlePaste = (e) => {
  const items = (e.clipboardData || window.clipboardData)?.items;
  if (!items) return;

  for (let i = 0; i < items.length; i++) {
    if (items[i].type.includes('image')) {
      const blob = items[i].getAsFile();
      if (blob) {
        // Create a new File object with a name if desired
        const file = new File([blob], `pasted-image-${Date.now()}.${blob.type.split('/')[1] || 'png'}`, { type: blob.type });
        emit('files-selected', [file]);
      }
      break; // Handle only the first image found
    }
  }
};

onMounted(() => {
  document.addEventListener('paste', handlePaste);
});

onUnmounted(() => {
  document.removeEventListener('paste', handlePaste);
});
</script>

<style scoped>
.kbd {
  background-color: var(--base-200, #eee);
  border-radius: 3px;
  border: 1px solid var(--base-300, #b4b4b4);
  box-shadow: 0 1px 1px rgba(0, 0, 0, .2), 0 2px 0 0 rgba(255, 255, 255, .7) inset;
  color: var(--base-content, #333);
  display: inline-block;
  font-size: .75em;
  font-weight: 500;
  line-height: 1;
  padding: 2px 3px;
  white-space: nowrap;
}

.hover-effect {
  transform: translateY(0);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.hover-effect:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}
</style>