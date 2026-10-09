// Graphics only. Player/world/inventory keys and formats are never touched.
export const PERFORMANCE_KEY='sky-vr-performance-prefs-v1';
export const GRAPHICS_DEFAULTS=Object.freeze({profile:'auto',grass:true,density:'full',shadows:true,advancedSky:true,resolution:'auto',distance:'high',fps:false});
const PRESETS={
 auto:{density:'full',shadows:true,advancedSky:true,resolution:'auto',distance:'high'},
 performance:{density:'low',shadows:false,advancedSky:true,resolution:'auto',distance:'low'},
 balanced:{density:'medium',shadows:true,advancedSky:true,resolution:'auto',distance:'medium'},
 quality:{density:'full',shadows:true,advancedSky:true,resolution:'auto',distance:'high'}
};
const choices={profile:Object.keys(PRESETS),density:['low','medium','full'],resolution:['auto','low','medium','high'],distance:['low','medium','high']};
const density={low:.35,medium:.65,full:1},range={low:12,medium:15,high:18};
export function validateGraphics(value){
 const result={...GRAPHICS_DEFAULTS};
 if(value&&typeof value==='object')for(const key of Object.keys(result)){
  if(choices[key]?.includes(value[key])||typeof result[key]==='boolean'&&typeof value[key]==='boolean')result[key]=value[key];
 }
 return result;
}
export class PerformanceSettings{
 constructor({storage=globalThis.localStorage,legacyQuality='auto',mobile=true,deviceRatio=1,onChange=()=>{}}={}){
  Object.assign(this,{storage,mobile,deviceRatio,onChange});
  let saved=null;try{saved=JSON.parse(storage?.getItem(PERFORMANCE_KEY)||'null');}catch{}
  this.settings=validateGraphics(saved||{...GRAPHICS_DEFAULTS,profile:legacyQuality==='high'?'quality':legacyQuality==='balanced'?'balanced':'auto',...(legacyQuality==='balanced'?PRESETS.balanced:{})});
  // Older Performance presets disabled the sky as a side effect. Restore it
  // once; subsequent explicit choices (including sky off) remain respected.
  if(saved?.profile==='performance'&&saved.version!==2){this.settings.advancedSky=true;this.save();}
  this.scale=1;this.tier=0;this.sum=0;this.count=0;this.windowTime=0;this.pressure=0;this.headroom=0;this.lastHUD=0;this.averageMs=null;
  this.effective={};this.resolve();
 }
 save(){try{this.storage?.setItem(PERFORMANCE_KEY,JSON.stringify({...this.settings,version:2}));}catch{}}
 set(key,value){
  if(!(key in GRAPHICS_DEFAULTS))return;
  const next=validateGraphics({...this.settings,[key]:value});
  if(key==='profile')Object.assign(next,PRESETS[next.profile]);
  this.settings=next;
  if(key==='profile'||key==='resolution'){this.scale=1;this.tier=0;this.resetSamples();}
  else if(key!=='fps')this.resetSamples();
  this.resolve();this.save();this.sync();this.onChange(this.effective);
 }
 reset(){this.settings={...GRAPHICS_DEFAULTS};this.scale=1;this.tier=0;this.resetSamples();this.resolve();this.save();this.sync();this.onChange(this.effective);}
 resetSamples(){this.sum=this.count=this.windowTime=this.pressure=this.headroom=0;}
 resolve(){
  const s=this.settings,e=this.effective,automatic=s.profile==='auto';
  const cap=s.profile==='quality'?(this.mobile?1.65:2):s.profile==='performance'?1.1:s.profile==='balanced'?1.4:(this.mobile?1.65:2);
  const manual={low:.9,medium:1.25,high:1.65};
  e.pixelRatio=s.resolution==='auto'?Math.min(this.deviceRatio,cap)*this.scale:Math.min(this.deviceRatio,manual[s.resolution]);
  e.grass=s.grass;e.density=density[s.density]*(automatic?(this.tier===2?.55:this.tier===1?.78:1):1);
  e.grassRange=Math.min(range[s.distance],automatic&&this.tier===2?14:18);
  e.shadows=s.shadows;e.advancedSky=s.advancedSky;e.distance=s.distance;
  // Cache capacity is not a visibility/illumination limit.
  e.lights=4;
  e.fps=s.fps;
  return e;
 }
 // Use valid rAF intervals, not simulated CPU/GPU timing. A single loading
 // spike or a background tab can never change graphics quality.
 sample(seconds,active=true){
  if(!active){this.resetSamples();return false;}
  if(!Number.isFinite(seconds)||seconds<=0||seconds>=.2)return false;
  this.sum+=seconds;this.count++;this.windowTime+=seconds;
  if(this.windowTime<2.5||this.count<45)return false;
  const average=this.sum/this.count;this.averageMs=average*1000;const duration=this.windowTime;
  this.sum=this.count=this.windowTime=0;
  if(average>.021){this.pressure+=duration;this.headroom=0;}
  else if(average<.0176){this.headroom+=duration;this.pressure=0;}
  else{this.pressure=this.headroom=0;}
  let changed=false;
  if(this.pressure>=5){
   this.pressure=0;
   if(this.settings.resolution==='auto'&&this.scale>.76){this.scale=Math.max(.76,this.scale-.04);changed=true;}
   else if(this.settings.profile==='auto'&&this.tier<2){this.tier++;changed=true;}
  }else if(this.headroom>=12){
   this.headroom=0;
   if(this.tier>0){this.tier--;changed=true;}
   else if(this.settings.resolution==='auto'&&this.scale<1){this.scale=Math.min(1,this.scale+.02);changed=true;}
  }
  if(changed){this.resolve();this.onChange(this.effective);}
  return changed;
 }
 bind(root){
  this.root=root;this.controls=new Map();
  root.querySelectorAll('[data-performance]').forEach(input=>{
   const key=input.dataset.performance;this.controls.set(key,input);
   input.addEventListener('change',()=>this.set(key,input.type==='checkbox'?input.checked:input.value));
  });
  root.querySelector('#reset-graphics').addEventListener('click',()=>this.reset());this.sync();
 }
 sync(){
  if(!this.controls)return;
  for(const [key,input]of this.controls){if(input.type==='checkbox')input.checked=this.settings[key];else input.value=this.settings[key];}
  this.controls.get('density').disabled=!this.settings.grass;
 }
 updateHUD(now,renderer,diagnostics){
  if(!this.hud)this.hud=globalThis.document?.getElementById('fps-meter');
  if(this.hud&&this.hud.hidden===this.settings.fps)this.hud.hidden=!this.settings.fps;
  if(now-this.lastHUD<500)return;this.lastHUD=now;
  // WebGPU .calls is cumulative render passes, NOT draw calls. WebGL .calls
  // is draw calls. Count all passes, including the lunar cache and gizmo.
  const calls=renderer.isWebGPURenderer?renderer.info?.render?.drawCalls:renderer.info?.render?.calls;
  diagnostics.drawCalls=Number.isFinite(calls)?calls:null;
  diagnostics.averageFrameMs=this.averageMs===null?null:Math.round(this.averageMs*10)/10;
  diagnostics.pixelRatio=this.effective.pixelRatio;diagnostics.profile=this.settings.profile;diagnostics.autoTier=this.tier;
  if(this.hud&&this.settings.fps){this.hud.textContent=this.averageMs===null?'Midiendo FPS…':Math.round(1000/this.averageMs)+' FPS · '+this.averageMs.toFixed(1)+' ms'+(diagnostics.drawCalls===null?'':' · '+diagnostics.drawCalls+' draws');}
 }
}
