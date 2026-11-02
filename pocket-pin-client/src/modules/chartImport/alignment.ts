import {boxQuad,gridCoordinates,subGrid,type Grid,type Quad,type Raster} from './recognition'
export type Alignment={x:number;y:number;cellWidth:number;cellHeight:number}
export function alignmentFromGrid(grid:Grid):Alignment{return {x:grid.quad[0].x,y:grid.quad[0].y,cellWidth:Math.hypot(grid.quad[1].x-grid.quad[0].x,grid.quad[1].y-grid.quad[0].y)/grid.columns,cellHeight:Math.hypot(grid.quad[3].x-grid.quad[0].x,grid.quad[3].y-grid.quad[0].y)/grid.rows}}
export function fullImageGrid(a:Alignment,image:Pick<Raster,'width'|'height'>):Grid{
 const mod=(n:number,d:number)=>((n%d)+d)%d,w=Math.max(2,a.cellWidth),h=Math.max(2,a.cellHeight),x=mod(a.x,w),y=mod(a.y,h),columns=Math.max(1,Math.floor((image.width-1-x)/w)),rows=Math.max(1,Math.floor((image.height-1-y)/h))
 return {quad:boxQuad({x,y,width:columns*w,height:rows*h}),columns,rows,confidence:1}
}
export function regionOnGrid(grid:Grid,quad:Quad){const a=gridCoordinates(grid.quad,quad[0]),b=gridCoordinates(grid.quad,quad[2]);const selected=subGrid(grid,a.x*grid.columns,a.y*grid.rows,b.x*grid.columns,b.y*grid.rows),left=Math.round(a.x*grid.columns),top=Math.round(a.y*grid.rows)
 return {left:Math.max(0,Math.min(grid.columns-1,left)),top:Math.max(0,Math.min(grid.rows-1,top)),right:Math.max(0,Math.min(grid.columns-1,left))+selected.columns,bottom:Math.max(0,Math.min(grid.rows-1,top))+selected.rows}
}
