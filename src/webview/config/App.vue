<script setup lang="ts">
import { reactive } from 'vue';

interface ConfigPayload {
  preset: string;
  start: string;
  end: string;
  hideRoot: boolean;
  commitLabels: string;
}

const raw = document.getElementById('app')?.dataset.config ?? '{}';
const config = JSON.parse(raw) as ConfigPayload;

const state = reactive({
  preset: config.preset || '30d',
  start: config.start || '',
  end: config.end || '',
  hideRoot: config.hideRoot ?? true,
  commitLabels: config.commitLabels || '',
});

function save() {
  acquireVsCodeApi().postMessage({ command: 'save', value: { ...state } });
}
</script>

<template>
  <main class="mx-auto flex max-w-xl flex-col gap-5 p-6">
    <h1 class="text-xl font-semibold">ChurnLens Configuration</h1>

    <label class="form-control w-full">
      <span class="label-text mb-1">Range preset</span>
      <select v-model="state.preset" class="select select-bordered select-sm">
        <option value="2d">2 days</option>
        <option value="3d">3 days</option>
        <option value="7d">7 days</option>
        <option value="30d">30 days</option>
        <option value="custom">Custom</option>
      </select>
    </label>

    <div v-if="state.preset === 'custom'" class="flex gap-3">
      <label class="form-control flex-1">
        <span class="label-text mb-1">Start</span>
        <input v-model="state.start" type="date" class="input input-bordered input-sm" />
      </label>
      <label class="form-control flex-1">
        <span class="label-text mb-1">End</span>
        <input v-model="state.end" type="date" class="input input-bordered input-sm" />
      </label>
    </div>

    <label class="label cursor-pointer justify-start gap-3">
      <input v-model="state.hideRoot" type="checkbox" class="checkbox checkbox-sm" />
      <span>Hide the root project folder</span>
    </label>

    <label class="form-control w-full">
      <span class="label-text mb-1">Commit labels (comma separated)</span>
      <input
        v-model="state.commitLabels"
        type="text"
        class="input input-bordered input-sm w-full"
      />
      <span class="label-text-alt mt-1 opacity-70">
        Used to group churn by Conventional Commit type. Default follows the Angular convention.
      </span>
    </label>

    <div>
      <button class="btn btn-primary btn-sm" @click="save">Save</button>
    </div>
  </main>
</template>
