import * as THREE from './three.module.js?v=4.0.0';
import {canvasMesh} from './vr-ui.js';

const W=768,H=640;
const positions=[[214,34,340],[8,181,326],[434,181,326],[8,326,326],[434,326,326]];
function round(c,x,y,w,h,r){c.beginPath();c.roundRect(x,y,w,h,r);}
function wrap(c,text,width,max=2){
 const lines=[];let line='';
 for(const word of String(text).split(/\s+/)){const next=line?line+' '+word:word;if(line&&c.measureText(next).width>width){lines.push(line);line=word;}else line=next;}
 if(line)lines.push(line);if(lines.length>max)lines[max-1]=lines[max-1].replace(/\s+\S*$/,'')+'…';return lines.slice(0,max);
}

// One transparent texture per hand. Tracking transforms are updated every XR
// frame; textures upload only when the context or message actually changes.
export class HandGuide{
 constructor(side){
  Object.assign(this,canvasMesh(W,H,.36,.30));this.side=side;this.key='';
  this.mesh.name='Ayudas · mano '+side;this.mesh.renderOrder=19900;this.mesh.visible=false;
 }
 pose(hand,camera,visible=true){
  this.mesh.visible=visible&&hand.tracked&&!hand.bare&&hand.grip.visible;
  if(!this.mesh.visible)return;
  hand.grip.getWorldPosition(this.mesh.position);
  // Keep labels readable from the user's viewpoint without following the head
  // across the room. The centre of the empty ring stays at the tracked hand.
  this.mesh.lookAt(camera.position);
 }
 content(rows,message=''){
  const key=JSON.stringify([rows,message]);if(key===this.key)return;this.key=key;
  const c=this.ctx;c.clearRect(0,0,W,H);c.lineWidth=2;
  for(let i=0;i<rows.length&&i<5;i++){
   const [x,y,w]=positions[i],[button,label]=rows[i],h=84;
   // Fine leaders end outside the palm instead of covering the hand model.
   c.strokeStyle='#bfa18c80';c.beginPath();c.moveTo(x+w/2,y+h/2);
   c.lineTo(i===0?384:x<W/2?314:454,i===0?238:292);c.stroke();
   round(c,x,y,w,h,32);c.fillStyle='#10262cdd';c.fill();c.strokeStyle='#a4b7ae99';c.stroke();
   c.beginPath();c.arc(x+39,y+h/2,27,0,Math.PI*2);c.fillStyle='#314942';c.fill();
   c.fillStyle='#eddec6';c.font=(button.length>1?'16':'27')+'px system-ui';c.textAlign='center';c.fillText(button,x+39,y+h/2+(button.length>1?6:9));
   c.textAlign='left';c.font='24px system-ui';c.fillStyle='#eceddf';const lines=wrap(c,label,w-93);
   lines.forEach((line,j)=>c.fillText(line,x+77,y+(lines.length===1?51:34)+j*28));
  }
  if(message){
   c.font='24px system-ui';const lines=wrap(c,message,690,3),height=lines.length*29+24;
   round(c,20,460,728,height,25);c.fillStyle='#10262cda';c.fill();c.strokeStyle='#a4b7ae80';c.stroke();
   c.fillStyle='#e1d1b8';lines.forEach((line,i)=>c.fillText(line,38,491+i*29));
  }
  this.texture.needsUpdate=true;
 }
}

// Baked diffuse shading needs neither a light nor another shadow pass. Skin is
// deliberately muted, with no emissive/specular channel or added light source.
export function matteSkin(geometry){
 const normals=geometry.attributes.normal,colors=new Float32Array(normals.count*3);
 for(let i=0;i<normals.count;i++){
  const shade=.64+.30*Math.max(0,normals.getX(i)*.25+normals.getY(i)*.65+normals.getZ(i)*.72);
  colors[i*3]=colors[i*3+1]=colors[i*3+2]=shade;
 }
 geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
 return new THREE.MeshBasicMaterial({color:0xc39b80,vertexColors:true,toneMapped:false});
}
