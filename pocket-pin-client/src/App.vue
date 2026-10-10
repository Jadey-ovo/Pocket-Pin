<script setup lang="ts">
import { ConfigProvider as VanConfigProvider } from 'vant'
import StorageNotice from './shared/StorageNotice.vue'

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
    <storage-notice/>
    <router-view v-slot="{ Component, route }"><Transition name="pin-route" mode="out-in"><component :is="Component" :key="route.path"/></Transition></router-view>
  </van-config-provider>
</template>
