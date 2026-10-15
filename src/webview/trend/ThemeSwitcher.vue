<script setup lang="ts">
import { THEMES } from '../composables/useTheme';

defineProps<{ theme: string }>();
const emit = defineEmits<{ select: [value: string] }>();

const themes = THEMES;

const label = (name: string) =>
  name === 'vscode' ? 'VS Code' : name[0].toUpperCase() + name.slice(1);

const pick = (name: string) => {
  emit('select', name);
  (document.activeElement as HTMLElement | null)?.blur();
};
</script>

<template>
  <div class="field">
    <span class="field-label">Theme</span>
    <div class="dropdown dropdown-end">
      <div tabindex="0" role="button" class="btn btn-sm btn-outline gap-2 font-normal">
        <span class="theme-dot" :data-theme="theme"></span>
        {{ label(theme) }}
        <svg width="10" height="10" viewBox="0 0 2048 2048" class="fill-current opacity-60">
          <path d="M1799 349l242 241-1017 1017L7 590l242-241 775 775 775-775z" />
        </svg>
      </div>
      <ul
        tabindex="-1"
        class="dropdown-content menu bg-base-300 rounded-box z-20 mt-1 max-h-80 w-56 flex-nowrap overflow-y-auto p-2 shadow-2xl"
      >
        <li v-for="name in themes" :key="name">
          <button
            type="button"
            class="flex items-center gap-2"
            :class="{ active: name === theme }"
            @click="pick(name)"
          >
            <span class="theme-swatch" :data-theme="name">
              <i class="bg-base-100"></i>
              <i class="bg-primary"></i>
              <i class="bg-secondary"></i>
              <i class="bg-accent"></i>
              <i class="bg-neutral"></i>
            </span>
            <span class="min-w-0 flex-1 truncate text-left">{{ label(name) }}</span>
          </button>
        </li>
      </ul>
    </div>
    <span class="field-hint">Panel colours; the charts keep their fixed signal colours.</span>
  </div>
</template>

<style scoped>
.theme-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: var(--color-primary);
  border: 1px solid color-mix(in srgb, var(--color-base-content) 25%, transparent);
}

.theme-swatch {
  display: inline-flex;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 2px;
  border: 1px solid color-mix(in srgb, var(--color-base-content) 20%, transparent);
}

.theme-swatch i {
  display: block;
  width: 9px;
  height: 16px;
}
</style>
