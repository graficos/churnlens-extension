<script setup lang="ts">
import { computed } from 'vue';
import type { RiskEntry } from '../../protocol';

const props = defineProps<{ risk: RiskEntry[]; selection: string | null }>();
const emit = defineEmits<{ open: [path: string] }>();

const max = computed(() => Math.max(1, ...props.risk.map((entry) => entry.churn)));

function width(entry: RiskEntry) {
  return `${Math.max(2, (entry.churn / max.value) * 100)}%`;
}
</script>

<template>
  <section class="card">
    <h2>Highest churn</h2>
    <p>Paths with the most line movement. Click a bar to open the file.</p>
    <ul class="risk">
      <li v-for="entry in risk" :key="entry.path">
        <button
          class="risk-row"
          :class="{ selected: entry.path === selection }"
          @click="emit('open', entry.path)"
        >
          <span class="risk-name" :title="entry.path">{{ entry.name }}</span>
          <span class="risk-track"
            ><span class="risk-fill" :style="{ width: width(entry) }"></span
          ></span>
          <span class="risk-value">{{ entry.churn }}</span>
        </button>
      </li>
    </ul>
  </section>
</template>
