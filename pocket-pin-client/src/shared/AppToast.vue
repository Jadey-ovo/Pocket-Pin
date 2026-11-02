<script setup lang="ts">
import {computed,ref,watch,onUnmounted} from 'vue'
import {Toast as VanToast} from 'vant'
import AppIcon from './AppIcon.vue'
import {toastState,workflowToastState,closeWorkflowToast} from './feedback'
const view=computed(()=>workflowToastState.view)
const show=computed({get:()=>workflowToastState.show||toastState.show,set:(value:boolean)=>{if(!value){if(workflowToastState.show)closeWorkflowToast();else toastState.show=false}}})
const options=computed(()=>workflowToastState.show?{position:'top' as const,duration:0,overlay:false,forbidClick:false,closeOnClick:false,closeOnClickOverlay:false,teleport:'body',zIndex:3000,className:'pin-toast pin-workflow-toast',message:view.value.title}:toastState.options)
const icon=computed(()=>view.value.phase==='running'?'loading':view.value.phase==='success'?'passed':view.value.phase==='error'||view.value.phase==='attention'?'warning-o':'info-o')
const remaining=ref(1)
let timer:ReturnType<typeof setInterval>|undefined
watch(()=>[workflowToastState.owner,workflowToastState.show,view.value.phase,view.value.title,view.value.message],()=>{
 clearInterval(timer);remaining.value=1
 if(!workflowToastState.show)return
 const started=Date.now();timer=setInterval(()=>{remaining.value=Math.max(0,1-(Date.now()-started)/5000);if(!remaining.value){clearInterval(timer);closeWorkflowToast()}},50)
},{immediate:true})
onUnmounted(()=>clearInterval(timer))
</script>

<template>
 <van-toast v-bind="options" v-model:show="show">
  <template #message>
   <section v-if="workflowToastState.show" id="global-workflow-toast" class="pin-workflow-content" role="status" aria-live="polite" aria-label="识别状态">
    <header><app-icon :name="icon" size="22" :class="{'pin-icon-spin':view.phase==='running'}"/><strong>{{view.title}}</strong><span v-if="view.progress!==undefined" class="pin-workflow-percent">{{Math.round(view.progress*100)}}%</span></header>
    <p>{{view.message}}</p>
    <progress v-if="view.progress!==undefined" :value="view.progress" max="1" aria-label="识别总进度"/>
    <progress :value="remaining" max="1" aria-label="提示剩余停留时间"/>
   </section>
   <span v-else class="pin-toast-content" role="status"><app-icon :name="toastState.icon" size="22" :class="{'pin-icon-spin':toastState.icon==='loading'}"/><span>{{toastState.options.message}}</span></span>
  </template>
 </van-toast>
</template>

<style>
.van-toast.pin-toast.pin-workflow-toast{left:auto!important;right:16px!important;top:calc(env(safe-area-inset-top) + 16px)!important;transform:none!important;width:min(380px,calc(100vw - 32px))!important;max-width:calc(100vw - 32px)!important;padding:14px 16px!important;border-radius:18px!important;text-align:left;background:#334d43f5;pointer-events:auto;word-break:normal}
.pin-workflow-toast .van-toast__text{width:100%}.pin-workflow-content{width:100%}.pin-workflow-content header{display:flex;gap:9px;align-items:center}.pin-workflow-content strong{flex:1;font-size:14px;line-height:1.5}.pin-workflow-percent{font-size:12px;font-variant-numeric:tabular-nums}.pin-workflow-content p{font-size:12px;line-height:1.65;margin:8px 0 0;color:#e5f2ec}.pin-workflow-content progress{display:block;width:100%;height:4px;margin-top:12px;accent-color:#a9e1c9}.pin-workflow-close{flex:none;width:32px;height:32px;border:0;border-radius:50%;background:transparent;color:inherit;font:24px/1 inherit;cursor:pointer}.pin-workflow-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.pin-workflow-actions button{min-height:38px;border:1px solid #b5d9c6;border-radius:10px;background:#e7f6ee;color:#234f3c;font:inherit;font-size:12px;padding:8px 12px;cursor:pointer}.pin-workflow-actions button.secondary{background:transparent;color:#f4fff9;border-color:#87ac99}.pin-workflow-content button:focus-visible{outline:3px solid #a9e1c9;outline-offset:2px}
@media(max-width:560px){.van-toast.pin-toast.pin-workflow-toast{top:calc(env(safe-area-inset-top) + 108px)!important;right:12px!important;max-width:calc(100vw - 24px)!important;width:calc(100vw - 24px)!important}}
</style>
