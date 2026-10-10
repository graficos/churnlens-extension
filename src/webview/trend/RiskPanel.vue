<script setup lang="ts">
import { computed } from 'vue';
import type { RiskEntry } from '../../protocol';

const props = withDefaults(
  defineProps<{ risk: RiskEntry[]; selection: string | null; limit?: number }>(),
  { limit: 3 },
);
const emit = defineEmits<{ open: [path: string] }>();

const top = computed(() => props.risk.slice(0, props.limit));
const max = computed(() => Math.max(1, ...top.value.map((entry) => entry.churn)));

function width(entry: RiskEntry) {
  return `${Math.max(3, (entry.churn / max.value) * 100)}%`;
}
</script>

<template>
  <section class="card">
    <h2>Highest churn</h2>
    <p>The three riskiest paths by total movement. Click one to open the file.</p>
    <ol class="rank">
      <li v-for="(entry, index) in top" :key="entry.path">
        <button
          class="rank-row"
          :class="{ selected: entry.path === selection }"
          :title="entry.path"
          @click="emit('open', entry.path)"
        >
          <span class="rank-num figure">{{ index + 1 }}</span>
          <span class="rank-body">
            <span class="rank-name">{{ entry.name }}</span>
            <span class="rank-track">
              <span class="rank-fill" :style="{ width: width(entry) }"></span>
            </span>
          </span>
          <span class="rank-value figure">{{ entry.churn.toLocaleString() }}</span>
        </button>
      </li>
    </ol>
  </section>
</template>
