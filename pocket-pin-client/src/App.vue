<script setup lang="ts">
import { ConfigProvider as VanConfigProvider } from 'vant'

const themeVars = {
  primaryColor: '#58aa98',
  successColor: '#70a878',
  background: '#f5edda',
  background2: '#fffaf0',
  textColor: '#574437',
  borderColor: '#dfcfb4',
  radiusMd: '18px',
  buttonRoundRadius: '999px',
}
</script>

<template>
  <van-config-provider :theme-vars="themeVars">
    <router-view />
  </van-config-provider>
</template>
