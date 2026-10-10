<script setup lang="ts">
defineProps<{
  items: { name: string; color: string }[];
  hidden?: Set<number>;
}>();

const emit = defineEmits<{ hover: [index: number | null]; toggle: [index: number] }>();
</script>

<template>
  <div class="legend">
    <button
      v-for="(item, index) in items"
      :key="item.name"
      class="legend-item"
      :class="{ off: hidden?.has(index) }"
      @mouseenter="emit('hover', index)"
      @mouseleave="emit('hover', null)"
      @click="emit('toggle', index)"
    >
      <span class="legend-swatch" :style="{ background: item.color }"></span>{{ item.name }}
    </button>
  </div>
</template>
