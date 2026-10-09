import * as THREE from './three.module.js?v=4.0.0';
const instanceAttributes=new WeakMap();
// WebGPU has one-pixel point primitives. Instanced quads preserve the original
// fragment profile and pixel diameter, including the 96,000 faint stars.
export function createStarField(source,material){
 if(!globalThis.__skyWebGPU)return new THREE.Points(source,material);
 const g=new THREE.InstancedBufferGeometry();
 g.setAttribute('quadCorner',new THREE.Float32BufferAttribute([-1,-1,1,-1,-1,1,1,1],2));
 g.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,0,1,1,1],2));g.setIndex([0,1,2,2,1,3]);
 for(const [name,a]of Object.entries(source.attributes)){
  let attribute=a.isInstancedBufferAttribute?a:instanceAttributes.get(a);
  if(!attribute){attribute=new THREE.InstancedBufferAttribute(a.array,a.itemSize,a.normalized);attribute.setUsage(a.usage);instanceAttributes.set(a,attribute);}
  g.setAttribute(name,attribute);
 }
 g.instanceCount=source.attributes.position.count;
 g.setDrawRange=(start,count)=>{if(start!==0)throw Error('El campo estelar comienza en cero');g.instanceCount=Math.min(count,source.attributes.position.count);};
 const mesh=new THREE.Mesh(g,material);mesh.frustumCulled=false;return mesh;
}
