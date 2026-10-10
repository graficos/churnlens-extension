<script setup lang="ts">
import { computed } from 'vue';
import { extent, linear, niceTicks } from './scale';

interface Series {
  name: string;
  color: string;
  values: number[];
}

interface Bar {
  key: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rx: number;
  color: string;
  opacity: number;
  title: string;
}

const props = withDefaults(
  defineProps<{
    labels: string[];
    series: Series[];
    stacked?: boolean;
    height?: number;
    highlight?: number | null;
    hidden?: Set<number>;
  }>(),
  { stacked: false, height: 220, highlight: null, hidden: undefined },
);

const PAD = { top: 12, right: 12, bottom: 30, left: 52 };
const width = computed(() => Math.max(520, props.labels.length * 48 + PAD.left + PAD.right));
const plotWidth = computed(() => width.value - PAD.left - PAD.right);
const plotHeight = computed(() => props.height - PAD.top - PAD.bottom);

const ticks = computed(() => {
  if (props.labels.length === 0) return [0, 1];
  if (props.stacked) {
    let max = 0;
    let min = 0;
    props.labels.forEach((_, index) => {
      let positive = 0;
      let negative = 0;
      for (const series of props.series) {
        const value = series.values[index] ?? 0;
        if (value >= 0) positive += value;
        else negative += value;
      }
      max = Math.max(max, positive);
      min = Math.min(min, negative);
    });
    return niceTicks(min, max, 5);
  }
  const [min, max] = extent(props.series.flatMap((series) => series.values));
  return niceTicks(min, max, 5);
});

const yDomain = computed<[number, number]>(() => [
  ticks.value[0],
  ticks.value[ticks.value.length - 1],
]);
const toY = computed(() => linear(yDomain.value, [PAD.top + plotHeight.value, PAD.top]));
const zeroY = computed(() => toY.value(0));
const band = computed(() => plotWidth.value / Math.max(1, props.labels.length));

const bars = computed<Bar[]>(() => {
  const out: Bar[] = [];
  const y = toY.value;

  const opacity = (index: number) => {
    if (props.hidden?.has(index)) return 0;
    return props.highlight === null || props.highlight === index ? 1 : 0.25;
  };

  if (props.stacked) {
    props.labels.forEach((label, labelIndex) => {
      const positiveTotal = props.series.reduce(
        (sum, s) => sum + Math.max(0, s.values[labelIndex] ?? 0),
        0,
      );
      const negativeTotal = props.series.reduce(
        (sum, s) => sum + Math.min(0, s.values[labelIndex] ?? 0),
        0,
      );

      let positive = 0;
      let negative = 0;
      const barWidth = band.value * 0.6;
      const x = PAD.left + band.value * labelIndex + (band.value - barWidth) / 2;

      props.series.forEach((series, seriesIndex) => {
        const value = series.values[labelIndex] ?? 0;
        if (value === 0) return;
        const isPositive = value >= 0;
        const from = isPositive ? positive : negative;
        const to = from + value;
        if (isPositive) positive = to;
        else negative = to;

        const rounded = isPositive ? to >= positiveTotal : to <= negativeTotal;
        const y0 = y(from);
        const y1 = y(to);
        out.push({
          key: `${label}-${seriesIndex}`,
          x,
          y: Math.min(y0, y1),
          w: barWidth,
          h: Math.abs(y1 - y0),
          rx: rounded ? 3 : 0,
          color: series.color,
          opacity: opacity(seriesIndex),
          title: `${label} · ${series.name}: ${value}`,
        });
      });
    });
    return out;
  }

  const groupWidth = band.value * 0.72;
  const barWidth = groupWidth / Math.max(1, props.series.length);

  props.labels.forEach((label, labelIndex) => {
    const base = PAD.left + band.value * labelIndex + (band.value - groupWidth) / 2;
    props.series.forEach((series, seriesIndex) => {
      const value = series.values[labelIndex] ?? 0;
      const x = base + barWidth * seriesIndex;
      const y0 = y(0);
      const y1 = y(value);
      out.push({
        key: `${label}-${seriesIndex}`,
        x,
        y: Math.min(y0, y1),
        w: barWidth * 0.9,
        h: Math.abs(y1 - y0),
        rx: 3,
        color: series.color,
        opacity: opacity(seriesIndex),
        title: `${label} · ${series.name}: ${value}`,
      });
    });
  });

  return out;
});

const showRotatedLabels = computed(() => props.labels.length > 10);
</script>

<template>
  <svg :viewBox="`0 0 ${width} ${height}`" class="w-full" role="img">
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

    <g>
      <rect
        v-for="bar in bars"
        :key="bar.key"
        :x="bar.x"
        :y="bar.y"
        :width="bar.w"
        :height="bar.h"
        :rx="bar.rx"
        :fill="bar.color"
        :opacity="bar.opacity"
      >
        <title>{{ bar.title }}</title>
      </rect>
    </g>
  </svg>
</template>
