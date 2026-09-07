<script setup lang="ts">
import { Icon as VanIcon } from 'vant'
defineProps<{ title?: string; back?: boolean; active?: 'home' | 'projects' }>()
defineEmits<{ back: []; titleClick:[] }>()
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <button v-if="back" class="icon-button" aria-label="返回" @click="$emit('back')"><van-icon name="arrow-left" /></button>
      <router-link v-else class="brand" to="/" aria-label="Pocket Pin 首页"><span class="brand-pin"></span><b>Pocket Pin</b></router-link>
      <button v-if="title" class="editable-title" title="点击重命名图纸" @click="$emit('titleClick')"><span>{{ title }}</span><van-icon name="edit"/></button>
      <div v-if="$slots.center" class="topbar-center"><slot name="center" /></div>
      <div class="topbar-spacer"></div>
      <slot name="actions" />
    </header>
    <slot />
  </div>
</template>
