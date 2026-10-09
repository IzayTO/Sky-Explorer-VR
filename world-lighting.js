import * as THREE from './three.module.js?v=4.0.0';
import {ConstructionShadows,shadowUniforms} from './shadow-atlas.js?v=4.1.2';
import {orientedBox,rayBox} from './spatial.js?v=4.1.2';
// One persistent, spatially indexed occluder set for the whole base. Camera
// distance never removes a wall. A ray skips complete BVH branches on a miss.
export const worldLightGLSL=`
uniform vec4 baseLights[4],baseColors[4];uniform int baseLightCount,baseNodeCount;
uniform sampler2D baseTree;uniform vec2 baseTreeSize;
uniform sampler2D baseLightGrid,baseLightData;uniform vec2 baseLightDataSize;
vec4 baseNode(float index,float component){float pixel=index*6.+component;return texture2D(baseTree,(vec2(mod(pixel,baseTreeSize.x),floor(pixel/baseTreeSize.x))+.5)/baseTreeSize);}
bool baseSlab(vec3 p,vec3 inverseDir,vec3 lo,vec3 hi,float limit){vec3 a=(lo-p)*inverseDir,b=(hi-p)*inverseDir;vec3 n=min(a,b),f=max(a,b);float enter=max(max(n.x,n.y),n.z),leave=min(min(f.x,f.y),f.z);return leave>max(enter,.004)&&enter<limit;}
vec3 baseInverse(vec3 d){return 1./(mix(vec3(-1.),vec3(1.),step(vec3(0.),d))*max(abs(d),vec3(.000001)));}
bool dishRoot(vec3 p,vec3 d,float t,float radius,float limit){vec2 q=p.xy+d.xy*t;return t>.004&&t<limit&&dot(q,q)<=radius*radius;}
bool dishSurface(vec3 p,vec3 d,float radius,float curve,float depth,float limit){
 float a=curve*dot(d.xy,d.xy),b=d.z+2.*curve*dot(p.xy,d.xy),c=p.z+curve*dot(p.xy,p.xy)-depth;
 bool hit=false;
 if(abs(a)<.0000001){if(abs(b)>=.0000001)hit=dishRoot(p,d,-c/b,radius,limit);}
 else{float h=b*b-4.*a*c;if(h>=0.){float root=sqrt(h);hit=dishRoot(p,d,(-b-root)/(2.*a),radius,limit)||dishRoot(p,d,(-b+root)/(2.*a),radius,limit);}}
 return hit;
}
bool dishHit(vec3 p,vec3 d,vec3 shape,float limit){return dishSurface(p,d,shape.x,shape.y,0.,limit)||dishSurface(p,d,shape.x,shape.y,shape.z,limit);}
float baseVisibility(vec3 p,vec3 dir,float limit){
 if(baseNodeCount==0||limit<=.008)return 1.;vec3 inv=baseInverse(dir);float index=0.;
 for(int visit=0;visit<1024;visit++){
  if(index>=float(baseNodeCount))return 1.;vec4 lo=baseNode(index,0.),hi=baseNode(index,1.);
  if(!baseSlab(p,inv,lo.xyz,hi.xyz,limit)){index=lo.w;continue;}
  if(hi.w<.5){index+=1.;continue;}
  // Axis-aligned leaf: the broad-phase slab is already the exact box.
  if(hi.w<1.5)return 0.;
  vec4 center=baseNode(index,2.),x=baseNode(index,3.),y=baseNode(index,4.);vec3 z=baseNode(index,5.).xyz,delta=p-center.xyz;
  vec3 localP=vec3(dot(delta,x.xyz),dot(delta,y.xyz),dot(delta,z)),localD=vec3(dot(dir,x.xyz),dot(dir,y.xyz),dot(dir,z)),halfSize=vec3(center.w,x.w,y.w);
  bool blocked=false;if(hi.w>2.5)blocked=dishHit(localP,localD,halfSize,limit);
  else blocked=baseSlab(localP,baseInverse(localD),-halfSize,halfSize,limit);
  if(blocked)return 0.;index=lo.w;
 }
 // Conservative termination for unusually dense bases: never let light leak
 // through omitted casters. Normal rays visit only a few spatial branches.
 return 0.;
}

// Four constant-time samples replace a BVH walk over every interior pixel.
// Only actual map silhouette transitions use the exact ray, retaining crisp
// contact/window/door edges. Outside the directional atlas the BVH remains.
uniform sampler2D baseShadowAtlas;uniform float baseShadowReady;
uniform mat4 baseShadowMatrices[32];uniform vec4 baseShadowRects[32],baseShadowOrigins[32];
uniform vec3 baseShadowDirections[4];uniform float baseShadowValid[32];
float unpackBaseDepth(vec2 uv){return dot(texture2D(baseShadowAtlas,uv).rgb,vec3(1.,1./255.,1./65025.));}
float shadowAtSlot(vec3 p,vec3 dir,float limit,int slot){
 if(baseShadowReady<.5||baseShadowValid[slot]<.5)return float(-1.);
 vec4 q=baseShadowMatrices[slot]*vec4(p,1.);vec2 uv=q.xy/max(q.w,.00001)*.5+.5;
 if(q.w<=0.||min(min(uv.x,uv.y),min(1.-uv.x,1.-uv.y))<.012)return float(-1.);
 vec4 origin=baseShadowOrigins[slot];vec3 delta=p-origin.xyz;
 float depth=length(delta)/origin.w;if(slot<4)depth=dot(delta,baseShadowDirections[slot])/origin.w;
 if(depth<0.||depth>=1.)return float(-1.);
 vec4 rect=baseShadowRects[slot];vec2 pixel=(rect.xy+uv*rect.zw)*2048.-.5,corner=(floor(pixel)+.5)/2048.;
 float compare=depth-.002/origin.w;
 float a=step(compare,unpackBaseDepth(corner)),b=step(compare,unpackBaseDepth(corner+vec2(1./2048.,0.)));
 float c=step(compare,unpackBaseDepth(corner+vec2(0.,1./2048.))),d=step(compare,unpackBaseDepth(corner+vec2(1./2048.)));
 if(min(min(a,b),min(c,d))!=max(max(a,b),max(c,d)))return baseVisibility(p,dir,limit);
 return a;
}
float baseDirectionalVisibility(vec3 p,vec3 dir,float channel){
 int slot=int(channel)*2;float visibility=shadowAtSlot(p,dir,2000.,slot);
 if(visibility<0.)visibility=shadowAtSlot(p,dir,2000.,slot+1);
 if(visibility<0.)visibility=baseVisibility(p,dir,2000.);return visibility;
}
int baseCubeFace(vec3 p){vec3 a=abs(p);int face=0;if(a.x>=a.y&&a.x>=a.z)face=p.x>=0.?0:1;else if(a.y>=a.z)face=p.y>=0.?2:3;else face=p.z>=0.?4:5;return face;}
float baseLocalVisibility(vec3 p,vec3 dir,float limit,int slot){if(slot<0)return baseVisibility(p,dir,limit);float visibility=shadowAtSlot(p,dir,limit,slot);if(visibility<0.)visibility=baseVisibility(p,dir,limit);return visibility;}
float basePointVisibility(vec3 p,vec3 normal,vec3 emitter,int slot){
 vec3 delta=emitter-p;float len=length(delta);
 return baseLocalVisibility(p+normal*.012,delta/max(len,.001),len-.055,slot);
}
vec4 readBaseLight(float index){return texture2D(baseLightData,(vec2(mod(index,baseLightDataSize.x),floor(index/baseLightDataSize.x))+.5)/baseLightDataSize);}
vec3 oneBaseLight(vec3 p,vec3 n,vec3 emitter,vec4 color,int cacheSlot){
 vec3 d=emitter-p;float squared=dot(d,d);if(squared>=144.)return vec3(0.);
 float len=sqrt(squared),fall=1.-len/12.;vec3 direction=d/max(len,.001);
 int slot=cacheSlot<0?-1:4+cacheSlot*6+baseCubeFace(-d);
 return color.rgb*color.a*fall*fall*(.18+.82*max(dot(n,direction),0.))*baseLocalVisibility(p+n*.012,direction,len-.10,slot);
}
vec3 baseLighting(vec3 p,vec3 n){
 vec3 light=vec3(0.);if(baseLightCount==0)return light;
 // Small bases keep the original uniform fast path. Larger bases gather only
 // lights intersecting this 8 m cell, independently of the player's position.
 if(baseLightCount<=4){for(int i=0;i<4;i++){if(i>=baseLightCount)break;light+=oneBaseLight(p,n,baseLights[i].xyz,baseColors[i],i);}return light;}
 vec2 cell=floor((p.xz+640.)/8.);if(min(cell.x,cell.y)<0.||max(cell.x,cell.y)>=160.)return light;
 vec2 list=texture2D(baseLightGrid,(cell+.5)/160.).rg;
 int count=int(list.y);for(int j=0;j<count;j++){
  float index=readBaseLight(list.x+float(j)).x;vec4 emitter=readBaseLight(index*2.);
  // Range rejection precedes both the color fetch and the shadow lookup.
  vec3 delta=emitter.xyz-p;if(dot(delta,delta)>=144.)continue;
  light+=oneBaseLight(p,n,emitter.xyz,readBaseLight(index*2.+1.),int(emitter.w));
 }
 return light;
}
`;
let emptyTree;
export function worldUniforms(){
 if(!emptyTree){emptyTree=new THREE.DataTexture(new Float32Array(4),1,1,THREE.RGBAFormat,THREE.FloatType);emptyTree.needsUpdate=true;}
 return {...shadowUniforms(),baseLightGrid:{value:emptyTree},baseLightData:{value:emptyTree},baseLightDataSize:{value:new THREE.Vector2(1,1)},baseLights:{value:Array.from({length:4},()=>new THREE.Vector4())},baseColors:{value:Array.from({length:4},()=>new THREE.Vector4())},baseLightCount:{value:0},baseNodeCount:{value:0},baseTree:{value:emptyTree},baseTreeSize:{value:new THREE.Vector2(1,1)},shadowDetail:{value:1}};
}
export const LAMP_TEMPERATURES=[{label:'Cálida · 2700 K',color:0xffc38c},{label:'Neutra · 4000 K',color:0xffe6cc},{label:'Fría · 6500 K',color:0xd4e6ff}];
function boundsHit(origin,dir,b,limit){let near=0,far=limit;for(let i=0;i<3;i++){
 const axis=i===0?'x':i===1?'y':'z';if(Math.abs(dir[axis])<1e-8){if(origin[axis]<b.min[axis]||origin[axis]>b.max[axis])return false;continue;}
 const a=(b.min[axis]-origin[axis])/dir[axis],c=(b.max[axis]-origin[axis])/dir[axis];near=Math.max(near,Math.min(a,c));far=Math.min(far,Math.max(a,c));if(near>far)return false;
}return far>.004;}
function dishBlocked(origin,direction,box,limit){
 const {center,axes,shape}=box,dx=origin.x-center.x,dy=origin.y-center.y,dz=origin.z-center.z;
 const px=dx*axes[0].x+dy*axes[0].y+dz*axes[0].z,py=dx*axes[1].x+dy*axes[1].y+dz*axes[1].z,pz=dx*axes[2].x+dy*axes[2].y+dz*axes[2].z;
 const vx=direction.dot(axes[0]),vy=direction.dot(axes[1]),vz=direction.dot(axes[2]);
 const a=shape.curve*(vx*vx+vy*vy),b=vz+2*shape.curve*(px*vx+py*vy);
 const hit=t=>t>.004&&t<limit&&(px+vx*t)**2+(py+vy*t)**2<=shape.radius**2;
 for(let layer=0;layer<2;layer++){
  const c=pz+shape.curve*(px*px+py*py)-layer*shape.depth;
  if(Math.abs(a)<1e-7){if(Math.abs(b)>=1e-7&&hit(-c/b))return true;continue;}
  const h=b*b-4*a*c;if(h>=0&&(hit((-b-Math.sqrt(h))/(2*a))||hit((-b+Math.sqrt(h))/(2*a))))return true;
 }return false;
}
export class WorldLighting{
 constructor(){this.u=worldUniforms();this.last=-99;this.revision=-1;this.nodes=[];this.c=new THREE.Color();this.dir=new THREE.Vector3();this.delta=new THREE.Vector3();this.matrix=new THREE.Matrix4();this.selected=[];this.distances=[];this.detailed=true;this.rebuilds=0;this.allLamps=[];this.frustum=new THREE.Frustum();this.projection=new THREE.Matrix4();this.sphere=new THREE.Sphere(new THREE.Vector3(),12);this.shadows=new ConstructionShadows(this.u);}
 prepare(renderer,world,camera){this.shadows.prepare(renderer,world,camera);}
 attach(uniforms){Object.assign(uniforms,this.u);}
 configureGraphics(options){if(this.detailed!==options.shadows){this.detailed=options.shadows;this.revision=-1;}this.u.shadowDetail.value=options.shadows?1:0;}
 rebuildLightGrid(){
  const lamps=this.allLamps,lists=new Map(),data=new Array(lamps.length*8).fill(0);
  for(let i=0;i<lamps.length;i++){
   const p=lamps[i].anchor;
   for(let z=Math.max(0,Math.floor((p.z-12+640)/8));z<=Math.min(159,Math.floor((p.z+12+640)/8));z++)for(let x=Math.max(0,Math.floor((p.x-12+640)/8));x<=Math.min(159,Math.floor((p.x+12+640)/8));x++){
    const key=z*160+x;let list=lists.get(key);if(!list)lists.set(key,list=[]);list.push(i);
   }
  }
  if(!this.gridTexture){this.gridTexture=this.floatTexture(160,160);this.u.baseLightGrid.value=this.gridTexture;}
  const grid=this.gridTexture.image.data;grid.fill(0);
  for(const [cell,list]of lists){grid[cell*4]=data.length/4;grid[cell*4+1]=list.length;for(const i of list)data.push(i,0,0,0);}
  const height=Math.max(1,Math.ceil(data.length/1024));
  if(!this.lightTexture||this.lightTexture.image.height!==height){this.lightTexture?.dispose();this.lightTexture=this.floatTexture(256,height);this.u.baseLightData.value=this.lightTexture;this.u.baseLightDataSize.value.set(256,height);}
  this.lightTexture.image.data.fill(0);this.lightTexture.image.data.set(data);this.gridTexture.needsUpdate=true;
 }
 floatTexture(width,height){const t=new THREE.DataTexture(new Float32Array(width*height*4),width,height,THREE.RGBAFormat,THREE.FloatType);t.minFilter=t.magFilter=THREE.NearestFilter;t.generateMipmaps=false;return t;}

 rebuild(world){
  const boxes=[];
  for(const e of world.entities){
   const geometry=e.mesh.geometry,parts=this.detailed?geometry.userData.shadowParts||[]:[...(geometry.userData.colliders||[]),...(geometry.userData.shadowParts||[]).filter(p=>p.shape)];
   for(const part of parts){
    const matrix=this.matrix.multiplyMatrices(e.mesh.matrixWorld,part.matrix),box=orientedBox(part.box,matrix);
    this.delta.copy(e.anchor).sub(box.center);
    const emitterInside=e.item.category==='Iluminación'&&box.axes.every((a,i)=>Math.abs(this.delta.dot(a))<=box.half.getComponent(i)+.005);
    if(box.half.lengthSq()<=.0001||emitterInside)continue;
    if(part.shape){box.center.set(0,0,0).applyMatrix4(matrix);box.shape=part.shape;box.type=3;}
    else box.type=box.axes.every(a=>Math.max(Math.abs(a.x),Math.abs(a.y),Math.abs(a.z))>1-1e-6)?1:2;
    boxes.push(box);
   }
  }
  this.nodes=[];
  const build=list=>{
   const index=this.nodes.length,bounds=new THREE.Box3();for(const b of list)bounds.union(b.bounds);
   const node={bounds,skip:0,box:list.length===1?list[0]:null};this.nodes.push(node);
   if(list.length>1){const span=bounds.getSize(new THREE.Vector3()),axis=span.x>span.y?(span.x>span.z?'x':'z'):(span.y>span.z?'y':'z');list.sort((a,b)=>a.bounds.getCenter(this.delta)[axis]-b.bounds.getCenter(this.dir)[axis]);const half=Math.floor(list.length/2);build(list.slice(0,half));build(list.slice(half));}
   node.skip=this.nodes.length;
  };
  if(boxes.length)build(boxes);
  const width=256,height=Math.max(1,Math.ceil(this.nodes.length*6/width));
  let texture=this.texture;
  if(!texture||texture.image.height!==height){texture?.dispose();texture=new THREE.DataTexture(new Float32Array(width*height*4),width,height,THREE.RGBAFormat,THREE.FloatType);texture.minFilter=texture.magFilter=THREE.NearestFilter;texture.generateMipmaps=false;this.texture=texture;}
  const data=texture.image.data;data.fill(0);
  const write=(index,slot,vector,w)=>{const offset=(index*6+slot)*4;data[offset]=vector.x;data[offset+1]=vector.y;data[offset+2]=vector.z;data[offset+3]=w;};
  this.nodes.forEach((node,index)=>{write(index,0,node.bounds.min,node.skip);write(index,1,node.bounds.max,node.box?.type||0);if(node.box){const b=node.box;write(index,2,b.center,b.shape?.radius??b.half.x);write(index,3,b.axes[0],b.shape?.curve??b.half.y);write(index,4,b.axes[1],b.shape?.depth??b.half.z);write(index,5,b.axes[2],0);}});
  texture.needsUpdate=true;this.u.baseTree.value=texture;this.u.baseTreeSize.value.set(width,height);this.u.baseNodeCount.value=this.nodes.length;this.revision=world.spatialRevision??world.revision;this.rebuilds++;
 }
 blocked(origin,dir,limit=2000){let index=0;while(index<this.nodes.length){const n=this.nodes[index];if(!boundsHit(origin,dir,n.bounds,limit)){index=n.skip;continue;}if(n.box&&(n.box.shape?dishBlocked(origin,dir,n.box,limit):rayBox(origin,dir,n.box,limit)!==null))return true;index++;}return false;}
 update(world,eye,time,camera=null){
  if(this.revision!==(world.spatialRevision??world.revision))this.rebuild(world);
  const dirty=world.lightingDirty;if(time-this.last<.12&&!dirty)return;this.last=time;world.lightingDirty=false;
  const previous=this.selected;this.selected=this.previousSelected||[];this.previousSelected=previous;this.selected.length=0;this.distances.length=0;
  if(camera){this.projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);this.frustum.setFromProjectionMatrix(this.projection,camera.coordinateSystem);}
  this.allLamps.length=0;
  for(const e of world.lamps||world.entities){
   if(e.item.category!=='Iluminación'||e.params.on===false)continue;this.allLamps.push(e);
   this.sphere.center.copy(e.anchor);
   const visible=!camera||this.frustum.intersectsSphere(this.sphere);
   const distance=(1+e.anchor.distanceToSquared(eye))*(visible?1:64)*(previous.includes(e)?.65:1);let i=0;while(i<this.distances.length&&distance>=this.distances[i])i++;
   if(i>=4)continue;this.selected.splice(i,0,e);this.distances.splice(i,0,distance);if(this.selected.length>4){this.selected.pop();this.distances.pop();}
  }
  // Stable atlas slots prevent stationary lamps being re-rendered merely
  // because the player crossed between them. Cache misses still illuminate.
  this.selected.sort((a,b)=>{const ai=previous.indexOf(a),bi=previous.indexOf(b);return (ai<0?4:ai)-(bi<0?4:bi);});
  this.u.baseLightCount.value=this.allLamps.length;
  for(let i=0;i<this.selected.length;i++){const e=this.selected[i];this.c.set(LAMP_TEMPERATURES[e.params.temperature||0].color);this.u.baseLights.value[i].set(e.anchor.x,e.anchor.y,e.anchor.z,12);this.u.baseColors.value[i].set(this.c.r,this.c.g,this.c.b,2.8);}
  if(this.allLamps.length>4){
   if(dirty||this.gridLampCount!==this.allLamps.length||!this.lightTexture){this.rebuildLightGrid();this.gridLampCount=this.allLamps.length;}
   if(dirty||previous.length!==this.selected.length||this.selected.some((e,i)=>e!==previous[i])||!this.gridRecordsReady){
    const data=this.lightTexture.image.data;
    for(let i=0;i<this.allLamps.length;i++){const e=this.allLamps[i],p=e.anchor;this.c.set(LAMP_TEMPERATURES[e.params.temperature||0].color);data.set([p.x,p.y,p.z,this.selected.indexOf(e),this.c.r,this.c.g,this.c.b,2.8],i*8);}
    this.lightTexture.needsUpdate=true;this.gridRecordsReady=true;
   }
  }else this.gridRecordsReady=false;
 }

 exposure(camera){if(!this.allLamps.length)return 0;camera.getWorldDirection(this.dir);let result=0;for(const e of this.allLamps){this.delta.copy(e.anchor).sub(camera.position);const d=this.delta.length();if(d>=14)continue;this.delta.normalize();if(!this.blocked(camera.position,this.delta,d-.10))result=Math.max(result,Math.max(0,1-d/14)*Math.max(.1,this.dir.dot(this.delta))*.45);}return result;}
}
