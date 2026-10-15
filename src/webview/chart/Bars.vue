<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { extent, linear, niceTicks } from './scale';

interface Series {
  name: string;
  color: string;
  values: number[];
}

interface Bar {
  key: string;
  d: string;
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

const radius = ref(4);
let observer: MutationObserver | null = null;

function readRadius() {
  const probe = document.createElement('span');
  probe.style.cssText =
    'position:absolute;display:block;width:var(--chart-radius);visibility:hidden';
  document.body.appendChild(probe);
  const px = parseFloat(getComputedStyle(probe).width);
  probe.remove();
  if (Number.isFinite(px)) radius.value = px;
}

onMounted(() => {
  readRadius();
  observer = new MutationObserver(readRadius);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
});
onUnmounted(() => observer?.disconnect());

function barPath(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  roundTop: boolean,
  roundBottom: boolean,
) {
  const tl = roundTop ? r : 0;
  const tr = roundTop ? r : 0;
  const br = roundBottom ? r : 0;
  const bl = roundBottom ? r : 0;
  return [
    `M ${x + tl} ${y}`,
    `H ${x + w - tr}`,
    tr ? `A ${tr} ${tr} 0 0 1 ${x + w} ${y + tr}` : '',
    `V ${y + h - br}`,
    br ? `A ${br} ${br} 0 0 1 ${x + w - br} ${y + h}` : '',
    `H ${x + bl}`,
    bl ? `A ${bl} ${bl} 0 0 1 ${x} ${y + h - bl}` : '',
    `V ${y + tl}`,
    tl ? `A ${tl} ${tl} 0 0 1 ${x + tl} ${y}` : '',
    'Z',
  ]
    .filter(Boolean)
    .join(' ');
}

// A bar shorter than its radius would turn into a pill and read smaller than it
// is, so keep it square until there is room for real corners.
function cornerRadius(w: number, h: number) {
  const r = radius.value;
  return h >= 2 * r && w >= 2 * r ? r : 0;
}

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

        const top = isPositive ? to >= positiveTotal : from === 0;
        const bottom = isPositive ? from === 0 : to <= negativeTotal;
        const y0 = y(from);
        const y1 = y(to);
        const barTop = Math.min(y0, y1);
        const h = Math.abs(y1 - y0);

        out.push({
          key: `${label}-${seriesIndex}`,
          d: barPath(x, barTop, barWidth, h, cornerRadius(barWidth, h), top, bottom),
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
      const w = barWidth * 0.9;
      const y0 = y(0);
      const y1 = y(value);
      const barTop = Math.min(y0, y1);
      const h = Math.abs(y1 - y0);

      out.push({
        key: `${label}-${seriesIndex}`,
        d: barPath(x, barTop, w, h, cornerRadius(w, h), true, true),
        color: series.color,
        opacity: opacity(seriesIndex),
        title: `${label} · ${series.name}: ${value}`,
      });
    });
  });

  return out;
});

const showRotatedLabels = computed(() => props.labels.length > 10);

const root = ref<HTMLElement | null>(null);
const hovered = ref<Bar | null>(null);
const tip = ref({ x: 0, y: 0 });

function onMove(event: MouseEvent) {
  const rect = root.value?.getBoundingClientRect();
  if (!rect) return;
  tip.value = { x: event.clientX - rect.left, y: event.clientY - rect.top };
}
</script>

<template>
  <div ref="root" class="chart" @mouseleave="hovered = null" @mousemove="onMove">
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
        <path
          v-for="bar in bars"
          :key="bar.key"
          class="chart-bar"
          :d="bar.d"
          :fill="bar.color"
          :opacity="bar.opacity"
          :style="{ pointerEvents: bar.opacity === 0 ? 'none' : undefined }"
          @mouseenter="hovered = bar"
        />
      </g>
    </svg>

    <div v-if="hovered" class="chart-tip figure" :style="{ left: `${tip.x}px`, top: `${tip.y}px` }">
      {{ hovered.title }}
    </div>
  </div>
</template>
