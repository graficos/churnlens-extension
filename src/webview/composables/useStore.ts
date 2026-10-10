/**
 * SPDX-License-Identifier: MIT
 */
import { ref, type Ref } from 'vue';
import type { ExtToWeb, ViewState, WebToExt } from '../../protocol';
import { vscode } from './vscode';

export interface StoreHandle {
  state: Ref<ViewState | null>;
  post: (message: WebToExt) => void;
}

export function useStore(): StoreHandle {
  const state = ref<ViewState | null>(null);

  window.addEventListener('message', (event: MessageEvent<ExtToWeb>) => {
    if (event.data?.type === 'state') {
      state.value = event.data.state;
    }
  });

  const post = (message: WebToExt) => vscode.postMessage(message);
  post({ type: 'ready' });

  return { state, post };
}
