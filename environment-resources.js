import {disposePropCache} from './props.js?v=4.1.2';
// Save logical state, never inactive GPU scenes. Existing storage keys/formats
// remain authoritative; the session snapshot also preserves undo and vehicle pose.
export function environmentSnapshot(env,state,walker){
 const world=env.world;world?.save();
 return {hour:state.hour,phase:state.phase,targetPhase:state.targetPhase,path:state.path,pos:walker.pos.toArray(),yaw:walker.yaw,pitch:walker.pitch,
  muted:env.audio.muted,vehicle:{position:env.vehicle.position.toArray(),heading:env.vehicle.heading,lightMode:env.vehicle.lightMode},
  data:world?{version:1,objects:world.snapshot(),drops:world.drops.map(d=>({stack:{...d.stack},position:d.mesh.position.toArray(),velocity:d.velocity.toArray(),age:d.age}))}:null,
  history:world?.history||[],future:world?.future||[]};
}
export function releaseEnvironment(env,renderer){
 if(!env)return;
 const geometries=new Set(),materials=new Set(),textures=new Set();
 const material=m=>{if(!m||materials.has(m))return;materials.add(m);for(const u of Object.values(m.uniforms||{}))if(u.value?.isTexture&&!u.value.isRenderTargetTexture)textures.add(u.value);for(const key of ['map','alphaMap'])if(m[key])textures.add(m[key]);};
 const visit=scene=>scene?.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])material(m);});
 visit(env.scene);visit(env.terrain.lightCache?.scene);visit(env.world?.lights.shadows.scene);
 for(const m of [env.world?.material,env.world?.ghostMaterial,env.world?.batchMaterial])material(m);
 if(env.world?.mask)textures.add(env.world.mask);
 env.world?.lights.shadows.release();env.terrain.lightCache?.target.dispose();
 for(const geometry of geometries)geometry.dispose();for(const m of materials)m.dispose();for(const texture of textures)texture.dispose();
 env.audio.dispose();env.scene.clear();disposePropCache();renderer.renderLists?.dispose();
}
