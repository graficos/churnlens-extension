<script setup lang="ts">
import { computed } from 'vue';
import { useStore } from '../composables/useStore';
import Area from '../chart/Area.vue';
import Bars from '../chart/Bars.vue';
import ChartCard from './ChartCard.vue';
import LabelPanel from './LabelPanel.vue';
import RiskPanel from './RiskPanel.vue';
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
const totals = computed(() => state.value?.totals);
const series = computed(() => state.value?.series ?? []);
const selection = computed(() => state.value?.selection ?? null);
const loading = computed(
  () => !state.value || state.value.status === 'loading' || state.value.status === 'idle',
);
const error = computed(() => state.value?.status === 'error');

const granularityLabel = computed(() => {
  const points = series.value;
  if (points.length === 0) return '';
  return points.length > 1 ? `${points.length} periods` : '1 period';
});

const labels = computed(() => series.value.map((point) => point.label));

const deltaVsChurn = computed(() => [
  { name: 'Churn', color: 'var(--color-primary)', values: series.value.map((p) => p.churn) },
  {
    name: 'Delta',
    color: 'var(--vscode-charts-purple, #b180d7)',
    values: series.value.map((p) => p.delta),
  },
]);

const composition = computed(() => [
  { name: 'Added', color: 'var(--chart-added)', values: series.value.map((p) => p.added) },
  { name: 'Removed', color: 'var(--chart-deleted)', values: series.value.map((p) => p.deleted) },
]);

const cumulative = computed(() => state.value?.cumulative ?? []);
const risk = computed(() => state.value?.risk ?? []);
const labelsByType = computed(() => state.value?.labels ?? []);

const deletionRatio = computed(() => [
  {
    name: 'Deletion ratio',
    color: 'var(--chart-deleted)',
    values: series.value.map((p) =>
      p.added === 0 ? (p.deleted === 0 ? 0 : 1) : p.deleted / p.added,
    ),
  },
]);

function onPreset(event: Event) {
  post({ type: 'setRange', preset: (event.target as HTMLSelectElement).value as RangePreset });
}

function onMetric(value: 'churn' | 'delta') {
  post({ type: 'setMetric', value });
}

function onRiskOpen(path: string) {
  post({ type: 'select', path: selection.value === path ? null : path });
  post({ type: 'openFile', path });
}
</script>

<template>
  <main class="trend">
    <header class="toolbar">
      <h1 class="text-lg font-semibold">Churn Trend</h1>
      <select :value="preset" @change="onPreset">
        <option v-for="option in presets" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
      <div class="flex items-center gap-1 text-sm">
        <button
          class="rounded px-2 py-1"
          :class="
            metric === 'churn'
              ? 'bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)]'
              : ''
          "
          @click="onMetric('churn')"
        >
          Churn
        </button>
        <button
          class="rounded px-2 py-1"
          :class="
            metric === 'delta'
              ? 'bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)]'
              : ''
          "
          @click="onMetric('delta')"
        >
          Delta
        </button>
      </div>
      <span class="flex-1"></span>
      <span class="info" @click="post({ type: 'openInfo' })">
        <span class="codicon codicon-info"></span>info
      </span>
      <button title="Refresh" @click="post({ type: 'refresh' })">
        <span class="codicon codicon-refresh"></span>
      </button>
    </header>

    <p v-if="selection" class="text-sm opacity-70">
      Filtered to <span class="font-medium">{{ selection }}</span>
      <button class="ml-2 underline" @click="post({ type: 'select', path: null })">clear</button>
    </p>

    <div v-if="loading" class="opacity-80">Loading...</div>
    <div v-else-if="error">Could not read git history.</div>
    <template v-else-if="totals">
      <section class="totals">
        <div class="tile">
          <div class="label">Churn</div>
          <div class="value">{{ totals.churn }}</div>
        </div>
        <div class="tile">
          <div class="label">Delta</div>
          <div class="value">{{ totals.delta > 0 ? '+' : '' }}{{ totals.delta }}</div>
        </div>
        <div class="tile">
          <div class="label">Added</div>
          <div class="value">{{ totals.added }}</div>
        </div>
        <div class="tile">
          <div class="label">Removed</div>
          <div class="value">{{ totals.deleted }}</div>
        </div>
        <div class="tile">
          <div class="label">Commits</div>
          <div class="value">{{ totals.commits }}</div>
        </div>
      </section>

      <section v-if="series.length === 0" class="card">
        <h2>Trend</h2>
        <p>No churn in this range. Try a longer period.</p>
      </section>
      <template v-else>
        <ChartCard
          title="Delta vs Churn"
          :caption="granularityLabel"
          :labels="labels"
          :series="deltaVsChurn"
        />
        <ChartCard
          title="Composition"
          caption="Added and removed lines per period."
          :labels="labels"
          :series="composition"
          stacked
        />
        <section class="card">
          <h2>Cumulative churn</h2>
          <p>Running total of churn across the range.</p>
          <Area :labels="labels" :values="cumulative" />
        </section>
        <section class="card">
          <h2>Deletion ratio</h2>
          <p>Removed divided by added per period — rework pressure.</p>
          <Bars :labels="labels" :series="deletionRatio" :height="180" />
        </section>
        <LabelPanel v-if="labelsByType.length" :labels="labelsByType" />
        <RiskPanel :risk="risk" :selection="selection" @open="onRiskOpen" />
        <p class="text-sm opacity-70">
          Churn is total line movement, the risk signal. Delta is net growth. Read the
          <button class="underline" @click="post({ type: 'openInfo' })">
            churn and delta explainer</button
          >.
        </p>
      </template>
    </template>
  </main>
</template>
