<script setup lang="ts">
import { computed, inject, ref } from 'vue';
import type { TreeNode as TreeNodeModel } from '../../protocol';

const props = defineProps<{
  node: TreeNodeModel;
  metric: 'churn' | 'delta';
  selection: string | null;
}>();

const actions = inject<{ select: (path: string) => void; open: (path: string) => void }>(
  'actions',
)!;
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

function onDirectory() {
  open.value = !open.value;
  actions.select(props.node.path);
}

function onFile() {
  actions.select(props.node.path);
  actions.open(props.node.path);
}
</script>

<template>
  <li>
    <div
      v-if="node.isDir"
      class="node"
      :class="['level-' + node.level, { selected }]"
      :data-vscode-context="context"
      @click="onDirectory"
    >
      <span class="arrow" :class="{ open }">&#9654;</span>
      <span class="codicon codicon-folder"></span>
      <span class="name">{{ node.name }}</span>
      <span class="count">{{ value }}</span>
    </div>
    <div
      v-else
      class="node"
      :class="['level-' + node.level, { selected }]"
      :data-vscode-context="context"
      @click="onFile"
    >
      <span class="arrow empty"></span>
      <span class="codicon" :class="iconClass"></span>
      <span class="name">{{ node.name }}</span>
      <span class="count">{{ value }}</span>
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
