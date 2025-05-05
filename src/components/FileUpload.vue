<template>
  <div class="card bg-base-100 shadow-sm w-full">
    <div
      ref="dropZoneRef"
      class="card-body flex flex-col items-center justify-center py-10 px-4 cursor-pointer border-2 border-dashed rounded-xl transition-all"
      :class="{ 'border-primary bg-primary/5': isDragOver, 'border-base-300': !isDragOver }"
      @dragenter.prevent.stop="onDragEnter"
      @dragover.prevent.stop="onDragOver"
      @dragleave.prevent.stop="onDragLeave"
      @drop.prevent.stop="onDrop"
      @click="triggerFileInput"
    >
      <div class="text-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mb-3 text-primary mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        
        <h3 class="text-lg font-medium mb-2">上传文件</h3>
        <p class="text-sm opacity-70 mb-4">拖放图片或PDF到此处，或点击上传</p>
        
        <input
          ref="fileInputRef"
          type="file"
          id="fileInput"
          accept="image/*,.pdf"
          multiple
          @change="onFileSelected"
          class="hidden"
        />
        
        <button class="btn btn-primary btn-sm" @click.stop>
          选择文件
        </button>
        
        <div class="divider my-4">或</div>
        
        <p class="text-sm opacity-70">
          按 <kbd class="kbd kbd-sm">Ctrl</kbd> + <kbd class="kbd kbd-sm">V</kbd> 粘贴图片
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const emit = defineEmits(['files-selected']);

const dropZoneRef = ref(null);
const fileInputRef = ref(null);
const isDragOver = ref(false);

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
  console.log('Files dropped:', files);
  if (files && files.length > 0) {
    console.log('Emitting files-selected event:', Array.from(files));
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
/* Styles specific to FileUpload, copied/adapted from style.css */
.upload-section {
    margin-bottom: 1rem;
}

.drop-area {
    border: 2px dashed var(--border-color);
    border-radius: 8px;
    padding: 2rem;
    text-align: center;
    background-color: white;
    transition: border-color 0.3s, background-color 0.3s;
    cursor: pointer;
}

.drop-area:hover, .drop-area.drag-over {
    border-color: var(--primary-color);
    background-color: var(--secondary-color);
}

.drop-area p {
    margin: 0.5rem 0;
    color: var(--text-color);
}

.file-input-label {
    display: inline-block;
    background-color: var(--primary-color);
    color: white;
    padding: 0.5rem 1.5rem;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
    margin: 1rem 0;
    transition: background-color 0.3s;
}

.file-input-label:hover {
    background-color: var(--hover-color);
}

kbd {
    background-color: #eee;
    border-radius: 3px;
    border: 1px solid #b4b4b4;
    box-shadow: 0 1px 1px rgba(0, 0, 0, .2), 0 2px 0 0 rgba(255, 255, 255, .7) inset;
    color: #333;
    display: inline-block;
    font-size: .85em;
    font-weight: 700;
    line-height: 1;
    padding: 2px 4px;
    white-space: nowrap;
}
</style>