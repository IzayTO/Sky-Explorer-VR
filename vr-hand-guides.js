import * as THREE from './three.module.js?v=4.0.0';
import {canvasMesh} from './vr-ui.js';
import {UI,round,wrap} from './vr-art.js';
// Labels remain around each physical grip. Their anchors update each frame;
// their single canvas texture changes only on a different context/message.
export class HandGuide{
 constructor(side){Object.assign(this,canvasMesh(800,700,.245,.214375));this.side=side;this.key='';this.mesh.name='Ayudas contextuales · '+side;this.mesh.renderOrder=19900;this.mesh.visible=false;this.offset=new THREE.Vector3();if(side==='right'){this.readout=canvasMesh(256,72,.085,.02390625);this.readout.mesh.position.set(.083,-.096,.002);this.readout.mesh.renderOrder=19901;this.readout.mesh.visible=false;this.mesh.add(this.readout.mesh);}this.distanceAt=-Infinity;this.distanceText='';}
 pose(hand,camera,visible=true){this.mesh.visible=visible&&hand.tracked&&!hand.bare&&hand.grip.visible;if(!this.mesh.visible)return;hand.grip.getWorldPosition(this.mesh.position);this.mesh.lookAt(camera.position);this.offset.set(this.side==='left'?-.05:.025,.085,0).applyQuaternion(this.mesh.quaternion);this.mesh.position.add(this.offset);}
 content(rows,message=''){const key=JSON.stringify([rows,message]);if(key===this.key)return;this.key=key;const c=this.ctx;c.clearRect(0,0,800,700);for(let i=0;i<rows.length&&i<6;i++){const x=i%2?412:8,y=28+Math.floor(i/2)*101,w=380,h=80,[button,label]=rows[i];c.strokeStyle='#72bdc86e';c.lineWidth=1;c.beginPath();c.moveTo(x+(i%2?20:w-20),y+h);c.lineTo(390+(i%2?28:-28),535+(button==='LAT'?22:0));c.stroke();round(c,x,y,w,h,17);c.fillStyle='#102a32d4';c.fill();c.strokeStyle='#72bdc888';c.stroke();c.beginPath();c.arc(x+34,y+40,21,0,Math.PI*2);c.fillStyle='#26424b';c.fill();c.fillStyle=UI.gold;c.font=(button.length>1?'14':'22')+'px system-ui';c.textAlign='center';c.fillText(button,x+34,y+47);c.textAlign='left';c.font='22px system-ui';c.fillStyle=UI.ink;const text=wrap(c,label,w-84);text.slice(0,2).forEach((line,j)=>c.fillText(line,x+72,y+(text.length>1?29:47)+j*24));}
 if(message){c.font='20px system-ui';const text=wrap(c,message,734).slice(0,3);round(c,17,545,766,text.length*27+24,20);c.fillStyle='#102a32d0';c.fill();c.fillStyle=UI.gold;text.forEach((line,i)=>c.fillText(line,32,574+i*27));}this.texture.needsUpdate=true;}
 // A separate small atlas avoids re-uploading all help labels for a distance.
 // Sample actual ray distances at 10 Hz; unchanged centimetres upload nothing.
 distance(metres,time,visible){if(!this.readout)return;const valid=visible&&Number.isFinite(metres)&&metres>=0;this.readout.mesh.visible=valid;if(!valid){this.distanceAt=-Infinity;return;}if(time-this.distanceAt<.1)return;this.distanceAt=time;const text=metres.toFixed(2)+' m';if(text===this.distanceText)return;this.distanceText=text;const c=this.readout.ctx;c.clearRect(0,0,256,72);round(c,2,2,252,68,20);c.fillStyle='#102a32d4';c.fill();c.strokeStyle=UI.cyan;c.lineWidth=1;c.stroke();c.font='32px system-ui';c.textAlign='center';c.fillStyle=UI.ink;c.fillText(text,128,47);this.readout.texture.needsUpdate=true;}

}
export function matteSkin(geometry){const n=geometry.attributes.normal,colors=new Float32Array(n.count*3);for(let i=0;i<n.count;i++){const shade=.65+.30*Math.max(0,n.getX(i)*.25+n.getY(i)*.65+n.getZ(i)*.72);colors[i*3]=colors[i*3+1]=colors[i*3+2]=shade;}geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));return new THREE.MeshBasicMaterial({color:0xc39b80,vertexColors:true,toneMapped:false});}
// Lightweight, articulated silhouette instead of a single capsule. All parts
// are merged into ONE draw per hand. They are controller proxies, not inferred
// finger tracking; actual hand joints remain available for optional driving.
export function makeHandModel(side){const positions=[],normals=[],colors=[],sign=side==='left'?-1:1;
 const add=(g,position,scale,rotation)=>{let geometry=g.index?g.toNonIndexed():g;const m=new THREE.Matrix4().compose(new THREE.Vector3(...position),new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),new THREE.Vector3(...scale));geometry.applyMatrix4(m);const n=geometry.attributes.normal,p=geometry.attributes.position;for(let i=0;i<p.count;i++){positions.push(p.getX(i),p.getY(i),p.getZ(i));normals.push(n.getX(i),n.getY(i),n.getZ(i));const v=.68+.25*Math.max(0,n.getY(i)*.7+n.getZ(i)*.6);colors.push(v,v,v);}geometry.dispose();if(geometry!==g)g.dispose();};
 // Grip space: -Z points forward, +Y is the top of the controller.
 // Palm faces inward, knuckles curl around the front; wrist continues back.
 // Both hands mirror around X, without rotating the tracking/ray spaces.
 add(new THREE.SphereGeometry(1,12,9),[.014*sign,-.009,.008],[.022,.048,.033],[.12,0,-.08*sign]);
 for(let i=0;i<4;i++){
  const y=.027-i*.018,r=i===3?.008:.0095,z=-.025+(i===3?.005:0);
  add(new THREE.CapsuleGeometry(r,.022,4,8),[.005*sign,y,z],[1,1,1],[0,0,Math.PI/2]);
  add(new THREE.CapsuleGeometry(r*.9,.014,4,8),[-.015*sign,y-.003,z+.014],[1,1,1],[Math.PI/2,.22*sign,0]);
 }
 add(new THREE.CapsuleGeometry(.012,.025,4,8),[-.012*sign,.028,.023],[1,1,1],[.8,0,-.38*sign]);
 add(new THREE.CapsuleGeometry(.010,.018,4,8),[-.019*sign,.040,.001],[1,1,1],[1.25,.25*sign,0]);
 add(new THREE.SphereGeometry(1,10,8),[.012*sign,-.036,.037],[.024,.034,.035],[.48,0,0]);
 add(new THREE.CapsuleGeometry(.022,.027,4,8),[.010*sign,-.044,.059],[1,1,1],[1.28,0,0]);
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));const mesh=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:0xc39b80,vertexColors:true,toneMapped:false}));mesh.layers.set(4);mesh.name='Mano '+side;return mesh;}
