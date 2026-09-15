<script setup lang="ts">
import { locale,setLanguage } from './i18n'
</script>
<template><div class="language-switch" role="group" aria-label="Language"><i :class="{english:locale==='en'}"/><button :aria-pressed="locale==='zh'" @click="setLanguage('zh')">中</button><button :aria-pressed="locale==='en'" @click="setLanguage('en')">EN</button></div></template>
