import { watch, type Ref } from 'vue';
import type { ViewState } from '../../protocol';

export const THEMES = [
  'vscode',
  'light',
  'dark',
  'cupcake',
  'bumblebee',
  'emerald',
  'corporate',
  'synthwave',
  'retro',
  'cyberpunk',
  'valentine',
  'halloween',
  'garden',
  'forest',
  'aqua',
  'lofi',
  'pastel',
  'fantasy',
  'wireframe',
  'black',
  'luxury',
  'dracula',
  'cmyk',
  'autumn',
  'business',
  'acid',
  'lemonade',
  'night',
  'coffee',
  'winter',
  'dim',
  'nord',
  'sunset',
  'caramellatte',
  'abyss',
  'silk',
] as const;

export type Theme = (typeof THEMES)[number];

export function useTheme(state: Ref<ViewState | null>) {
  watch(
    state,
    (value) => {
      document.documentElement.dataset.theme = value?.theme || 'vscode';
    },
    { immediate: true },
  );

  return { themes: THEMES };
}
