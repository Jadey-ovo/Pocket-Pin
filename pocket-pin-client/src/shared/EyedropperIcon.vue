<script setup lang="ts">
withDefaults(defineProps<{ size?: number | string; stroke?: number | string }>(), {
  size: 24,
  stroke: 1.5,
})
</script>

<template>
  <svg xmlns="http://www.w3.org/2000/svg" :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" :stroke-width="stroke" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="m14 7 3-3a2.12 2.12 0 0 1 3 3l-3 3" />
    <path d="m13 6 5 5" />
    <path d="M14 7 4.5 16.5 4 20l3.5-.5L17 10" />
  </svg>
</template>
