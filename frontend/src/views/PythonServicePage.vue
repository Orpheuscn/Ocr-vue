<template>
  <div class="flex flex-col min-h-screen">
    <div class="flex-grow">
      <div class="container mx-auto px-4 py-6">
        <h1 class="text-2xl font-bold text-primary mb-6">图像坐标映射工具</h1>
        <div class="card bg-base-100 shadow-lg">
          <div class="card-body">
            <ImageCoordinateTool />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import ImageCoordinateTool from '@/components/ImageCoordinateTool.vue'
</script>
