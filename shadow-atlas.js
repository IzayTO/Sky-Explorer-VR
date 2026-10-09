import * as THREE from './three.module.js?v=4.0.0';

// Static construction shadows are rasterized once and sampled thereafter.
// 4 directional views + 4 x 6 point faces + 3 vehicle spots share one 2048²
// atlas. No per-frame geometry rebuild and no extra main-scene light passes.
const SIZE=2048,CELL=256,V=()=>new THREE.Vector3();
const DIRECTIONS=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
const UPS=[[0,-1,0],[0,-1,0],[0,0,1],[0,0,-1],[0,-1,0],[0,-1,0]];
let emptyAtlas;
export function shadowUniforms(){
 // Keep the fallback in the same RGBA8 sample class as the real atlas. A
 // float BVH texture would invalidate WebGPU bind groups after world changes.
 if(!emptyAtlas){emptyAtlas=new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1,THREE.RGBAFormat);emptyAtlas.minFilter=emptyAtlas.magFilter=THREE.NearestFilter;emptyAtlas.generateMipmaps=false;emptyAtlas.needsUpdate=true;}
 return {
 baseShadowAtlas:{value:emptyAtlas},baseShadowReady:{value:0},
 baseShadowMatrices:{value:Array.from({length:32},()=>new THREE.Matrix4())},
 baseShadowRects:{value:Array.from({length:32},()=>new THREE.Vector4())},
 baseShadowOrigins:{value:Array.from({length:32},()=>new THREE.Vector4())},
 baseShadowDirections:{value:Array.from({length:4},()=>new THREE.Vector3())},
 baseShadowValid:{value:Array(32).fill(0)}
};}
export class ConstructionShadows{
 constructor(u){
  this.u=u;this.empty=u.baseShadowAtlas.value;this.revision=-1;this.scene=new THREE.Scene();this.target=null;
  this.viewport=new THREE.Vector4();this.scissor=new THREE.Vector4();this.clearColor=new THREE.Color();
  this.point=V();this.center=V();this.direction=V();this.matrix=new THREE.Matrix4();
  this.views=Array.from({length:32},(_,i)=>({camera:i<4?new THREE.OrthographicCamera():new THREE.PerspectiveCamera(90,1,.015,128),position:V().setScalar(Infinity),direction:V(),revision:-1,emitter:null,updated:-Infinity}));
  this.casterU={shadowOrigin:{value:V()},shadowForward:{value:V()},shadowRange:{value:1},shadowRadial:{value:0}};
  this.material=new THREE.ShaderMaterial({uniforms:this.casterU,side:THREE.BackSide,toneMapped:false,
   vertexShader:'varying vec3 casterWorld;void main(){casterWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(casterWorld,1.);}',
   fragmentShader:`varying vec3 casterWorld;uniform vec3 shadowOrigin,shadowForward;uniform float shadowRange,shadowRadial;
    void main(){vec3 delta=casterWorld-shadowOrigin;float d=mix(dot(delta,shadowForward),length(delta),shadowRadial)/shadowRange;d=clamp(d,0.,.999999);vec3 enc=fract(d*vec3(1.,255.,65025.));enc-=enc.yzz*vec3(1./255.,1./255.,0.);gl_FragColor=vec4(enc,1.);}`});
  // WebGPU loadOp clears the entire attachment, ignoring a tile scissor.
  // Clear each tile with a far-depth triangle in the same render pass instead.
  const clearGeometry=new THREE.BufferGeometry();clearGeometry.setAttribute('position',new THREE.Float32BufferAttribute([-1,-1,0,3,-1,0,-1,3,0],3));
  this.clearMesh=new THREE.Mesh(clearGeometry,new THREE.ShaderMaterial({depthTest:true,depthWrite:true,depthFunc:THREE.AlwaysDepth,toneMapped:false,vertexShader:'void main(){gl_Position=vec4(position.xy,1.,1.);}',fragmentShader:'void main(){gl_FragColor=vec4(1.);}'}));
  this.clearMesh.frustumCulled=false;this.clearMesh.renderOrder=-100;this.scene.add(this.clearMesh);
  this.renders=0;this.rebuilds=0;
 }
 rebuild(world){
  for(const mesh of [...this.scene.children])if(mesh!==this.clearMesh){this.scene.remove(mesh);mesh.geometry.dispose();}
  const merged=[],point=this.point;
  const append=(entity,out)=>{
   const g=entity.mesh.geometry,pos=g.attributes.position,emission=g.attributes.emission,index=g.index;
   const count=index?.count||pos.count;
   for(let i=0;i<count;i+=3){const a=index?index.getX(i):i;if(emission&&emission.getX(a)>0)continue;
    for(let j=0;j<3;j++){point.fromBufferAttribute(pos,index?index.getX(i+j):i+j).applyMatrix4(entity.mesh.matrixWorld);out.push(point.x,point.y,point.z);}}
  };
  const meshFor=(positions,entity=null)=>{if(!positions.length)return;const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.computeBoundingSphere();const mesh=new THREE.Mesh(g,this.material);mesh.userData.emitter=entity;mesh.matrixAutoUpdate=false;mesh.updateMatrixWorld();mesh.matrixWorldAutoUpdate=false;this.scene.add(mesh);};
  for(const entity of world.entities){if(entity.item.category==='Iluminación'){const positions=[];append(entity,positions);meshFor(positions,entity);}else append(entity,merged);}
  meshFor(merged);this.revision=world.spatialRevision;this.rebuilds++;
 }
 ensureTarget(){if(this.target)return;
  this.target=new THREE.WebGLRenderTarget(SIZE,SIZE,{minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,depthBuffer:true,stencilBuffer:false});
  this.target.texture.generateMipmaps=false;this.target.texture.name='Construction shadow atlas';
  this.u.baseShadowAtlas.value=this.target.texture;
 }
 tile(index){if(index<4)return [(index%4)*2,0,2];if(index<28){const n=index-4;return[n%8,2+Math.floor(n/8),1];}return[(index-28)*2,5,2];}
 renderView(renderer,index,position,direction,span,far,emitter=null,radial=false,up=null){
  const view=this.views[index],camera=view.camera;
  this.u.baseShadowValid.value[index]=1;
  // A sub-texel celestial movement does not require four attachment passes.
  const positionTolerance=index<4?.04:1e-10,directionTolerance=index<4?2.5e-8:1e-12;
  const now=performance.now(),same=view.revision===this.revision&&view.emitter===emitter;
  if(same&&position.distanceToSquared(view.position)<positionTolerance&&direction.distanceToSquared(view.direction)<directionTolerance)return;
  // Celestial motion is slow: reuse sub-degree shadows between 12 Hz bakes.
  // Edits, time jumps and moving headlights still invalidate immediately.
  if(index<4&&same&&now-view.updated<80&&direction.distanceToSquared(view.direction)<.0001&&position.distanceToSquared(view.position)<4)return;
  camera.coordinateSystem=renderer.isWebGPURenderer?THREE.WebGPUCoordinateSystem:THREE.WebGLCoordinateSystem;
  camera.near=.015;camera.far=far;
  if(index<4){camera.left=camera.bottom=-span/2;camera.right=camera.top=span/2;}
  else camera.fov=span;
  camera.position.copy(position);camera.up.set(...(up||[0,1,0]));
  if(!up&&Math.abs(direction.y)>.999)camera.up.set(0,0,1);
  this.point.copy(position).add(direction);camera.lookAt(this.point);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
  this.u.baseShadowMatrices.value[index].multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
  this.u.baseShadowOrigins.value[index].set(position.x,position.y,position.z,far);
  if(index<4)this.u.baseShadowDirections.value[index].copy(direction);
  const [x,y,cells]=this.tile(index),px=x*CELL,py=y*CELL,size=cells*CELL;
  this.u.baseShadowRects.value[index].set((px+1)/SIZE,(py+1)/SIZE,(size-2)/SIZE,(size-2)/SIZE);
  this.casterU.shadowOrigin.value.copy(position);this.casterU.shadowForward.value.copy(direction);this.casterU.shadowRange.value=far;this.casterU.shadowRadial.value=radial?1:0;
  for(const mesh of this.scene.children)mesh.visible=mesh===this.clearMesh||mesh.userData.emitter!==emitter||!emitter;
  // Offscreen viewports are physical pixels. WebGPU reads the render target's
  // viewport; WebGL setViewport() would otherwise multiply by canvas DPR.
  const viewportY=renderer.isWebGPURenderer?SIZE-py-size+1:py+1;
  this.target.viewport.set(px+1,viewportY,size-2,size-2);this.target.scissor.copy(this.target.viewport);this.target.scissorTest=true;
  renderer.setRenderTarget(this.target);renderer.render(this.scene,camera);
  view.position.copy(position);view.direction.copy(direction);view.revision=this.revision;view.emitter=emitter;view.updated=now;this.renders++;
 }
 prepare(renderer,world,camera){
  if(!world.entities.length){if(this.target)this.release();this.u.baseShadowReady.value=0;return;}
  if(this.revision!==world.spatialRevision)this.rebuild(world);
  this.ensureTarget();const target=renderer.getRenderTarget(),scissorTest=renderer.getScissorTest(),auto=renderer.autoClear,alpha=renderer.getClearAlpha();
  renderer.getViewport(this.viewport);renderer.getScissor(this.scissor);renderer.getClearColor(this.clearColor);
  const u=world.material.uniforms,active=this.u.baseShadowValid.value;active.fill(0);
  const xrEnabled=renderer.xr?.enabled;if(renderer.xr)renderer.xr.enabled=false;
  try{
   renderer.setRenderTarget(this.target);renderer.setScissorTest(true);renderer.autoClear=false;renderer.setClearColor(0xffffff,1);
   for(let light=0;light<2;light++){
    const dir=light?u.earth.value:u.sun.value;if(light?u.earthPower.value<.0001:dir.y<=0)continue;
    this.direction.copy(dir).negate();
    for(let cascade=0;cascade<2;cascade++){
     const step=cascade?24:4,span=cascade?160:24;
     this.center.set(Math.floor(camera.position.x/step)*step,Math.floor(camera.position.y/step)*step,Math.floor(camera.position.z/step)*step).addScaledVector(dir,1024);
     this.renderView(renderer,light*2+cascade,this.center,this.direction,span,2048);
    }
   }
   for(let i=0;i<world.lights.selected.length;i++){
    const entity=world.lights.selected[i];
    for(let face=0;face<6;face++){this.direction.set(...DIRECTIONS[face]);this.renderView(renderer,4+i*6+face,entity.anchor,this.direction,90,12,entity,true,UPS[face]);}
   }
   // The flashlight is exactly at the camera: the depth buffer has already
   // rejected surfaces behind walls. Re-tracing that same ray is redundant.
   if(u.lampMode.value>.001){this.renderView(renderer,29,u.lampLeft.value,u.lampDirection.value,82,126,null,true);this.renderView(renderer,30,u.lampRight.value,u.lampDirection.value,82,126,null,true);}
   if(u.reverseLight.value>.001)this.renderView(renderer,31,u.rearLamp.value,u.rearDirection.value,146,14,null,true);
   this.u.baseShadowReady.value=1;
  }finally{
   renderer.setRenderTarget(target);renderer.setViewport(this.viewport);renderer.setScissor(this.scissor);renderer.setScissorTest(scissorTest);renderer.setClearColor(this.clearColor,alpha);renderer.autoClear=auto;if(renderer.xr)renderer.xr.enabled=xrEnabled;
  }
 }
 release(){this.target?.dispose();this.target=null;this.u.baseShadowAtlas.value=this.empty;this.u.baseShadowReady.value=0;for(const view of this.views)view.revision=-1;}
}
