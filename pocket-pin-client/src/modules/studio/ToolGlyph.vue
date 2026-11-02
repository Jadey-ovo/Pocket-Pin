<script setup lang="ts">
import AppIcon from '../../shared/AppIcon.vue'
defineProps<{name:string}>()
</script>
<template><AppIcon class="tool-glyph" :name="name" size="22"/></template>
