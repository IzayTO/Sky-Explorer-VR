import * as THREE from './three.module.js?v=4.0.0';
import {canvasMesh} from './vr-ui.js';
import {UI,round,wrap} from './vr-art.js';
// Labels remain around each physical grip. Their anchors update each frame;
// their single canvas texture changes only on a different context/message.
export class HandGuide{
 constructor(side){Object.assign(this,canvasMesh(800,700,.29,.254));this.side=side;this.key='';this.mesh.name='Ayudas contextuales · '+side;this.mesh.renderOrder=19900;this.mesh.visible=false;this.offset=new THREE.Vector3();}
 pose(hand,camera,visible=true){this.mesh.visible=visible&&hand.tracked&&!hand.bare&&hand.grip.visible;if(!this.mesh.visible)return;hand.grip.getWorldPosition(this.mesh.position);this.mesh.lookAt(camera.position);this.offset.set(this.side==='left'?-.026:.026,.105,0).applyQuaternion(this.mesh.quaternion);this.mesh.position.add(this.offset);}
 content(rows,message=''){const key=JSON.stringify([rows,message]);if(key===this.key)return;this.key=key;const c=this.ctx;c.clearRect(0,0,800,700);for(let i=0;i<rows.length&&i<6;i++){const x=i%2?412:8,y=12+Math.floor(i/2)*112,w=380,h=91,[button,label]=rows[i];c.strokeStyle='#72bdc86e';c.lineWidth=1.2;c.beginPath();c.moveTo(x+(i%2?20:w-20),y+h);c.lineTo(390+(i%2?28:-28),460+(button==='LAT'?32:0));c.stroke();round(c,x,y,w,h,22);c.fillStyle='#102a32d4';c.fill();c.strokeStyle='#72bdc888';c.stroke();c.beginPath();c.arc(x+34,y+45,23,0,Math.PI*2);c.fillStyle='#26424b';c.fill();c.fillStyle=UI.gold;c.font=(button.length>1?'15':'24')+'px system-ui';c.textAlign='center';c.fillText(button,x+34,y+52);c.textAlign='left';c.font='23px system-ui';c.fillStyle=UI.ink;const text=wrap(c,label,w-84);text.slice(0,2).forEach((line,j)=>c.fillText(line,x+72,y+(text.length>1?36:52)+j*26));}
 if(message){c.font='21px system-ui';const text=wrap(c,message,734).slice(0,3);round(c,17,545,766,text.length*27+24,20);c.fillStyle='#102a32d0';c.fill();c.fillStyle=UI.gold;text.forEach((line,i)=>c.fillText(line,32,574+i*27));}this.texture.needsUpdate=true;}
}
export function matteSkin(geometry){const n=geometry.attributes.normal,colors=new Float32Array(n.count*3);for(let i=0;i<n.count;i++){const shade=.65+.30*Math.max(0,n.getX(i)*.25+n.getY(i)*.65+n.getZ(i)*.72);colors[i*3]=colors[i*3+1]=colors[i*3+2]=shade;}geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));return new THREE.MeshBasicMaterial({color:0xc39b80,vertexColors:true,toneMapped:false});}
// Lightweight, articulated silhouette instead of a single capsule. All parts
// are merged into ONE draw per hand. They are controller proxies, not inferred
// finger tracking; actual hand joints remain available for optional driving.
export function makeHandModel(side){const positions=[],normals=[],colors=[],sign=side==='left'?-1:1;
 const add=(g,position,scale,rotation)=>{let geometry=g.index?g.toNonIndexed():g;const m=new THREE.Matrix4().compose(new THREE.Vector3(...position),new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),new THREE.Vector3(...scale));geometry.applyMatrix4(m);const n=geometry.attributes.normal,p=geometry.attributes.position;for(let i=0;i<p.count;i++){positions.push(p.getX(i),p.getY(i),p.getZ(i));normals.push(n.getX(i),n.getY(i),n.getZ(i));const v=.68+.25*Math.max(0,n.getY(i)*.7+n.getZ(i)*.6);colors.push(v,v,v);}geometry.dispose();if(geometry!==g)g.dispose();};
 add(new THREE.SphereGeometry(1,10,8),[0,-.012,.012],[.039,.051,.024],[.12,0,.12*sign]);
 add(new THREE.CapsuleGeometry(.012,.042,3,7),[.038*sign,-.007,-.012],[1,1,1],[.65,0,-.6*sign]);
 for(let i=0;i<4;i++)add(new THREE.CapsuleGeometry(.0085,.025+(i===1?.009:0),3,7),[(-.027+i*.018)*sign,.018,-.020],[1,1,1],[1.17,.09,0]);
 add(new THREE.CapsuleGeometry(.025,.036,3,8),[0,-.047,.04],[1,1,.9],[.85,0,0]);const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));const mesh=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:0xc39b80,vertexColors:true,toneMapped:false}));mesh.layers.set(4);mesh.name='Mano '+side;return mesh;}
