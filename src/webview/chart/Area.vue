<script setup lang="ts">
import { computed, useId } from 'vue';
import { extent, linear, niceTicks } from './scale';

const props = withDefaults(
  defineProps<{
    labels: string[];
    values: number[];
    color?: string;
    height?: number;
  }>(),
  { color: 'var(--color-primary)', height: 200 },
);

const PAD = { top: 12, right: 12, bottom: 30, left: 52 };
const width = computed(() => Math.max(520, props.labels.length * 48 + PAD.left + PAD.right));
const plotWidth = computed(() => width.value - PAD.left - PAD.right);
const plotHeight = computed(() => props.height - PAD.top - PAD.bottom);

const ticks = computed(() => {
  const [min, max] = extent(props.values.length ? props.values : [0, 1]);
  return niceTicks(min, max, 4);
});
const yDomain = computed<[number, number]>(() => [
  ticks.value[0],
  ticks.value[ticks.value.length - 1],
]);
const toY = computed(() => linear(yDomain.value, [PAD.top + plotHeight.value, PAD.top]));
const zeroY = computed(() => toY.value(0));
const band = computed(() => plotWidth.value / Math.max(1, props.labels.length));

const points = computed(() =>
  props.values.map((value, index) => ({
    x: PAD.left + band.value * (index + 0.5),
    y: toY.value(value),
  })),
);

const linePath = computed(() =>
  points.value.length ? `M ${points.value.map((p) => `${p.x} ${p.y}`).join(' L ')}` : '',
);

const areaPath = computed(() => {
  if (points.value.length === 0) return '';
  const first = points.value[0];
  const last = points.value[points.value.length - 1];
  const line = points.value.map((p) => `L ${p.x} ${p.y}`).join(' ');
  return `M ${first.x} ${zeroY.value} ${line} L ${last.x} ${zeroY.value} Z`;
});

const gradientId = `area-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
const showRotatedLabels = computed(() => props.labels.length > 10);
</script>

<template>
  <svg :viewBox="`0 0 ${width} ${height}`" class="w-full" role="img">
    <defs>
      <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" :stop-color="color" stop-opacity="0.35" />
        <stop offset="100%" :stop-color="color" stop-opacity="0.02" />
      </linearGradient>
    </defs>

    <g>
      <line
        v-for="tick in ticks"
        :key="`grid-${tick}`"
        :x1="PAD.left"
        :x2="PAD.left + plotWidth"
        :y1="toY(tick)"
        :y2="toY(tick)"
        class="chart-grid"
      />
      <text
        v-for="tick in ticks"
        :key="`tick-${tick}`"
        :x="PAD.left - 8"
        :y="toY(tick) + 3"
        class="chart-tick"
        text-anchor="end"
      >
        {{ tick }}
      </text>
    </g>

    <line :x1="PAD.left" :x2="PAD.left + plotWidth" :y1="zeroY" :y2="zeroY" class="chart-axis" />
    <path :d="areaPath" :fill="`url(#${gradientId})`" />
    <path :d="linePath" fill="none" :stroke="color" stroke-width="2" stroke-linejoin="round" />

    <g>
      <text
        v-for="(label, index) in labels"
        :key="`xlabel-${label}`"
        :x="PAD.left + band * (index + 0.5)"
        :y="height - 8"
        :transform="
          showRotatedLabels
            ? `rotate(-35 ${PAD.left + band * (index + 0.5)} ${height - 8})`
            : undefined
        "
        :text-anchor="showRotatedLabels ? 'end' : 'middle'"
        class="chart-tick"
      >
        {{ label }}
      </text>
    </g>
  </svg>
</template>
