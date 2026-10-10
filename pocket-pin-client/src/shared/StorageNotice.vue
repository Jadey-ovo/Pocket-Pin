<script setup lang="ts">
import { ref } from 'vue'
import { Dialog as VanDialog } from 'vant'
import { t } from './i18n'
const noticeKey = 'pocket-pin:storage-notice:v1'
function shouldShow() {
  try { return localStorage.getItem(noticeKey) !== 'acknowledged' }
  catch { return true }
}
const visible = ref(shouldShow())
function acknowledge() {
  try { localStorage.setItem(noticeKey, 'acknowledged') } catch { /* Keep the notice available on the next visit. */ }
}
</script>

<template>
  <van-dialog v-model:show="visible" class-name="pin-confirm pin-storage-notice" theme="round-button" :title="t('图纸保存说明')" :confirm-button-text="t('我知道了')" :close-on-click-overlay="false" @confirm="acknowledge">
    <ol class="pin-storage-notice-content">
      <li>{{ t('图纸仅保存在当前设备的当前浏览器中，不会自动同步到其他设备或浏览器。') }}</li>
      <li>{{ t('分享网站链接不会分享你的图纸，其他人只能看到自己保存的作品。') }}</li>
      <li>{{ t('清除网站数据或使用无痕模式可能导致记录丢失。重要作品建议及时导出图纸。') }}</li>
    </ol>
  </van-dialog>
</template>

<style scoped>
.pin-storage-notice-content{margin:0;padding:4px 24px 18px 42px;list-style:decimal;color:var(--animal-ink,#574437);font-size:14px;line-height:1.75;text-align:left}
.pin-storage-notice-content li{margin:12px 0}
</style>
