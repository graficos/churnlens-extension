export function linear(domain: [number, number], range: [number, number]) {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0 || 1;
  return (value: number) => r0 + ((value - d0) / span) * (r1 - r0);
}

function niceStep(raw: number): number {
  const exponent = Math.floor(Math.log10(raw || 1));
  const base = 10 ** exponent;
  const norm = raw / base;
  const step = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
  return step * base;
}

export function niceTicks(min: number, max: number, count = 5): number[] {
  if (min > max) [min, max] = [max, min];
  if (min === max) return [min];

  const step = niceStep((max - min) / count);
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;

  const ticks: number[] = [];
  for (let value = start; value <= end + step / 2; value += step) {
    ticks.push(Math.round(value * 1e6) / 1e6);
  }
  return ticks;
}

export function extent(values: number[]): [number, number] {
  if (values.length === 0) return [0, 1];
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    min = Math.min(0, min);
    max = max === 0 ? 1 : max;
  }
  return [Math.min(0, min), Math.max(0, max)];
}
