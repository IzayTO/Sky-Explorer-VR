import * as THREE from './three.module.js?v=4.0.0';
import {canvasMesh} from './vr-ui.js';
const V=()=>new THREE.Vector3();
// Magnification is confined to a binocular-style ocular; the headset's
// projection/IPD is never changed. Ordinary head motion always remains 1:1.
export class VROptics{
 constructor(vr){this.vr=vr;this.scopeCamera=new THREE.PerspectiveCamera(20,1,.04,18000);this.scopeCamera.layers.enable(3);this.target=null;this.time=0;
 this.root=new THREE.Group();this.root.name='Óptica VR';
 const g=new THREE.CircleGeometry(.27,64),m=new THREE.ShaderMaterial({uniforms:{picture:{value:null},filterMode:{value:0}},transparent:true,depthTest:false,depthWrite:false,toneMapped:false,vertexShader:'varying vec2 vUV;void main(){vUV=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec2 vUV;uniform sampler2D picture;uniform float filterMode;
 void main(){vec3 c=texture2D(picture,vUV).rgb;float l=dot(c,vec3(.2126,.7152,.0722));if(filterMode>.5&&filterMode<1.5)c=vec3(l*1.45,l*.58,l*.21);else if(filterMode<2.5&&filterMode>1.5)c=vec3(l*.75,l*.32,l*1.4);else if(filterMode<3.5&&filterMode>2.5)c=vec3(l*.35,l*1.15,l*.8);else if(filterMode>3.5)c=vec3(l*.9,l*1.05,l*1.5);float a=1.-smoothstep(.48,.5,length(vUV-.5));gl_FragColor=vec4(c,a);}`});
 this.lens=new THREE.Mesh(g,m);this.lens.layers.set(4);this.lens.renderOrder=19001;this.root.add(this.lens);
 this.rim=new THREE.Mesh(new THREE.TorusGeometry(.278,.012,8,64),new THREE.MeshBasicMaterial({color:0xdac59e,depthTest:false,depthWrite:false,toneMapped:false}));this.rim.layers.set(4);this.rim.renderOrder=19002;this.root.add(this.rim);this.root.visible=false;
 this.labels=Array.from({length:8},()=>{const p=canvasMesh(600,150,2.7,.675);p.mesh.material.depthTest=true;p.mesh.visible=false;return p;});this.labelRoot=new THREE.Group();for(const p of this.labels)this.labelRoot.add(p.mesh);this.lastLabels=-1;this.p=V();this.dir=V();this.quaternion=new THREE.Quaternion();this.photoPixels=new Uint8Array(300*180*4);
 }
 attach(scene){scene.add(this.root,this.labelRoot);}
 detach(){this.root.removeFromParent();this.labelRoot.removeFromParent();}
 aim(){const v=this.vr,s=v.api.state,c=this.scopeCamera;c.position.copy(v.aimCamera.position);c.quaternion.copy(v.aimCamera.quaternion);const fov=(s.mountedScope?[44,6,1,.1]:s.destination==='moon'?[44,14,4,1.05]:[44,20,8,4.1])[s.zoom];if(c.fov!==fov){c.fov=fov;c.updateProjectionMatrix();}c.updateMatrixWorld();return c;}
 update(dt,time){const v=this.vr,{state,camera,expedition:x}=v.api;this.root.visible=state.scope&&!v.menu.open;
 if(this.root.visible){this.root.position.set(0,-.04,-.72).applyQuaternion(camera.quaternion).add(camera.position);this.root.quaternion.copy(camera.quaternion);}
 this.labelRoot.visible=!state.scope&&!v.menu.open&&x.inventory.hand?.id==='visor'&&x.visorOn;
 if(this.labelRoot.visible&&time-this.lastLabels>.25){this.lastLabels=time;camera.getWorldDirection(this.dir);let i=0;for(const target of x.env.celestial.visibleTargets(state)){if(i===8)break;if(target.direction.dot(this.dir)<.55||x.env.world.raycast(camera.position,target.direction,700))continue;const label=this.labels[i++];label.mesh.visible=true;label.mesh.position.copy(target.direction).multiplyScalar(12).add(camera.position);label.mesh.position.y+=.45;label.mesh.quaternion.copy(camera.quaternion);const distance=Number.isFinite(target.distanceKm)?Math.round(target.distanceKm).toLocaleString('es')+' km':'Distancia no disponible';const text=target.name+'|'+distance+'|'+(target.temperature?'≈ '+Math.round(target.temperature)+' K':target.description||'');if(label.key!==text){label.key=text;const c=label.ctx;c.clearRect(0,0,600,150);c.fillStyle='#102d36e8';c.beginPath();c.roundRect(1,1,598,148,20);c.fill();c.fillStyle='#a2dec8';c.font='32px system-ui';c.fillText(target.name,18,40);c.font='24px system-ui';c.fillStyle='#e7e9df';c.fillText(distance,18,80);c.fillText(text.split('|')[2].slice(0,40),18,118);label.texture.needsUpdate=true;}}for(;i<8;i++)this.labels[i].mesh.visible=false;}
 this.time+=dt;
 }
 render(){if(!this.root.visible||this.time<1/36)return;this.time=0;const v=this.vr,r=v.api.renderer;if(!this.target){this.target=new THREE.WebGLRenderTarget(768,768,{depthBuffer:true});this.target.texture.generateMipmaps=false;this.lens.material.uniforms.picture.value=this.target.texture;}
 this.lens.material.uniforms.filterMode.value=Math.max(0,['visible','infrared','ultraviolet','radio','xray','gamma'].indexOf(v.api.expedition.science.filter));
 this.offscreen(this.scopeCamera,this.target);v.api.getEnv().terrain.cullGrass?.(v.api.camera);
 }
 offscreen(camera,target){const r=this.vr.api.renderer,old=r.getRenderTarget(),enabled=r.xr.enabled,auto=r.autoClear;try{r.xr.enabled=false;r.autoClear=true;r.setRenderTarget(target);this.vr.api.getEnv().terrain.cullGrass?.(camera);r.render(this.vr.api.getEnv().scene,camera);}finally{r.setRenderTarget(old);r.autoClear=auto;r.xr.enabled=enabled;}}
 capture(){const r=this.vr.api.renderer,camera=this.vr.api.state.scope?this.scopeCamera:this.vr.api.camera;this.photoTarget ||= new THREE.WebGLRenderTarget(300,180);const oldMask=camera.layers.mask;camera.layers.disable(4);try{this.offscreen(camera,this.photoTarget);r.readRenderTargetPixels(this.photoTarget,0,0,300,180,this.photoPixels);const canvas=document.createElement('canvas');canvas.width=300;canvas.height=180;const ctx=canvas.getContext('2d'),image=ctx.createImageData(300,180);for(let y=0;y<180;y++)image.data.set(this.photoPixels.subarray((179-y)*1200,(180-y)*1200),y*1200);ctx.putImageData(image,0,0);return canvas.toDataURL('image/jpeg',.7);}catch(error){console.warn('[VR] Foto no disponible',error);this.vr.api.toast('No se pudo guardar la imagen; sí el registro.');return null;}finally{camera.layers.mask=oldMask;this.vr.api.getEnv().terrain.cullGrass?.(this.vr.api.camera);}}
 release(){this.target?.dispose();this.target=null;this.photoTarget?.dispose();this.photoTarget=null;}
}
