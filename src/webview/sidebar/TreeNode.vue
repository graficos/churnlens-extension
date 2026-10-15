<script setup lang="ts">
import { computed, inject, ref } from 'vue';
import type { TreeNode as TreeNodeModel } from '../../protocol';

const props = defineProps<{
  node: TreeNodeModel;
  metric: 'churn' | 'delta';
  selection: string | null;
}>();

const actions = inject<{
  openTrend: (path: string | null) => void;
  openFile: (path: string, preserveFocus?: boolean) => void;
}>('actions')!;
const open = ref(props.node.isRoot);

const selected = computed(() => props.selection === props.node.path);
const value = computed(() => {
  if (props.metric === 'delta') {
    return props.node.delta > 0 ? `+${props.node.delta}` : String(props.node.delta);
  }
  return String(props.node.churn);
});

const context = computed(() =>
  JSON.stringify({ webviewSection: 'fileItem', path: props.node.path }),
);

const iconClass = computed(() => {
  const name = props.node.name;
  if (props.node.isDir) return 'codicon-folder';
  if (/\.(ts|js|jsx|tsx|json|xml|yml)$/.test(name)) return 'codicon-file-code';
  if (/\.(md|txt)$/.test(name)) return 'codicon-file-text';
  if (/\.(png|jpg|jpeg|gif|svg)$/.test(name)) return 'codicon-file-media';
  if (/\.(zip|tar|gz)$/.test(name)) return 'codicon-file-zip';
  if (name.endsWith('.pdf')) return 'codicon-file-pdf';
  return 'codicon-file';
});

function onRow() {
  if (props.node.isRoot) {
    open.value = true;
    actions.openTrend(null);
  } else if (props.node.isDir) {
    open.value = !open.value;
    actions.openTrend(props.node.path);
  } else {
    actions.openTrend(props.node.path);
  }
}

function onOpenFile(event: MouseEvent) {
  actions.openFile(props.node.path, event.detail === 0);
}

function rows(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('.node-main'));
}

function moveFocus(el: HTMLElement, delta: number) {
  const list = rows();
  list[list.indexOf(el) + delta]?.focus();
}

function focusParent(el: HTMLElement) {
  const level = Number(el.dataset.level);
  const list = rows();
  for (let i = list.indexOf(el) - 1; i >= 0; i--) {
    if (Number(list[i].dataset.level) < level) {
      list[i].focus();
      return;
    }
  }
}

function onKeydown(event: KeyboardEvent) {
  const el = (event.currentTarget as HTMLElement).querySelector<HTMLElement>('.node-main');
  if (!el) return;
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      moveFocus(el, 1);
      break;
    case 'ArrowUp':
      event.preventDefault();
      moveFocus(el, -1);
      break;
    case 'ArrowRight':
      event.preventDefault();
      if (!props.node.isDir) break;
      if (!open.value) open.value = true;
      else moveFocus(el, 1);
      break;
    case 'ArrowLeft':
      event.preventDefault();
      if (props.node.isDir && open.value) open.value = false;
      else focusParent(el);
      break;
  }
}
</script>

<template>
  <li>
    <div
      class="node"
      :class="['level-' + node.level, { selected, root: node.isRoot }]"
      :data-vscode-context="context"
      :title="node.path"
      @keydown="onKeydown"
    >
      <button class="node-main" :data-level="node.level" @click="onRow">
        <span class="arrow" :class="node.isDir ? { open } : 'empty'">&#9654;</span>
        <span class="codicon" :class="iconClass"></span>
        <span class="name">{{ node.name }}</span>
        <span class="count">{{ value }}</span>
      </button>
      <span class="row-end">
        <button
          v-if="!node.isDir"
          class="open-file"
          title="Open file in the editor"
          aria-label="Open file in the editor"
          @click="onOpenFile"
        >
          <span class="codicon codicon-go-to-file"></span>
        </button>
      </span>
    </div>

    <ul v-if="node.isDir && open" class="tree-list">
      <TreeNode
        v-for="child in node.children"
        :key="child.path"
        :node="child"
        :metric="metric"
        :selection="selection"
      />
    </ul>
  </li>
</template>
