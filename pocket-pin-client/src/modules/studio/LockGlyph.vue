<script setup lang="ts">
defineProps<{ locked: boolean }>()
</script>

<template>
  <svg class="lock-glyph" viewBox="0 0 16 16" aria-hidden="true">
    <path
      v-if="locked"
      d="M4.5 7V5.5a3.5 3.5 0 0 1 7 0V7"
    />
    <path
      v-else
      d="M4.5 7V5.6a3.5 3.5 0 0 1 6.2-2.2"
    />
    <rect x="3" y="7" width="10" height="7" rx="1.8" />
    <path class="lock-keyhole" d="M8 9.4v2.2" />
  </svg>
</template>
