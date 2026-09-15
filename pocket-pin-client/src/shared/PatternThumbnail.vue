<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { colorByCode, type BeadProject } from '@/core/project'
const props=defineProps<{project:BeadProject}>(),canvas=ref<HTMLCanvasElement|null>(null)
function draw(){const el=canvas.value;if(!el)return;const p=props.project;el.width=p.width;el.height=p.height;const ctx=el.getContext('2d');if(!ctx)return;ctx.clearRect(0,0,p.width,p.height);p.cells.forEach((code,i)=>{if(code){ctx.fillStyle=colorByCode(code)?.hex||'#fff';ctx.fillRect(i%p.width,Math.floor(i/p.width),1,1)}})}
onMounted(draw);watch(()=>props.project,draw,{deep:true})
</script>
<template><canvas ref="canvas" class="pattern-thumbnail" :aria-label="project.name" role="img"/></template>
<style>.pattern-thumbnail{display:block;width:100%;height:100%;object-fit:contain;image-rendering:pixelated}</style>
