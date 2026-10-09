import * as THREE from './three.module.js?v=4.0.0';
// Broad phase only: original colliders, triangle picking and entities remain
// the authoritative gameplay objects. No distance culling of collision/shadows.
const CELL=8,order=(a,b)=>a.spatialOrder-b.spatialOrder;
export class BuildIndex{
 constructor(){this.cells=new Map();this.stamp=0;this.near=[];this.rayMeshes=[];}
 key(x,z){return x+','+z;}
 remove(e){for(const key of e.spatialCells||[]){const cell=this.cells.get(key);cell?.delete(e);if(cell?.size===0)this.cells.delete(key);}e.spatialCells=[];}
 add(e){
  this.remove(e);const b=e.bounds;
  for(let z=Math.floor(b.min.z/CELL);z<=Math.floor(b.max.z/CELL);z++)for(let x=Math.floor(b.min.x/CELL);x<=Math.floor(b.max.x/CELL);x++){
   const key=this.key(x,z);let cell=this.cells.get(key);if(!cell)this.cells.set(key,cell=new Set());cell.add(e);e.spatialCells.push(key);
  }
 }
 query(x,z,radius=0){
  const result=this.near;result.length=0;const stamp=++this.stamp;
  for(let zz=Math.floor((z-radius)/CELL);zz<=Math.floor((z+radius)/CELL);zz++)for(let xx=Math.floor((x-radius)/CELL);xx<=Math.floor((x+radius)/CELL);xx++){
   const cell=this.cells.get(this.key(xx,zz));if(!cell)continue;
   for(const e of cell)if(e.queryStamp!==stamp){e.queryStamp=stamp;result.push(e);}
  }
  // Keep the original, deterministic collision resolution order at corners.
  if(result.length>1)result.sort(order);return result;
 }
 raycast(origin,direction,limit,ray){
  const result=this.rayMeshes;result.length=0;const stamp=++this.stamp;
  let x=Math.floor(origin.x/CELL),z=Math.floor(origin.z/CELL);
  const sx=Math.sign(direction.x),sz=Math.sign(direction.z),dx=sx?Math.abs(CELL/direction.x):Infinity,dz=sz?Math.abs(CELL/direction.z):Infinity;
  let tx=sx?((x+(sx>0?1:0))*CELL-origin.x)/direction.x:Infinity,tz=sz?((z+(sz>0?1:0))*CELL-origin.z)/direction.z:Infinity,t=0;
  // Walk only cells crossed by the ray, not a 600 m square of empty space.
  while(t<=limit){
   const cell=this.cells.get(this.key(x,z));if(cell)for(const e of cell)if(e.queryStamp!==stamp){e.queryStamp=stamp;if(e.mesh.visible&&ray.intersectsBox(e.bounds))result.push(e.mesh);}
   if(!sx&&!sz)break;
   if(tx<tz){t=tx;tx+=dx;x+=sx;}else{t=tz;tz+=dz;z+=sz;}
  }
  return result;
 }
}
export class BuildBatches{
 constructor(scene,material){
  this.scene=scene;this.material=material;this.groups=new Map();this.revision=-1;
  this.logical=new THREE.Group();this.logical.name='Piezas lógicas (selección y colisiones)';this.logical.visible=false;scene.add(this.logical);
  this.batchedEntities=0;this.batchCount=0;
 }
 update(world){
  if(this.revision===world.spatialRevision)return;
  const groups=new Map();
  for(const e of world.entities){
   // Luminaires retain independent callbacks. Telescope optics / parameterized
   // foundations and ramps are never captured in a static shared batch.
   if(e.item.category==='Iluminación'||e.mesh.geometry.userData.owned)continue;
   const p=e.position,key=e.mesh.geometry.uuid+':'+Math.floor(p.x/CELL)+','+Math.floor(p.y/CELL)+','+Math.floor(p.z/CELL);
   let list=groups.get(key);if(!list)groups.set(key,list=[]);list.push(e);
  }
  this.batchedEntities=this.batchCount=0;
  for(const e of world.entities)if(e.mesh.parent===this.logical)this.scene.add(e.mesh);
  for(const [key,batch]of this.groups)if(!groups.has(key)||groups.get(key).length<3){this.scene.remove(batch.mesh);batch.geometry.dispose();this.groups.delete(key);}
  for(const [key,list]of groups){
   if(list.length<3)continue;
   let batch=this.groups.get(key);
   if(!batch||batch.capacity<list.length){
    if(batch){this.scene.remove(batch.mesh);batch.geometry.dispose();}
    const source=list[0].mesh.geometry,geometry=new THREE.InstancedBufferGeometry(),capacity=2**Math.ceil(Math.log2(list.length));
    geometry.setIndex(source.index);for(const [name,attribute]of Object.entries(source.attributes))geometry.setAttribute(name,attribute);
    for(let i=0;i<4;i++)geometry.setAttribute('batch'+i,new THREE.InstancedBufferAttribute(new Float32Array(capacity*4),4));
    const mesh=new THREE.Mesh(geometry,this.material);mesh.name='Construcción instanciada';mesh.matrixAutoUpdate=false;mesh.matrixWorldAutoUpdate=false;this.scene.add(mesh);
    batch={mesh,geometry,capacity};this.groups.set(key,batch);
   }
   const g=batch.geometry,bounds=new THREE.Box3();g.instanceCount=list.length;
   for(let i=0;i<list.length;i++){
    const e=list[i],m=e.mesh.matrixWorld.elements;bounds.union(e.bounds);
    for(let j=0;j<4;j++)g.attributes['batch'+j].setXYZW(i,m[j*4],m[j*4+1],m[j*4+2],m[j*4+3]);
    this.logical.add(e.mesh);
   }
   for(let i=0;i<4;i++)g.attributes['batch'+i].needsUpdate=true;
   g.boundingBox=bounds;g.boundingSphere=bounds.getBoundingSphere(new THREE.Sphere());
   this.batchedEntities+=list.length;this.batchCount++;
  }
  this.revision=world.spatialRevision;
 }
}
