import { ref, watch } from 'vue';
import { vscode } from './vscode';

export const ACCENTS = ['default', 'blue', 'green', 'purple', 'amber'] as const;
export type Accent = (typeof ACCENTS)[number];

interface WebviewState {
  accent?: Accent;
}

const initial = (vscode.getState() as WebviewState | undefined)?.accent ?? 'default';

export function useTheme() {
  const accent = ref<Accent>(initial);

  const apply = (value: Accent) => {
    document.documentElement.dataset.accent = value;
    vscode.setState({ ...(vscode.getState() as object), accent: value });
  };

  apply(accent.value);
  watch(accent, apply);

  return { accent, accents: ACCENTS };
}
