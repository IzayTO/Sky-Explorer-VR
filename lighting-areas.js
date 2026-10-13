import * as T from './three.module.js?v=4.0.0';
import {isLamp} from './lamp-settings.js';
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
export function polygonArea(points){return Math.abs(points.reduce((n,p,i)=>{const q=points[(i+1)%points.length];return n+p[0]*q[2]-q[0]*p[2];},0))/2;}
export function validateArea(points){
 if(!Array.isArray(points)||points.length!==4||points.some(p=>!Array.isArray(p)||p.length!==3||!p.every(Number.isFinite)||Math.hypot(p[0],p[2])>600||Math.abs(p[1])>600))return 'Selecciona cuatro puntos válidos dentro del mundo.';
 const q=points.map(p=>[p[0],p[2]]);
 for(let i=0;i<4;i++)for(let j=i+1;j<4;j++)if(Math.hypot(q[i][0]-q[j][0],q[i][1]-q[j][1])<.5)return 'Separa las esquinas al menos medio metro.';
 const intersects=(a,b,c,d)=>cross(a,b,c)*cross(a,b,d)<=0&&cross(c,d,a)*cross(c,d,b)<=0;
 if(intersects(q[0],q[1],q[2],q[3])||intersects(q[1],q[2],q[3],q[0]))return 'El contorno se cruza. Marca las esquinas siguiendo el borde de la base.';
 if(polygonArea(points)<2)return 'El área debe cubrir al menos 2 m².';
 return null;
}
export function pointInArea(points,x,z){let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){
 const a=points[j],b=points[i],dx=b[0]-a[0],dz=b[2]-a[2],len=dx*dx+dz*dz,t=len?Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[2])*dz)/len)):0;
 if(Math.hypot(x-a[0]-t*dx,z-a[2]-t*dz)<.025)return true;
 if((a[2]>z)!==(b[2]>z)&&x<(b[0]-a[0])*(z-a[2])/(b[2]-a[2])+a[0])inside=!inside;
 }return inside;}
export function savedAreas(world){return world.entities.filter(e=>e.id==='zone-delimiter'&&!validateArea(e.params.zone?.points)).map(e=>({uid:e.uid,name:String(e.params.zone.name||'Base sin nombre').slice(0,40),points:e.params.zone.points,entity:e}));}
export function areaLamps(world,area){return area?[...world.lamps].filter(e=>isLamp(e)&&pointInArea(area.points,e.anchor.x,e.anchor.z)):[];}
function hull(points){const sorted=points.sort((a,b)=>a[0]-b[0]||a[1]-b[1]).filter((p,i,a)=>!i||Math.hypot(p[0]-a[i-1][0],p[1]-a[i-1][1])>1e-5);if(sorted.length<3)return [];
 const lower=[],upper=[];for(const p of sorted){while(lower.length>1&&cross(lower.at(-2),lower.at(-1),p)<=1e-6)lower.pop();lower.push(p);}for(const p of sorted.slice().reverse()){while(upper.length>1&&cross(upper.at(-2),upper.at(-1),p)<=1e-6)upper.pop();upper.push(p);}return [...lower.slice(0,-1),...upper.slice(0,-1)];}
function corners(box){return Array.from({length:8},(_,i)=>{const p=box.center.clone();for(let a=0;a<3;a++)p.addScaledVector(box.axes[a],box.half.getComponent(a)*(i&(1<<a)?1:-1));return p;});}
function section(box,y){const p=corners(box),hit=[];for(let i=0;i<8;i++)for(let a=0;a<3;a++){const j=i^(1<<a);if(j<i)continue;const A=p[i],B=p[j];if(Math.abs(A.y-y)<1e-5)hit.push([A.x,A.z]);if((A.y-y)*(B.y-y)<0){const t=(y-A.y)/(B.y-A.y);hit.push([A.x+(B.x-A.x)*t,A.z+(B.z-A.z)*t]);}}return hull(hit);}
export function planGeometry(world,area,level){const shapes=[],xs=area.points.map(p=>p[0]),zs=area.points.map(p=>p[2]),loX=Math.min(...xs),hiX=Math.max(...xs),loZ=Math.min(...zs),hiZ=Math.max(...zs),cut=level+1;
 for(const e of world.entities){const k=e.item.kind,b=e.bounds;if(k==='roof'||b.max.x<loX||b.min.x>hiX||b.max.z<loZ||b.min.z>hiZ||b.max.y<level-.3||b.min.y>level+3.3)continue;
  const structure=e.item.category==='Construcción',ground=['floor','foundation','platform'].includes(k),door=k==='door'||e.id==='airlock-module';
  for(const box of e.colliders){if(box.bounds.max.y<level-.3||box.bounds.min.y>cut+.01)continue;let poly=section(box,cut),layer=structure?'wall':'furniture';
   if(poly.length<3&&box.bounds.max.y<=cut&&box.bounds.max.y>=level-.3){poly=hull(corners(box).map(p=>[p.x,p.z]));layer=ground||k==='module'&&box.half.y<.20?'floor':'furniture';}
   if(poly.length>2)shapes.push({poly,layer:door&&layer==='wall'?'door':layer});
  }
 }
 return shapes.sort((a,b)=>['floor','furniture','wall','door'].indexOf(a.layer)-['floor','furniture','wall','door'].indexOf(b.layer));
}
