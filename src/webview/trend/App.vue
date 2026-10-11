<script setup lang="ts">
import { computed } from 'vue';
import { useStore } from '../composables/useStore';
import { useTheme } from '../composables/useTheme';
import Area from '../chart/Area.vue';
import Bars from '../chart/Bars.vue';
import ChartCard from './ChartCard.vue';
import LabelPanel from './LabelPanel.vue';
import RiskPanel from './RiskPanel.vue';
import type { Baseline, RangePreset } from '../../protocol';

const { state, post } = useStore();
const { accent, accents } = useTheme();

const presets: { value: RangePreset; label: string }[] = [
  { value: '2d', label: '2 days' },
  { value: '3d', label: '3 days' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: 'custom', label: 'Custom' },
];

const baselines: { value: Baseline; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'tags', label: 'Git tags' },
  { value: 'merges', label: 'Merge commits' },
  { value: 'time', label: 'Calendar' },
];

const preset = computed(() => state.value?.preset ?? '30d');
const baseline = computed(() => state.value?.baseline ?? 'auto');
const metric = computed(() => state.value?.metric ?? 'churn');
const totals = computed(() => state.value?.totals);
const series = computed(() => state.value?.series ?? []);
const selection = computed(() => state.value?.selection ?? null);
const loading = computed(
  () => !state.value || state.value.status === 'loading' || state.value.status === 'idle',
);
const error = computed(() => state.value?.status === 'error');

const presetLabel = computed(
  () => presets.find((p) => p.value === preset.value)?.label ?? '30 days',
);
const baselineLabel = computed(
  () => baselines.find((b) => b.value === baseline.value)?.label ?? 'auto',
);

const labels = computed(() => series.value.map((point) => point.label));

const deltaVsChurn = computed(() => [
  { name: 'Churn', color: 'var(--churn)', values: series.value.map((p) => p.churn) },
  { name: 'Delta', color: 'var(--delta)', values: series.value.map((p) => p.delta) },
]);

const composition = computed(() => [
  { name: 'Added', color: 'var(--added)', values: series.value.map((p) => p.added) },
  { name: 'Removed', color: 'var(--removed)', values: series.value.map((p) => p.deleted) },
]);

const cumulative = computed(() => state.value?.cumulative ?? []);
const risk = computed(() => state.value?.risk ?? []);
const labelsByType = computed(() => state.value?.labels ?? []);

const deletionRatio = computed(() => [
  {
    name: 'Deletion ratio',
    color: 'var(--removed)',
    values: series.value.map((p) =>
      p.added === 0 ? (p.deleted === 0 ? 0 : 1) : p.deleted / p.added,
    ),
  },
]);

const num = (value: number) => value.toLocaleString();
const signed = (value: number) => `${value > 0 ? '+' : ''}${value.toLocaleString()}`;

function onPreset(event: Event) {
  post({ type: 'setRange', preset: (event.target as HTMLSelectElement).value as RangePreset });
}

function onBaseline(event: Event) {
  post({ type: 'setBaseline', value: (event.target as HTMLSelectElement).value as Baseline });
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
    <header class="head">
      <div class="head-title">
        <h1>Churn trend</h1>
        <p>
          Line movement in the last <span class="figure">{{ presetLabel }}</span
          >, grouped by <span class="figure">{{ baselineLabel }}</span
          >.
        </p>
      </div>

      <div class="controls">
        <label class="field">
          <span class="field-label">Range</span>
          <select :value="preset" @change="onPreset">
            <option v-for="option in presets" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
          <span class="field-hint">The window every number below uses.</span>
        </label>

        <label class="field">
          <span class="field-label">
            Baseline
            <button
              class="i"
              title="What is a baseline?"
              @click.prevent="post({ type: 'openInfo' })"
            >
              <span class="codicon codicon-info"></span>
            </button>
          </span>
          <select :value="baseline" @change="onBaseline">
            <option v-for="option in baselines" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
          <span class="field-hint"
            >How periods are split: git tags, else merges, else calendar.</span
          >
        </label>

        <div class="field">
          <span class="field-label">
            Metric
            <button class="i" title="Churn vs delta" @click="post({ type: 'openInfo' })">
              <span class="codicon codicon-info"></span>
            </button>
          </span>
          <div class="segmented" role="group" aria-label="Metric">
            <button
              :class="{ on: metric === 'churn' }"
              :aria-pressed="metric === 'churn'"
              @click="onMetric('churn')"
            >
              Churn
            </button>
            <button
              :class="{ on: metric === 'delta' }"
              :aria-pressed="metric === 'delta'"
              @click="onMetric('delta')"
            >
              Delta
            </button>
          </div>
          <span class="field-hint">Churn = added + removed. Delta = added − removed.</span>
        </div>

        <label class="field">
          <span class="field-label">Accent</span>
          <select v-model="accent">
            <option v-for="option in accents" :key="option" :value="option">{{ option }}</option>
          </select>
          <span class="field-hint">Colour of the churn marks.</span>
        </label>
      </div>
    </header>

    <div v-if="selection" :key="selection" class="filter">
      <span class="filter-label">Showing</span>
      <span class="filter-path" :title="selection">{{ selection }}</span>
      <button class="filter-clear" @click="post({ type: 'select', path: null })">
        <span class="codicon codicon-close"></span>Show all
      </button>
    </div>

    <template v-if="loading">
      <section class="stats">
        <div v-for="n in 4" :key="n" class="stat">
          <span class="skeleton sk-line" style="width: 46%"></span>
          <span class="skeleton sk-line" style="width: 70%; height: 24px; margin-top: 8px"></span>
        </div>
      </section>
      <div class="grid">
        <div class="col">
          <div class="sk-card">
            <span class="skeleton sk-line" style="width: 30%"></span>
            <div class="skeleton sk-chart" style="margin-top: 12px"></div>
          </div>
          <div class="sk-card">
            <span class="skeleton sk-line" style="width: 22%"></span>
            <div class="skeleton sk-chart" style="margin-top: 12px"></div>
          </div>
        </div>
        <div class="col">
          <div class="sk-card">
            <span class="skeleton sk-line" style="width: 40%"></span>
            <div class="skeleton sk-chart" style="height: 150px; margin-top: 12px"></div>
          </div>
        </div>
      </div>
    </template>

    <div v-else-if="error" class="card">Could not read git history.</div>

    <template v-else-if="totals">
      <section class="stats">
        <div class="stat added" title="Lines added in the range">
          <span class="stat-label">Added</span>
          <span class="stat-value">{{ num(totals.added) }}</span>
        </div>
        <div class="stat removed" title="Lines removed in the range">
          <span class="stat-label">Removed</span>
          <span class="stat-value">{{ num(totals.deleted) }}</span>
        </div>
        <div
          class="stat churn"
          title="Churn: total line movement (added + removed), the risk signal"
        >
          <span class="stat-label">Churn</span>
          <span class="stat-value">{{ num(totals.churn) }}</span>
        </div>
        <div
          class="stat delta"
          :class="totals.delta >= 0 ? 'grow' : 'shrink'"
          title="Delta: net growth (added − removed)"
        >
          <span class="stat-label">Delta</span>
          <span class="stat-value">{{ signed(totals.delta) }}</span>
        </div>
      </section>

      <p class="stats-note">
        <span class="figure">churn = added + removed</span> is total movement, the risk signal.
        <span class="figure">delta = added − removed</span> is net growth.
        <button class="i" @click="post({ type: 'openInfo' })">Read the explainer</button>
      </p>

      <section v-if="series.length === 0" class="card">
        <h2>Nothing to plot</h2>
        <p>No churn in this range. Try a longer range or a different baseline.</p>
      </section>

      <div v-else class="grid">
        <div class="col">
          <ChartCard
            title="Delta vs Churn"
            caption="Churn is total movement; delta is net growth. Grouped per period."
            :labels="labels"
            :series="deltaVsChurn"
          />
          <ChartCard
            title="Added and removed"
            caption="Lines added (green) and removed (red) each period. Modified lines need blame and arrive in a later phase."
            :labels="labels"
            :series="composition"
            stacked
          />
          <section class="card">
            <h2>Cumulative churn</h2>
            <p>The running total of movement across the range.</p>
            <div class="chart-wrap">
              <Area :labels="labels" :values="cumulative" color="var(--churn)" />
            </div>
          </section>
          <section class="card">
            <h2>Deletion ratio</h2>
            <p>Removed divided by added each period — the rework pressure.</p>
            <div class="chart-wrap">
              <Bars :labels="labels" :series="deletionRatio" :height="180" />
            </div>
          </section>
        </div>

        <div class="col">
          <RiskPanel :risk="risk" :selection="selection" :limit="3" @open="onRiskOpen" />
          <LabelPanel v-if="labelsByType.length" :labels="labelsByType" />
        </div>
      </div>
    </template>
  </main>
</template>
