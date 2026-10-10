<script setup lang="ts">
import { computed, provide } from 'vue';
import { useStore } from '../composables/useStore';
import TreeNode from './TreeNode.vue';
import type { RangePreset } from '../../protocol';

const { state, post } = useStore();

const presets: { value: RangePreset; label: string }[] = [
  { value: '2d', label: '2 days' },
  { value: '3d', label: '3 days' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: 'custom', label: 'Custom' },
];

const preset = computed(() => state.value?.preset ?? '30d');
const metric = computed(() => state.value?.metric ?? 'churn');
const start = computed(() => state.value?.start ?? '');
const end = computed(() => state.value?.end ?? '');
const tree = computed(() => state.value?.tree ?? []);
const selection = computed(() => state.value?.selection ?? null);
const loading = computed(
  () => !state.value || state.value.status === 'loading' || state.value.status === 'idle',
);
const error = computed(() => state.value?.status === 'error');

provide('actions', {
  select: (path: string) => post({ type: 'select', path: selection.value === path ? null : path }),
  open: (path: string) => post({ type: 'openFile', path }),
});

function onPreset(event: Event) {
  const value = (event.target as HTMLSelectElement).value as RangePreset;
  post({ type: 'setRange', preset: value });
}

function onStart(event: Event) {
  post({
    type: 'setRange',
    preset: 'custom',
    start: (event.target as HTMLInputElement).value,
    end: end.value,
  });
}

function onEnd(event: Event) {
  post({
    type: 'setRange',
    preset: 'custom',
    start: start.value,
    end: (event.target as HTMLInputElement).value,
  });
}

function onMetric(event: Event) {
  const value = (event.target as HTMLSelectElement).value === 'delta' ? 'delta' : 'churn';
  post({ type: 'setMetric', value });
}
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="toolbar">
      <div class="row">
        <span>Range</span>
        <select :value="preset" @change="onPreset">
          <option v-for="option in presets" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <template v-if="preset === 'custom'">
          <input type="date" :value="start" @change="onStart" />
          <input type="date" :value="end" @change="onEnd" />
        </template>
      </div>
      <div class="row">
        <span>Metric</span>
        <select :value="metric" @change="onMetric">
          <option value="churn">Churn</option>
          <option value="delta">Delta</option>
        </select>
        <span class="info" @click="post({ type: 'openInfo' })">
          <span class="codicon codicon-info"></span>info
        </span>
        <span class="flex-1"></span>
        <span class="actions">
          <button title="Refresh" @click="post({ type: 'refresh' })">
            <span class="codicon codicon-refresh"></span>
          </button>
          <button title="Settings" @click="post({ type: 'openSettings' })">
            <span class="codicon codicon-settings-gear"></span>
          </button>
        </span>
      </div>
    </div>

    <div class="flex-1 overflow-auto p-2">
      <div v-if="loading" class="flex items-center gap-2 p-2 opacity-80">
        <span
          class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        ></span>
        Loading...
      </div>
      <div v-else-if="error" class="p-2">Could not read git history.</div>
      <div v-else-if="tree.length === 0" class="p-2">
        No churn data in this range. Try a longer period.
      </div>
      <ul v-else class="tree-list">
        <TreeNode
          v-for="node in tree"
          :key="node.path"
          :node="node"
          :metric="metric"
          :selection="selection"
        />
      </ul>
    </div>
  </div>
</template>
