import { reactive, shallowReactive } from 'vue'
import { showConfirmDialog as confirm, type ToastOptions, type DialogOptions } from 'vant'
import { t } from './i18n'
export const toastState=reactive<{show:boolean;options:ToastOptions;icon:string}>({show:false,options:{},icon:'info-o'})
export type WorkflowToastView={
 title:string;message:string;phase:'running'|'success'|'attention'|'error'|'waiting';progress?:number
 actions?:{label:string;run:()=>void;secondary?:boolean;disabled?:boolean}[]
}
export const workflowToastState=shallowReactive<{owner:symbol|undefined;show:boolean;view:WorkflowToastView}>({owner:undefined,show:false,view:{title:'',message:'',phase:'waiting'}})
export function beginWorkflowToast(owner:symbol,view:WorkflowToastView){toastState.show=false;workflowToastState.owner=owner;workflowToastState.view=view;workflowToastState.show=true}
export function updateWorkflowToast(owner:symbol,view:WorkflowToastView){if(workflowToastState.owner===owner)workflowToastState.view=view}
export function reopenWorkflowToast(owner:symbol){if(workflowToastState.owner===owner){toastState.show=false;workflowToastState.show=true}}
export function closeWorkflowToast(){workflowToastState.show=false}
export function closeToast(){toastState.show=false}
export function showToast(value:string|ToastOptions){
 // The current workflow owns the shared toast while it is visible.
 if(workflowToastState.show)return {close:()=>{}}
 const options=typeof value==='string'?{message:value}:value
 const message=String(options.message||'')
 toastState.icon=options.type==='loading'?'loading':String(options.icon||(/失败|错误|无效/.test(message)?'warning-o':/成功|已|保存|完成/.test(message)?'passed':/透明度/.test(message)?'eye-o':'info-o'))
 toastState.options={position:'top',duration:5000,...options,type:'text',message:t(message),icon:'',className:'pin-toast'}
 toastState.show=true
 return {close:closeToast}
}
export function showConfirmDialog(options:DialogOptions){return confirm({...options,className:'pin-confirm',theme:'round-button',title:t(options.title),message:typeof options.message==='string'?t(options.message):options.message,confirmButtonText:t(options.confirmButtonText||'确认'),cancelButtonText:t(options.cancelButtonText||'取消')})}
