<script setup lang="ts">
import { computed } from 'vue';
import type { LabelBucket } from '../../protocol';

const props = defineProps<{ labels: LabelBucket[] }>();

const PALETTE = [
  '#4e79a7',
  '#f28e2b',
  '#e15759',
  '#76b7b2',
  '#59a14f',
  '#edc948',
  '#b07aa1',
  '#ff9da7',
  '#9c755f',
  '#bab0ac',
];

function colorFor(type: string): string {
  let hash = 0;
  for (let i = 0; i < type.length; i++) {
    hash = (hash * 31 + type.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}

const max = computed(() => Math.max(1, ...props.labels.map((label) => label.churn)));
</script>

<template>
  <section class="card">
    <h2>Churn by commit type</h2>
    <p>Conventional Commit types, grouped over the range.</p>
    <ul class="bar-list">
      <li v-for="label in labels" :key="label.type">
        <div class="bar-row">
          <span class="bar-name">{{ label.type }}</span>
          <span class="bar-track">
            <span
              class="bar-fill"
              :style="{
                width: `${Math.max(2, (label.churn / max) * 100)}%`,
                background: colorFor(label.type),
              }"
            ></span>
          </span>
          <span class="bar-value">{{ label.churn }}</span>
        </div>
      </li>
    </ul>
  </section>
</template>
