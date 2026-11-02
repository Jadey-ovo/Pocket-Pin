<script setup lang="ts">
import {computed} from 'vue'
import {colorByCode} from '@/core/project'
const props=defineProps<{code:string}>()
const style=computed(()=>{const hex=colorByCode(props.code)?.hex??'#d3d7d3',rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));return {background:hex,color:rgb[0]*.299+rgb[1]*.587+rgb[2]*.114<145?'#fff':'#3c342b'}})
</script>
<template><span class="bead-color-chip" :style="style">{{code}}</span></template>
<style scoped>.bead-color-chip{display:inline-flex;align-items:center;justify-content:center;min-width:44px;height:38px;padding:0 8px;border-radius:11px;font-size:12px;font-weight:800;white-space:nowrap;border:1px solid #0001;font-style:normal;box-sizing:border-box}</style>
