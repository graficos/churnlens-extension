<script setup lang="ts">
import { ref } from 'vue';
import Bars from '../chart/Bars.vue';
import Legend from '../chart/Legend.vue';

defineProps<{
  title: string;
  caption?: string;
  labels: string[];
  series: { name: string; color: string; values: number[] }[];
  stacked?: boolean;
}>();

const hidden = ref<Set<number>>(new Set());
const highlight = ref<number | null>(null);

function toggle(index: number) {
  const next = new Set(hidden.value);
  if (next.has(index)) next.delete(index);
  else next.add(index);
  hidden.value = next;
}
</script>

<template>
  <section class="card">
    <h2>{{ title }}</h2>
    <p v-if="caption">{{ caption }}</p>
    <Bars
      :labels="labels"
      :series="series"
      :stacked="stacked"
      :highlight="highlight"
      :hidden="hidden"
    />
    <Legend :items="series" :hidden="hidden" @hover="highlight = $event" @toggle="toggle" />
  </section>
</template>
