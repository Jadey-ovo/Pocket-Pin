<script setup lang="ts">
import AppIcon from '../../shared/AppIcon.vue'
defineProps<{locked:boolean}>()
</script>
<template><AppIcon class="lock-glyph" :name="locked?'lock':'unlock'" size="14"/></template>
