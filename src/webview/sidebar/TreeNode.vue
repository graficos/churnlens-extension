<script setup lang="ts">
import { computed, inject, ref } from 'vue';
import type { TreeNode as TreeNodeModel } from '../../protocol';

const props = defineProps<{
  node: TreeNodeModel;
  metric: 'churn' | 'delta';
  selection: string | null;
}>();

const actions = inject<{
  filter: (path: string) => void;
  openTrend: (path: string) => void;
  openFile: (path: string) => void;
}>('actions')!;
const open = ref(false);

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
  if (props.node.isDir) {
    open.value = !open.value;
    actions.filter(props.node.path);
  } else {
    actions.openTrend(props.node.path);
  }
}
</script>

<template>
  <li>
    <div
      class="node"
      :class="['level-' + node.level, { selected }]"
      :data-vscode-context="context"
      :title="node.path"
      @click="onRow"
    >
      <span class="arrow" :class="node.isDir ? { open } : 'empty'">&#9654;</span>
      <span class="codicon" :class="iconClass"></span>
      <span class="name">{{ node.name }}</span>
      <span class="count">{{ value }}</span>
      <span class="row-end">
        <button
          v-if="!node.isDir"
          class="open-file"
          title="Open file in the editor"
          aria-label="Open file in the editor"
          @click.stop="actions.openFile(node.path)"
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
