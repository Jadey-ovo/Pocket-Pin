<script setup lang="ts">
defineProps<{ name: string }>()
</script>
<template><svg class="tool-glyph" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
<template v-if="name==='pencil'"><path d="m4 20 4.2-1 10.6-10.6a2.4 2.4 0 0 0-3.4-3.4L4.8 15.6 4 20Z"/><path d="m14 6.4 3.4 3.4"/></template>
<template v-else-if="name==='eraser'"><path d="m7.1 19.2-3-3a2 2 0 0 1 0-2.8l8.3-8.3a2 2 0 0 1 2.8 0l4.1 4.1a2 2 0 0 1 0 2.8l-7.2 7.2H7.1Z"/><path d="m9.3 8.2 6.5 6.5M11.8 19.2H21"/></template>
<template v-else-if="name==='fill'"><rect x="4" y="5" width="16" height="14" rx="1.5"/><path d="M7 8h10v8H7z" fill="currentColor" stroke="none" opacity=".22"/><path d="M4 9V5h4M16 5h4v4M20 15v4h-4M8 19H4v-4"/></template>
<template v-else-if="name==='remove'"><rect x="4" y="5" width="16" height="14" rx="1.5" stroke-dasharray="2.5 2.5"/><path d="M8 12h8"/></template>
<template v-else-if="name==='recolor'"><path d="M4 7h12M13 4l3 3-3 3M20 17H8M11 14l-3 3 3 3"/></template>
<template v-else-if="name==='eyedropper'"><path d="m15.5 4.5 4 4M13.2 6.8l4 4M14.8 5.2l1.4-1.4a2.1 2.1 0 0 1 3 3l-1.4 1.4-2.2 2.2-7.8 7.8H4.5v-3.3l7.8-7.8 2.5-1.9Z"/><path d="M4.5 20h6"/></template>
<template v-else-if="name==='shape'"><rect x="4" y="6" width="16" height="12" rx="1"/></template>
<template v-else-if="name==='text'"><path d="M5 5h14M12 5v14M8 19h8"/></template>
<template v-else-if="name==='move'"><path d="M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3"/></template>
<template v-else-if="name==='copy'"><rect x="7" y="7" width="12" height="12" rx="1.5"/><path d="M15 7V4H4v11h3M4 8V4h4M15 16v3h-3M19 11V7h-4"/></template>
<template v-else-if="name==='paste'"><path d="M9 5a3 3 0 0 1 6 0h2a2 2 0 0 1 2 2v12H5V7a2 2 0 0 1 2-2h2Z"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></template>
<template v-else-if="name==='pan'"><path d="M8 11V7a1.5 1.5 0 0 1 3 0v4-6a1.5 1.5 0 0 1 3 0v6-4a1.5 1.5 0 0 1 3 0v5-2a1.5 1.5 0 0 1 3 0v3c0 4.4-2.6 7-7 7h-1c-2.2 0-3.6-1-4.8-2.6L4 13.2A1.6 1.6 0 0 1 6.5 11L8 12.5"/></template>
<template v-else-if="name==='import'"><rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="m5.5 17 4.5-4 3.2 3 2.3-2 3 3M12 2v7M9.5 6.5 12 9l2.5-2.5"/></template>
<template v-else><circle cx="12" cy="12" r="8"/></template>
</svg></template>
