<template>
  <div class="pdf-nav-container">
    <div class="pdf-controls">
      <button
        class="nav-button"
        :disabled="currentPage <= 1 || isLoading"
        @click="changePage(currentPage - 1)"
      >
        &lt; 上一页
      </button>
      <div class="page-input-container">
        <input
          type="number"
          :min="1"
          :max="totalPages"
          :value="currentPage"
          @change="handlePageInputChange"
          :disabled="isLoading || totalPages <= 0"
          aria-label="当前页码"
        />
        <span> / {{ totalPages || 1 }}</span>
      </div>
      <button
        class="nav-button"
        :disabled="currentPage >= totalPages || isLoading || totalPages <= 0"
        @click="changePage(currentPage + 1)"
      >
        下一页 &gt;
      </button>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  currentPage: { type: Number, required: true, default: 1 },
  totalPages: { type: Number, required: true, default: 0 },
  isLoading: { type: Boolean, default: false }
});

const emit = defineEmits(['page-change']);

const changePage = (newPage) => {
  if (newPage >= 1 && newPage <= props.totalPages) {
    emit('page-change', newPage);
  }
};

const handlePageInputChange = (event) => {
  let page = parseInt(event.target.value, 10);
  if (isNaN(page) || page < 1) {
    page = 1;
  } else if (props.totalPages > 0 && page > props.totalPages) {
    page = props.totalPages;
  }
  // Update input visually in case it was corrected
  event.target.value = page;
  // Emit change only if it's different from current page
  if (page !== props.currentPage) {
      emit('page-change', page);
  }
};
</script>

<style scoped>
/* Styles from original .pdf-nav-container */
.pdf-nav-container {
    width: 100%;
    background-color: white;
    border-bottom: 1px solid var(--border-color);
    padding: 0.5rem;
    display: flex;
    justify-content: center;
    /* Removed border radius, apply to parent wrapper or ImageCanvas */
}

.pdf-controls {
    display: flex;
    align-items: center;
    gap: 0.8rem; /* Slightly larger gap */
}

.nav-button {
    background-color: var(--primary-color);
    color: white;
    border: none;
    border-radius: 4px;
    padding: 0.4rem 0.8rem; /* Slightly larger padding */
    cursor: pointer;
    font-size: 0.85rem;
    transition: background-color 0.3s;
    white-space: nowrap;
}

.nav-button:hover:not(:disabled) {
    background-color: var(--hover-color);
}

.nav-button:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
    opacity: 0.7;
}

.page-input-container {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.9rem; /* Slightly larger font */
}

.page-input-container input {
    width: 50px; /* Wider input */
    padding: 0.4rem;
    text-align: center;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    font-size: 0.9rem;
}
.page-input-container input:disabled {
    background-color: #f0f0f0;
    cursor: not-allowed;
}
.page-input-container span {
    color: var(--text-color);
    opacity: 0.8;
}
</style>