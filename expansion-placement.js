import * as T from './three.module.js?v=4.0.0';
import {rayBox} from './spatial.js?v=4.1.2';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
// Test the four feet against the actual shelf collider, not its whole AABB.
export function smallPlacement(world,item,hit,position,rot,params,magnet){
 if(item.surface==='ceiling')return null;
 if(hit.normal.y<.65)return 'Apunta a una superficie horizontal de apoyo.';
 if(Math.abs(Math.sin(rot.x))>.01||Math.abs(Math.sin(rot.z))>.01)return 'Coloca este objeto de pie sobre su base.';
 if(magnet){position.x=Math.round(position.x*40)/40;position.z=Math.round(position.z*40)/40;}
 position.y=hit.point.y+.006;const [w,d]=item.base||[item.size[0],item.size[2]],up=.04,down=V(0,-1,0);
 for(const x of[-w*.44,w*.44])for(const z of[-d*.44,d*.44]){const q=V(x+(item.baseOffset?.[0]||0),0,z+(item.baseOffset?.[1]||0)).applyEuler(rot).add(position);if(hit.entity){const start=q.clone();start.y+=up;const hits=hit.entity.colliders.map(b=>rayBox(start,down,b,up+.028)).filter(v=>v!==null&&v>.001);if(!hits.length)return 'La base necesita apoyo completo; acércala al centro de la repisa.';}else if(Math.abs(world.ground(q.x,q.z)-hit.point.y)>.035)return 'Busca una superficie nivelada para este objeto pequeño.';}
 if(hit.entity)params.supportUid=hit.entity.uid;return null;
}
export function covered(world,position){const origin=position.clone().add(V(0,.05,0)),up=V(0,1,0);return world.entities.some(e=>e.colliders.some(b=>{const t=rayBox(origin,up,b,8);return t!==null&&t>.07;}));}

// A frame must have a real wall behind all four corners, not just its centre.
export function wallPlacement(item,hit,position,rot,params){
 if(!hit.entity)return 'El cuadro necesita una pared.';
 const face=V(0,0,1).applyEuler(rot),inward=face.clone().negate();if(face.dot(hit.normal)<.95)return 'Orienta la parte trasera del cuadro hacia la pared.';
 for(const x of[-item.size[0]*.44,item.size[0]*.44])for(const y of[item.size[1]*.06,item.size[1]*.94]){
  const start=V(x,y,.03).applyEuler(rot).add(position);
  if(!hit.entity.colliders.some(b=>{const t=rayBox(start,inward,b,.095);return t!==null&&t>=0;}))return 'El marco necesita una pared continua detrás de sus cuatro esquinas.';
 }
 params.supportUid=hit.entity.uid;return null;
}
