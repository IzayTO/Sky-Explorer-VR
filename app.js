import {VRRuntime} from './vr-runtime.js';
import * as THREE from './three.module.js?v=4.0.0';
import {createRenderer,compileScene,onGraphicsFailure,recoverGraphics,graphicsInfo} from './renderer-factory.js?v=4.1.2';
import {Sky,clamp,smooth,phaseName} from './sky.js?v=4.1.2';
import {Terrain} from './terrain.js?v=4.1.2';
import {LandscapeRenderer} from './landscape-renderer.js?v=4.1.2';
import {environmentSnapshot,releaseEnvironment} from './environment-resources.js?v=4.1.2';
import {PerformanceSettings} from './performance-settings.js?v=4.1.2';
import {Walker,bindTimeLoop,cycleHour} from './controls.js?v=4.1.2';
import {Ambience} from './sound.js?v=4.1.2';
import {LunarSky,MOON_GRAVITY} from './lunar-sky.js?v=4.1.2';
import {LunarTerrain} from './lunar-terrain.js?v=4.1.2';
import {Vehicle} from './vehicles.js?v=4.1.2';
import {VehicleSound} from './vehicle-sound.js?v=4.1.2';
import {Inventory} from './inventory.js?v=4.1.2';
import {Expedition} from './expedition.js?v=4.1.2';
import {LunarAmbience} from './lunar-sound.js?v=4.1.2';

const $=id=>document.getElementById(id),mobile=false,standaloneGPU=matchMedia('(pointer:coarse)').matches,reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
const icons={
  backpack:'<path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M7 6h10a3 3 0 0 1 3 3v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9a3 3 0 0 1 3-3Zm-3 5H1v8h3m16-8h3v8h-3M8 13h8v6H8zM8 9h8"/>',
  seat:'<path d="M7 3v9a3 3 0 0 0 3 3h8M7 8h8v7M5 16v5m13-6v6M6 21h14"/>',
  exit:'<path d="M10 4H4v16h6m3-12 5 4-5 4m-5-4h13"/>',
  sprint:'<circle cx="15" cy="4" r="2"/><path d="m7 9 5-2 4 4 4 1M12 7l-2 7 4 2-1 5m-3-7-3 4H3"/>',
  boost:'<path d="m13 2-8 12h6l-1 8 9-13h-6l1-7Z"/>',
  headlights:'<path d="M13 6v12C3 19 3 5 13 6ZM17 6h5m-5 4h5m-5 4h5m-5 4h5"/>',
  jump:'<path d="M12 19V5m-5 5 5-5 5 5M5 21h14"/>',
  flashlight:'<path d="m8 10 2 11h4l2-11M7 6h10v4H7zM12 1v2M5 2l2 2m12-2-2 2"/>',
  earth:'<circle cx="12" cy="12" r="9"/><path d="m6 6 4 3-1 3 4 2 1 5m2-15-2 4 4 3 3-1"/>',
  volume:'<path d="M11 4 6 8H3v8h3l5 4V4Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  mute:'<path d="M11 4 6 8H3v8h3l5 4V4Z"/><path d="m16 9 6 6m0-6-6 6"/>',
  eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  sliders:'<path d="M4 6h7m5 0h4M4 12h2m5 0h9M4 18h10m5 0h1"/><circle cx="13.5" cy="6" r="2.5"/><circle cx="8.5" cy="12" r="2.5"/><circle cx="16.5" cy="18" r="2.5"/>',
  close:'<path d="m6 6 12 12M18 6 6 18"/>',
  play:'<path d="m8 4 12 8-12 8V4Z" fill="currentColor" stroke="none"/>',
  pause:'<path d="M8 5v14M16 5v14" stroke-width="3"/>',
  forward:'<path d="M4 12h15m-5-5 5 5-5 5"/>',
  backward:'<path d="M20 12H5m5-5-5 5 5 5"/>',
  chevron:'<path d="m7 14 5-5 5 5"/>',
  moon:'<path d="M20.5 13A9 9 0 0 1 11 3.5 8.8 8.8 0 1 0 20.5 13Z"/>',
  scope:'<path d="m3 13 4 8 5-3-4-8-5 3Zm5-3 4 8 6-3-5-9-5 4Zm5-4 5 9 4-2-5-10-4 3ZM2 17l2-1"/>'
};
const icon=(el,name)=>{if(el.dataset.renderedIcon===name)return;el.dataset.renderedIcon=name;el.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name]||icons.eye}</svg>`;};
document.querySelectorAll('[data-icon]').forEach(el=>icon(el,el.dataset.icon));
let toastTimer;function toast(message){vr?.noticeText(message);$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),3600);}
const state={inventory:false,destination:'earth',moonAppearance:'natural',viewMode:'clean',headlightExposure:0,vehicleLighting:null,flashlight:false,hour:17.8,phase:.17,targetPhase:.17,playing:false,direction:1,duration:12,path:0,fov:100,speed:1,volume:.35,milky:true,sway:!reduced,quality:'auto',scope:false,zoom:0,zoomReveal:0,active:false,hiddenUI:false,panel:false};
// Only personal preferences are local. Every fresh visit starts at sunset.
try{const saved=JSON.parse(localStorage.getItem('sky-vr-prefs-v1')||'null');if(saved){for(const key of ['fov','speed','volume','milky','sway','quality','duration','moonAppearance','viewMode'])if(saved[key]!==undefined)state[key]=saved[key];state.fov=clamp(Number(state.fov)||100,55,120);state.speed=clamp(Number(state.speed)||1,.4,4);state.volume=clamp(Number(state.volume)||0);state.duration=clamp(Number(state.duration)||12,2,60);if(!['auto','high','balanced'].includes(state.quality))state.quality='auto';if(!['clean','walk','explore'].includes(state.viewMode))state.viewMode='clean';}}catch{}
const graphics=new PerformanceSettings({legacyQuality:state.quality,mobile:standaloneGPU,deviceRatio:devicePixelRatio||1,onChange:applyGraphics});state.graphics=graphics.effective;
function save(){try{const {fov,speed,volume,milky,sway,quality,duration,moonAppearance,viewMode}=state;localStorage.setItem('sky-vr-prefs-v1',JSON.stringify({fov,speed,volume,milky,sway,quality,duration,moonAppearance,viewMode}));}catch{}}
let vr,landscape,renderer,scene,camera,sky,terrain,walker,audio,vehicle,motor,inventory,expedition,raf,frameTime=0,nextFrame=0,frameInterval=0,elapsed=0,uiTime=0,contextLost=false,phaseImageData;
const promptPoint=new THREE.Vector3();
let targetHour=null,phaseControlUntil=0,previewBuffer=null,lastPreviewKey='';const environments={},destinationSaves={};let switching=false;
const surfaceAnimations=new WeakMap();
function showSurface(el,show){
  const wasHidden=el.hidden,style=wasHidden?null:getComputedStyle(el);
  const from={opacity:style?style.opacity:0,transform:style?style.transform:'translateY(8px) scale(.99)'};
  surfaceAnimations.get(el)?.cancel();el.hidden=false;el.inert=!show;
  if(reduced||!el.animate){el.hidden=!show;return;}
  const animation=el.animate([from,{opacity:show?1:0,transform:show?'translateY(0) scale(1)':'translateY(6px) scale(.99)'}],{duration:show?280:190,easing:'cubic-bezier(.2,.7,.2,1)',fill:'both'});
  surfaceAnimations.set(el,animation);animation.finished?.catch(()=>{});
  animation.onfinish=()=>{if(surfaceAnimations.get(el)!==animation)return;el.hidden=!show;animation.cancel();surfaceAnimations.delete(el);};
}

function viewport(){return {w:window.innerWidth,h:window.innerHeight};}
function targetFov(){if(!state.scope||state.zoom===0)return state.fov;const {w,h}=viewport();const levels=state.mountedScope?[0,6,1,.10]:state.destination==='moon'?[0,14,4,1.05]:[0,20,8,4.1];return levels[state.zoom]/Math.min(1,w/h);}
function pixelRatio(){return graphics.effective.pixelRatio;}
function skyPixelRatio(){return Math.max(pixelRatio(),Math.min(devicePixelRatio||1,mobile?1.65:2));}
function applyGraphics(){state.graphics=graphics.effective;for(const env of Object.values(environments)){env.terrain.configureGraphics?.(state.graphics);env.world?.configureGraphics(state.graphics);}state.quality=graphics.settings.profile==='quality'?'high':graphics.settings.profile==='balanced'?'balanced':'auto';resize();save();}
function resize(){if(!renderer||renderer.xr?.isPresenting)return;const {w,h}=viewport();renderer.setPixelRatio(skyPixelRatio());graphicsInfo.pixelRatio=pixelRatio();renderer.setSize(w,h,false);landscape?.resize(w,h,pixelRatio(),skyPixelRatio());camera.aspect=w/h;camera.updateProjectionMatrix();}
window.addEventListener('resize',resize);window.visualViewport?.addEventListener('resize',resize);

async function init(){
  try{
    renderer=await createRenderer();onGraphicsFailure(failGraphics);renderer.outputColorSpace=globalThis.__skyWebGPU?THREE.LinearSRGBColorSpace:THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;if(renderer.info)renderer.info.autoReset=false;renderer.setClearColor(0x111d25);$('world').appendChild(renderer.domElement);landscape=new LandscapeRenderer(renderer);
    scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(state.fov,innerWidth/innerHeight,.08,18000);camera.coordinateSystem=globalThis.__skyWebGPU?THREE.WebGPUCoordinateSystem:THREE.WebGLCoordinateSystem;camera.updateProjectionMatrix();camera.position.set(0,1.68,0);camera.layers.enable(3);
    const moon=await new THREE.TextureLoader().loadAsync(new URL('./moon.jpg?v=4.0.0',import.meta.url).href);moon.colorSpace=THREE.NoColorSpace;moon.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),4);moon.minFilter=THREE.LinearMipmapLinearFilter;
    sky=new Sky(scene,moon);terrain=new Terrain(scene,standaloneGPU);terrain.configureGraphics(state.graphics);audio=new Ambience();audio.setVolume(state.volume);
    walker=new Walker(camera,renderer.domElement,s=>audio.step(s),()=>toast(state.destination==='moon'?'Has llegado al límite de exploración. Sigue en otra dirección.':'Has llegado al límite de la pradera. Puedes seguir en otra dirección.'));walker.sway=state.sway;walker.speed=state.speed;
    walker.onJump=()=>{if(!vehicle?.mounted)audio.jump();};walker.onLand=impact=>vehicle?.mounted?motor.land(impact):audio.land(impact);
    vehicle=new Vehicle(scene);motor=new VehicleSound(audio);state.vehicleLighting=vehicle.lighting;environments.earth={scene,sky,terrain,audio,vehicle,motor,preview:moon.image,saved:null};
    walker.onLook=()=>{$('look-hint').style.opacity='0';};
    setupMoonPreview(moon.image);bindUI();expedition=new Expedition({state,camera,walker,renderer,inventory,getEnv:()=>environments[state.destination],toast,setScope,setZoom,setInventory});expedition.activate();
    vr=new VRRuntime({state,renderer,camera,walker,expedition,inventory,graphics,toast,getEnv:()=>environments[state.destination],enterDestination,setScope,setZoom,setPanel,setInventory,useLight,enterVehicle,leaveVehicle,resize,setHour:value=>{state.hour=value;state.playing=false;targetHour=null;updateReadouts();}});
    syncPreferences();registerSkyTools();resize();walker.update(0);sky.update(camera,state,0,skyPixelRatio());terrain.update(camera,sky,0);expedition.update(0,0,skyPixelRatio());environments[state.destination].world.lights.prepare(renderer,environments[state.destination].world,camera);await compileScene(renderer,scene,camera);landscape.render(scene,camera);expedition?.renderOverlay();
    graphicsInfo.ready=true;$('enter').disabled=false;$('enter-label').textContent='Explorar';$('moon-destination').disabled=false;$('moon-enter-label').textContent='Explorar';
    renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();contextLost=true;renderer?.setAnimationLoop(null);walker.resetInput();audio.pause();toast('Recuperando el paisaje…');});
    renderer.domElement.addEventListener('webglcontextrestored',()=>{contextLost=false;for(const env of Object.values(environments)){env.terrain.lightCache?.invalidate();env.world?.lights.shadows.release();}landscape.release();resize();frameTime=nextFrame=0;if(state.active)audio.start();renderer.setAnimationLoop(frame);});
    document.addEventListener('visibilitychange',()=>{if(vr?.active)return;if(document.hidden){graphics.resetSamples();renderer?.setAnimationLoop(null);walker.resetInput();audio.pause();frameTime=0;}else if(!contextLost){if(state.active)audio.start();renderer.setAnimationLoop(frame);}});
    renderer.setAnimationLoop(frame);
  }catch(e){if(failGraphics(e))return;console.error(e);$('loading-error').hidden=false;$('loading-error').textContent=/WebGL/i.test(e.message)?'Este navegador no pudo iniciar los gráficos 3D. Prueba abrir la página en Safari o Chrome con la aceleración gráfica disponible.':'No se pudo abrir el paisaje. Comprueba que subiste todos los archivos juntos y abre la dirección de GitHub Pages en Safari o Chrome actualizado.';$('enter-label').textContent='No disponible';}
}
async function prepareDestination(destination,nextAudio){
  const lunar=destination==='moon',loader=new THREE.TextureLoader();
  const names=lunar?['earth.jpg','lunar-height.png','regolith.jpg']:['moon.jpg'];
  const loaded=[];
  try{
   await Promise.all(names.map(async(name,i)=>{loaded[i]=await loader.loadAsync(new URL('./'+name+'?v=4.0.0',import.meta.url).href);}));
   const texture=loaded[0];texture.colorSpace=THREE.NoColorSpace;texture.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),lunar?8:4);if(lunar)texture.wrapS=THREE.RepeatWrapping;
   const nextScene=new THREE.Scene();let nextSky;
   if(lunar){
    // Only the shared astronomical template, never Earth's terrain/vehicle.
    const template=new Sky(new THREE.Scene(),texture);nextSky=new LunarSky(nextScene,template,texture);
    for(const object of [template.atmosphere,template.milkyWay,template.stars,template.moonMesh])object.material.dispose();
   }else nextSky=new Sky(nextScene,texture);
   const nextTerrain=lunar?new LunarTerrain(nextScene,loaded[1],loaded[2],standaloneGPU):new Terrain(nextScene,standaloneGPU);if(lunar)nextSky.terrain=nextTerrain;nextTerrain.configureGraphics(state.graphics);
   const nextVehicle=new Vehicle(nextScene,{lunar,heightAt:(x,z)=>nextTerrain.heightAt?.(x,z)||0,terrain:lunar?nextTerrain:null});
   return environments[destination]={scene:nextScene,sky:nextSky,terrain:nextTerrain,audio:nextAudio,vehicle:nextVehicle,motor:new VehicleSound(nextAudio,lunar),preview:texture.image};
  }catch(error){for(const texture of loaded)texture?.dispose();throw error;}
}
async function enterDestination(destination){
  if(switching)return;expedition?.exitSeat();if(state.expeditionPanel)expedition.closeDialog();expedition?.clearPreview();if(state.inventory)setInventory(false);if(vehicle?.mounted)leaveVehicle(true);switching=true;$('enter').disabled=true;$('moon-destination').disabled=true;
  const existing=environments[destination],nextAudio=existing?.audio||(destination==='moon'?new LunarAmbience():new Ambience());nextAudio.setVolume(state.volume);nextAudio.setMuted(destinationSaves[destination]?.muted??audio?.muted??false);
  // Resume within the initiating tap, before loading any local texture (iOS).
  const audible=nextAudio.start();
  $('fade').classList.add('on');$('loading-error').hidden=true;
  const progress=$('destination-loading');progress.hidden=false;progress.textContent='Preparando '+(destination==='moon'?'la Luna':'la Tierra')+'…';
  try{
    if(destination!==state.destination||!existing){
      state.active=false;walker.enabled=false;walker.resetInput();
      const old=environments[state.destination];
      if(old){destinationSaves[state.destination]=environmentSnapshot(old,state,walker);expedition.laser.root.removeFromParent();expedition.lastEnvironment=null;expedition.target=expedition.near=expedition.aimedLamp=null;expedition.visor.visible=[];vr?.detach();releaseEnvironment(old,renderer);delete environments[state.destination];}
      landscape.release();scene=sky=terrain=vehicle=motor=null;state.vehicleLighting=null;previewBuffer=phaseImageData=null;state.destination=destination;
      await new Promise(resolve=>vr?.active?setTimeout(resolve,0):requestAnimationFrame(resolve));
      const env=await prepareDestination(destination,nextAudio);scene=env.scene;sky=env.sky;terrain=env.terrain;audio=env.audio;vehicle=env.vehicle;motor=env.motor;state.vehicleLighting=vehicle.lighting;
      const saved=destinationSaves[destination]||{hour:destination==='moon'?8.6:17.8,phase:destination==='moon'?.25:.17,targetPhase:destination==='moon'?.25:.17,path:0,pos:null,yaw:destination==='moon'?-1.8:0,pitch:.23};
      Object.assign(state,{hour:saved.hour,phase:saved.phase,targetPhase:saved.targetPhase,path:saved.path});
      walker.setEnvironment(destination==='moon'?(x,z)=>terrain.heightAt(x,z):null,destination==='moon'?MOON_GRAVITY:9.80665);
      expedition.attach(env);if(saved.data)env.world.load(saved.data);env.world.history=saved.history||[];env.world.future=saved.future||[];
      if(saved.vehicle){vehicle.heading=saved.vehicle.heading;vehicle.position.fromArray(saved.vehicle.position);vehicle.lightMode=saved.vehicle.lightMode;vehicle.parkAt(vehicle.position.x,vehicle.position.z);vehicle.updateLighting(0);}
      if(saved.pos)walker.pos.fromArray(saved.pos);walker.yaw=saved.yaw;walker.pitch=saved.pitch;walker.pos.y=env.world.support(walker.pos.x,walker.pos.z,walker.pos.y-1.68)+1.68;
      setupMoonPreview(env.preview);resize();
    }
    graphicsInfo.world=destination;graphicsInfo.residentWorlds=Object.keys(environments);
    state.active=true;state.playing=false;targetHour=null;state.zoomReveal=0;walker.enabled=true;walker.resetInput();setFlashlight(false);setZoom(0);camera.fov=state.fov;camera.updateProjectionMatrix();
    expedition.activate();applyDestinationUI();syncVehicleUI();hideUI(false);$('hud').hidden=false;$('welcome').classList.add('leaving');setTimeout(()=>$('welcome').hidden=true,780);$('world').focus({preventScroll:true});
    await audible;audio.setVolume(state.volume);icon($('sound-button'),audio.muted?'mute':'volume');$('sound-button').setAttribute('aria-pressed',!audio.muted);$('sound-button').setAttribute('aria-label',audio.muted?'Activar ambiente':'Silenciar ambiente');
    walker.update(0);sky.update(camera,state,elapsed,skyPixelRatio());expedition.update(elapsed,0,skyPixelRatio());environments[state.destination].world.lights.prepare(renderer,environments[state.destination].world,camera);terrain.prepareLighting?.(renderer,camera,sky);terrain.update(camera,sky,elapsed,state);await compileScene(renderer,scene,camera);if(!vr?.active){landscape.render(scene,camera);expedition?.renderOverlay();expedition.guide.firstVisit();}
    requestAnimationFrame(()=>$('fade').classList.remove('on'));setTimeout(()=>{$('look-hint').style.opacity='0';},8500);
  }catch(error){if(failGraphics(error))return;console.error(error);nextAudio.pause();state.active=false;walker.enabled=false;$('welcome').hidden=false;$('welcome').classList.remove('leaving');$('hud').hidden=true;$('loading-error').hidden=false;$('loading-error').textContent='No se pudo abrir este paisaje. Revisa que todos los archivos del ZIP estén juntos.';$('fade').classList.remove('on');}
  finally{switching=false;vr?.attach();frameTime=nextFrame=0;progress.hidden=true;$('enter').disabled=false;$('moon-destination').disabled=false;$('moon-enter-label').textContent='Explorar';}
}
function setFlashlight(on){state.flashlight=Boolean(on)&&!vehicle?.mounted;$('flashlight-setting').checked=state.flashlight;$('flashlight-button').setAttribute('aria-pressed',state.flashlight);$('flashlight-button').setAttribute('aria-label',state.flashlight?'Apagar linterna':'Encender linterna');}
function useLight(){
  if(vehicle?.mounted){vehicle.cycleLights();motor.switch();syncLightUI();}
  else setFlashlight(!state.flashlight);
}
function syncLightUI(){
  const riding=vehicle?.mounted;const mode=vehicle?.lightMode||0;
  icon($('flashlight-button'),riding?'headlights':'flashlight');
  $('flashlight-button').dataset.mode=riding?String(mode):'';
  $('flashlight-button').setAttribute('aria-pressed',riding?mode>0:state.flashlight);
  $('flashlight-button').setAttribute('aria-label',riding?['Encender luces bajas','Cambiar a luces altas','Apagar faros'][mode]:state.flashlight?'Apagar linterna':'Encender linterna');
  $('flashlight-button').title=riding?'Faros: apagados / bajas / altas · F':'Linterna · F';
  $('lunar-flash-setting').hidden=Boolean(riding);$('headlight-setting-row').hidden=!riding;$('headlight-setting').value=mode;
  $('vehicle-lights').textContent=['Faros apagados','Luces bajas','Luces altas'][mode];
}
function syncVehicleUI(){
  const riding=Boolean(vehicle?.mounted);document.body.classList.toggle('riding',riding);
  $('vehicle-exit').hidden=!riding;$('sprint-button').hidden=riding;$('boost-button').hidden=!riding;$('vehicle-status').hidden=!riding;
  $('jump-button').setAttribute('aria-label',riding?'Saltar con el vehículo':'Saltar');
  $('vehicle-name').textContent=state.destination==='moon'?'Selene · Rover':'Sendero · Cuatrimoto';
  $('vehicle-enter').hidden=true;syncLightUI();
}
function enterVehicle(){
  if(!vehicle.canEnter(camera,walker)||state.panel||state.inventory||!state.active)return;
  const torch=state.flashlight;setScope(false);setFlashlight(false);vehicle.mount(walker);vehicle.personalTorch=torch;motor.mount();syncVehicleUI();
  $('world').focus({preventScroll:true});
}
function leaveVehicle(force=false){
  if(!vehicle?.mounted)return;
  const torch=vehicle.personalTorch;
  if(!vehicle.dismount(walker,force)){toast('Espera a tocar el suelo para bajar.');return;}
  motor.stop();setFlashlight(torch);syncVehicleUI();$('world').focus({preventScroll:true});
}
function updateVehicleUI(){
  const riding=vehicle.mounted;
  if(riding){
    $('vehicle-speed').textContent=Math.round(Math.abs(vehicle.speed)*3.6)+' km/h'+(vehicle.speed<-.1?' · R':'');
    $('boost-status').textContent=vehicle.boosting?'Impulso activo':'Mantén para impulsar';
    $('boost-button').setAttribute('aria-label',vehicle.boosting?'Impulso activo; suelta para detener':'Mantener para usar impulso');
    $('boost-button').classList.toggle('boost-active',vehicle.boosting);
  }
}
function updateVehiclePrompt(){
  const button=$('vehicle-enter');if(expedition?.updatePrompt()||state.expeditionPanel||expedition?.seated){button.hidden=true;return;}
  let visible=state.active&&!state.panel&&!state.inventory&&!state.scope&&(!state.hiddenUI||state.viewMode==='explore')&&vehicle.canEnter(camera,walker);
  if(visible){
    vehicle.promptPosition(promptPoint).project(camera);
    visible=promptPoint.z>=-1&&promptPoint.z<=1&&Math.abs(promptPoint.x)<1.08&&Math.abs(promptPoint.y)<1.08;
    if(visible)button.style.transform=`translate3d(${(promptPoint.x*.5+.5)*innerWidth}px,${(-promptPoint.y*.5+.5)*innerHeight}px,0) translate(-50%,-50%)`;
  }
  button.hidden=!visible;
}
function setInventory(open){
  if(open&&(!state.active||state.hiddenUI))return;if(open&&state.scope)setScope(false);
  if(open&&state.panel)setPanel(false,false);
  if(state.expeditionPanel)expedition.closeDialog();if(!open){inventory.cancel();inventory.context.hidden=true;}
  state.inventory=open;$('inventory-overlay').hidden=!open;document.body.classList.toggle('inventory-open',open);
  $('backpack-button').setAttribute('aria-expanded',open);
  for(const child of $('hud').children)if(child.id!=='inventory-overlay')child.inert=open;
  walker.enabled=state.active&&!open&&!state.panel;walker.resetInput();
  if(open){walker.lookTween=null;if(document.pointerLockElement)document.exitPointerLock();$('inventory-close').focus();}
  else $('world').focus({preventScroll:true});
}

function selectPhase(value,preset=false){
  if(state.destination==='moon'){
    const hour=sky.hourForPhase(value),delta=((hour-state.hour+36)%24)-12;
    targetHour={from:state.hour,to:state.hour+delta,elapsed:0,duration:preset?.5:.16};
    phaseControlUntil=elapsed+(preset?.55:.20);state.playing=false;
  }else state.targetPhase=value;
  $('phase').value=value*1000;
}
function applyDestinationUI(){
  const lunar=state.destination==='moon';document.body.classList.toggle('on-moon',lunar);$('destination-label').textContent=lunar?'LUNA':'TIERRA';$('phase-label').textContent=lunar?'Fase de la Tierra':'Fase lunar';$('lunar-phase-link').hidden=!lunar;$('solar-path-field').hidden=lunar;$('moon-appearance-field').hidden=lunar;$('flashlight-button').hidden=false;$('lunar-flash-setting').hidden=false;
  $('sky-note').textContent=lunar?'El cielo se revela al apartar la mirada de la luz. La Tierra permanece casi fija sobre este horizonte.':'Su brillo aparece al caer la noche y se atenúa con la luz de la Luna.';
  $('gravity-note').textContent=lunar?'Un salto más alto, una caída más lenta. Espacio: saltar · F: linterna.':'Mantén Shift para correr sin límite. Espacio: saltar · F: linterna.';
  $('aim-moon').setAttribute('aria-label',lunar?'Centrar la Tierra':'Centrar la Luna');$('aim-moon').title=lunar?'Centrar la Tierra':'Centrar la Luna';icon($('aim-moon'),lunar?'earth':'moon');
  $('phase').value=state.phase*1000;const marks=document.querySelectorAll('.time-marks span');marks.forEach((mark,i)=>mark.textContent=lunar?['0 %','25','50','75','100 %'][i]:['00','06','12','18','24'][i]);
  const preset=document.querySelectorAll('[data-hour]');preset.forEach((el,i)=>el.textContent=lunar?['Noche','Salida del Sol','Día','Puesta del Sol','Noche'][i]:['Noche','Amanecer','Día','Atardecer','Noche'][i]);
  $('controls-help').innerHTML=mobile?'<p>Joystick izquierdo: avanzar, retroceder y dirigir.</p><p>Arrastra para mirar, también desde los botones de acción. Mantén correr para sprintar; al conducir, mantén el rayo para usar el impulso.</p><p>Linterna o faros: apagados → bajas → altas. Salto y salida a la derecha.</p>':'<p><kbd>WASD</kbd> Mover / conducir · <kbd>← →</kbd> Girar</p><p><kbd>Espacio</kbd> Saltar · <kbd>Shift</kbd> Correr / impulso</p><p><kbd>F</kbd> Linterna / faros · <kbd>E</kbd> Interactuar / mochila</p><p>Arrastrar: mirar · Doble clic: capturar ratón · <kbd>Esc</kbd> Liberar</p><p><kbd>B</kbd> Mochila · <kbd>1–9, 0</kbd> Casilla a mano</p><p><kbd>C</kbd> Catálogo · <kbd>J</kbd> Cuaderno · <kbd>Q</kbd> Soltar</p><p>Anillos / barras: giro libre · <kbd>R</kbd> Ajustar 90° · <kbd>Supr</kbd> Recuperar</p><p><kbd>Ctrl Z / Y</kbd> Deshacer / rehacer · Lápiz: editar</p><p><kbd>T</kbd> Telescopio · <kbd>H</kbd> Guía · <kbd>F1</kbd> Ocultar interfaz</p>';
  updateReadouts();
}
function bindUI(){
  $('moon-destination').addEventListener('click',()=>enterDestination('moon'));
  $('enter').addEventListener('click',()=>enterDestination('earth'));
  $('home').addEventListener('click',()=>{expedition?.exitSeat();if(state.expeditionPanel)expedition.closeDialog();if(state.inventory)setInventory(false);leaveVehicle(true);state.active=false;walker.enabled=false;walker.resetInput();state.playing=false;setScope(false);setPanel(false);if(document.pointerLockElement)document.exitPointerLock();audio.pause();$('welcome').hidden=false;requestAnimationFrame(()=>$('welcome').classList.remove('leaving'));$('hud').hidden=true;$('enter').focus();});
  document.body.classList.toggle('touch-controls',mobile);
  walker.bindActionButton($('jump-button'),()=>walker.jump());
  walker.bindActionButton($('flashlight-button'),()=>useLight());
  walker.bindActionButton($('sprint-button'),held=>{walker.sprintHeld=held;},true);
  walker.bindActionButton($('boost-button'),held=>vehicle.setBoost(held),true);
  inventory=new Inventory($('inventory-main'),$('inventory-quick'),$('hotbar'));
  $('backpack-button').addEventListener('click',()=>setInventory(!state.inventory));$('inventory-close').addEventListener('click',()=>setInventory(false));
  $('inventory-overlay').addEventListener('click',e=>{if(performance.now()<(inventory.suppressClick||0))return;if(e.target===$('inventory-overlay'))setInventory(false);});
  $('vehicle-enter').addEventListener('click',enterVehicle);$('vehicle-exit').addEventListener('click',()=>leaveVehicle());
  $('headlight-setting').addEventListener('change',e=>{vehicle.lightMode=Number(e.target.value);motor.switch();syncLightUI();});
  document.querySelectorAll('[data-moon-look]').forEach(b=>b.addEventListener('click',()=>{state.moonAppearance=b.dataset.moonLook;document.querySelectorAll('[data-moon-look]').forEach(el=>el.setAttribute('aria-pressed',el===b));save();}));
 $('flashlight-setting').addEventListener('change',e=>setFlashlight(e.target.checked));
  $('settings-button').addEventListener('click',()=>setPanel(!state.panel));$('close-settings').addEventListener('click',()=>setPanel(false));
  const tabs=[$('sky-tab'),$('walk-tab'),$('performance-tab')];tabs.forEach((tab,index)=>{tab.addEventListener('click',()=>activateTab(index));tab.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();activateTab(e.key==='Home'?0:e.key==='End'?tabs.length-1:(index+(e.key==='ArrowRight'?1:tabs.length-1))%tabs.length,true);}});});
  function activateTab(index,focus=false){tabs.forEach((tab,i)=>{tab.setAttribute('aria-selected',i===index);tab.tabIndex=i===index?0:-1;$(tab.getAttribute('aria-controls')).hidden=i!==index;});if(focus)tabs[index].focus();$('settings').scrollTop=0;}
  bindTimeLoop($('time'),hour=>{state.hour=hour;state.playing=false;targetHour=null;updateReadouts();});
  $('play').addEventListener('click',()=>{state.playing=!state.playing;targetHour=null;updateReadouts();});
  $('cycle-direction').addEventListener('click',()=>{state.direction*=-1;icon($('cycle-direction'),state.direction===1?'forward':'backward');toast(state.direction===1?'El tiempo avanza.':'El tiempo retrocede.');});
  $('timeline-toggle').addEventListener('click',()=>{const folded=$('timeline').classList.toggle('collapsed');$('timeline-toggle').setAttribute('aria-expanded',!folded);$('timeline-toggle').setAttribute('aria-label',folded?'Desplegar ciclo':'Plegar ciclo');document.querySelector('.timeline-body').inert=folded;});
  document.querySelectorAll('[data-hour]').forEach(b=>b.addEventListener('click',()=>{targetHour={from:state.hour,to:Number(b.dataset.hour),elapsed:0};state.playing=false;updateReadouts();}));
  $('phase').addEventListener('input',e=>selectPhase(Number(e.target.value)/1000));document.querySelectorAll('[data-phase]').forEach(b=>b.addEventListener('click',()=>selectPhase(Number(b.dataset.phase),true)));
  $('duration').addEventListener('input',e=>{state.duration=Number(e.target.value);$('duration-value').textContent=`${state.duration} min`;save();});
  document.querySelectorAll('[data-path]').forEach(b=>b.addEventListener('click',()=>{state.path=Number(b.dataset.path);document.querySelectorAll('[data-path]').forEach(el=>el.setAttribute('aria-pressed',el===b));}));
  $('milky').addEventListener('change',e=>{state.milky=e.target.checked;save();});
  $('fov').addEventListener('input',e=>{if(state.scope)return;state.fov=Number(e.target.value);$('fov-value').textContent=state.fov+'°';save();});
  $('speed').addEventListener('input',e=>{state.speed=Number(e.target.value);walker.speed=state.speed;$('speed-value').textContent=state.speed.toFixed(1)+'×';save();});
  $('volume').addEventListener('input',e=>{state.volume=Number(e.target.value)/100;audio.setVolume(state.volume);$('volume-value').textContent=Math.round(state.volume*100)+' %';save();});
  $('sway').addEventListener('change',e=>{state.sway=e.target.checked;walker.sway=state.sway;save();});
  $('view-mode').addEventListener('change',e=>{state.viewMode=e.target.value;syncViewMode();save();});
  graphics.bind($('performance-settings'));
  $('sound-button').addEventListener('click',()=>{audio.setMuted(!audio.muted);icon($('sound-button'),audio.muted?'mute':'volume');$('sound-button').setAttribute('aria-pressed',!audio.muted);$('sound-button').setAttribute('aria-label',audio.muted?'Activar ambiente':'Silenciar ambiente');if(!audio.muted)audio.start();});
  $('reset-position').addEventListener('click',()=>{expedition.exitSeat();leaveVehicle(true);vehicle.parkAt(state.destination==='moon'?-8:-7,state.destination==='moon'?1.8:-2);walker.resetPosition();toast(state.destination==='moon'?'De nuevo en el punto de llegada.':'De nuevo en el centro de la pradera.');});
  $('scope-button').addEventListener('click',()=>setScope(!state.scope));document.querySelectorAll('[data-zoom]').forEach(b=>b.addEventListener('click',()=>setZoom(Number(b.dataset.zoom))));
  $('aim-moon').addEventListener('click',()=>{if(state.destination==='earth'&&sky.moon.y<.008){toast('La Luna está bajo el horizonte. Avanza hacia la noche.');return;}walker.aim(sky.moon);});
  $('hide-ui').addEventListener('click',()=>hideUI(true));$('show-ui').addEventListener('click',()=>hideUI(false));
  window.addEventListener('keydown',e=>{if(state.expeditionPanel)return;if(state.inventory&&e.code==='Tab'){inventory.trapTab(e,$('inventory-close'));return;}if(!state.active||e.repeat||e.metaKey||e.ctrlKey||e.altKey)return;const tag=e.target.tagName;if(tag==='SELECT'||tag==='TEXTAREA'||e.target.isContentEditable||(tag==='INPUT'&&!['range','checkbox'].includes(e.target.type)))return;
    if(state.inventory){
      inventory.trapTab(e,$('inventory-close'));
      if(e.code==='Escape'||e.code==='KeyB'||e.code==='KeyE'){e.preventDefault();setInventory(false);}
      else if(/^Digit[0-9]$/.test(e.code)){e.preventDefault();inventory.hotkey((Number(e.code.slice(-1))+9)%10);}
      return;
    }
    if(state.hiddenUI){
      if(e.code==='Escape'||e.code==='F1'){e.preventDefault();hideUI(false);}
      else if(e.code==='KeyF'&&state.viewMode!=='clean'){e.preventDefault();useLight();}
      else if(e.code==='KeyE'&&state.viewMode==='explore'){e.preventDefault();if(!expedition.interact()){if(vehicle.mounted)leaveVehicle();else if(vehicle.canEnter(camera,walker))enterVehicle();}}
      return;
    }
    if(e.code==='KeyB'){e.preventDefault();setInventory(true);return;}
    if(e.code==='Escape'){if(state.panel)setPanel(false);else if(state.scope)setScope(false);else if(state.hiddenUI)hideUI(false);}
    if(e.code==='KeyE'&&!state.panel){e.preventDefault();if(!expedition.interact()){if(vehicle.mounted)leaveVehicle();else if(vehicle.canEnter(camera,walker))enterVehicle();else setInventory(true);}}
    if(e.code==='KeyF'&&!state.panel){e.preventDefault();useLight();}
    if(e.code==='KeyT'&&!state.panel){e.preventDefault();setScope(!state.scope);}
    if(e.code==='F1'){e.preventDefault();hideUI(!state.hiddenUI);}
    if(e.code==='KeyM')$('sound-button').click();
    if(tag!=='INPUT'&&/^Digit[0-9]$/.test(e.code)&&!state.panel){e.preventDefault();const key=Number(e.code.slice(-1));if(state.scope&&key<4)setZoom(key);else inventory.select((key+9)%10);}

  });
  window.addEventListener('wheel',e=>{if(!state.active||state.hiddenUI||state.inventory||state.panel||state.expeditionPanel||state.scope||e.target.closest?.('input,button,.build-controls'))return;e.preventDefault();inventory.select((inventory.selected+(e.deltaY>0?1:9))%10);},{passive:false});
  // Keep sliders keyboard-operable, while mouse/touch release doesn't trap WASD.
  document.querySelectorAll('input[type=range]').forEach(input=>input.addEventListener('pointerup',()=>input.blur()));
  document.addEventListener('pointerdown',e=>{if(state.panel&&!$('settings').contains(e.target)&&!$('settings-button').contains(e.target))setPanel(false,false);});
  updateReadouts();
}
function setPanel(open,focus=true){if(open&&state.inventory)setInventory(false);state.panel=open;showSurface($('settings'),open);$('settings-button').setAttribute('aria-expanded',open);document.body.classList.toggle('panel-open',open);walker.enabled=state.active&&!open&&!state.inventory;walker.resetInput();if(open){if(document.pointerLockElement)document.exitPointerLock();if(focus)$('close-settings').focus();}else if(focus)$('settings-button').focus();}
function hideUI(hidden){
  if(hidden){if(state.inventory)setInventory(false);if(state.expeditionPanel)expedition.closeDialog();if(state.scope)setScope(false);setPanel(false,false);expedition?.actionHeld(false);expedition?.clearPreview();if(expedition)expedition.near=null;}
  state.hiddenUI=hidden;document.body.classList.toggle('ui-hidden',hidden);syncViewMode();walker.resetInput();$('show-ui').hidden=!hidden;
  if(hidden)$('show-ui').focus();else $('world').focus({preventScroll:true});
}
function syncViewMode(){
  document.body.dataset.viewMode=state.viewMode;$('hud').inert=state.hiddenUI&&state.viewMode==='clean';$('view-mode').value=state.viewMode;
  $('view-mode-note').textContent={clean:'Solo el ojo para volver a los controles. Arrastra para mirar.',walk:'Ojo, joystick y linterna. Camina y mira sin el resto de la interfaz.',explore:'Ojo, joystick, linterna, correr y saltar. Permite sentarse y salir de sillas y vehículos; al conducir muestra faros e impulso.'}[state.viewMode];
}
function setScope(on){if(!on&&state.mountedScope){expedition.exitSeat();return;}if(on)expedition?.cancelBuild();state.scope=on;document.body.classList.toggle('using-scope',on);$('lens').classList.toggle('active',on);showSurface($('scope-controls'),on);$('scope-button').setAttribute('aria-pressed',on);$('scope-button').setAttribute('aria-label',on?'Guardar telescopio':'Usar telescopio');$('scope-label').textContent=on?'Guardar':'Telescopio';$('fov').disabled=on;$('fov-note').textContent=on?'Guarda el telescopio para cambiar el campo de visión.':'Se ajusta con el telescopio guardado.';if(on)walker.resetInput();}
function setZoom(level){state.zoom=level;document.querySelectorAll('[data-zoom]').forEach(b=>b.setAttribute('aria-pressed',Number(b.dataset.zoom)===level));}
function syncPreferences(){syncViewMode();document.querySelectorAll('[data-moon-look]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.moonLook===state.moonAppearance));for(const id of ['fov','speed','duration'])$(id).value=state[id];$('volume').value=Math.round(state.volume*100);$('milky').checked=state.milky;$('sway').checked=state.sway;$('fov-value').textContent=state.fov+'°';$('speed-value').textContent=state.speed.toFixed(1)+'×';$('volume-value').textContent=Math.round(state.volume*100)+' %';$('duration-value').textContent=state.duration+' min';if(mobile)$('device-hint').textContent='Joystick para caminar · Arrastra para mirar';}
function updateReadouts(){
  const h=state.hour%24,m=Math.floor(h*60),time=`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
  $('clock').textContent=time;$('time').value=state.hour;$('time').setAttribute('aria-valuetext',time);
  $('moment-name').textContent=h<4.8||h>20?'Bajo las estrellas':h<6?'Antes del amanecer':h<7.5?'La primera luz':h<16.7?'A cielo abierto':h<18?'Luz de la tarde':h<19?'El último resplandor':'La hora azul';
  icon($('play'),state.playing?'pause':'play');$('play').setAttribute('aria-pressed',state.playing);$('play').setAttribute('aria-label',state.playing?'Pausar ciclo':'Reproducir ciclo');$('timeline-status').textContent=state.playing?`Un día en ${state.duration} min`:'El tiempo está en tus manos';
  const deg=(((walker?.yaw||0)*180/Math.PI)%360+360)%360;const labels=['N','NE','E','SE','S','SO','O','NO'];$('bearing').textContent=labels[Math.round(deg/45)%8];$('degrees').textContent=Math.round(deg)%360+'°';
  if(state.destination==='moon'){$('clock').textContent=Math.round(state.hour/24*100)+' %';$('time').setAttribute('aria-valuetext','Ciclo lunar, '+Math.round(state.hour/24*100)+' por ciento');$('moment-name').textContent=sky.sun.y>.01?'Bajo el Sol':sky.illumination>.12?'La luz de la Tierra':'La noche lunar';$('timeline-status').textContent=state.playing?`Un ciclo lunar en ${state.duration} min`:'29,53 días terrestres · ciclo libre';if(elapsed>=phaseControlUntil)$('phase').value=state.phase*1000;}
  const illuminated=Math.round((1-Math.cos(state.phase*Math.PI*2))*.5*100),name=state.destination==='moon'?phaseName(state.phase).replace('Luna','Tierra'):phaseName(state.phase);$('phase-value').textContent=illuminated+' % iluminada';$('phase-name').innerHTML=`${name}<small>La luz recorre su superficie.</small>`;$('phase').setAttribute('aria-valuetext',`${name}, ${illuminated} por ciento iluminada`);
  if(state.panel&&!$('sky-settings').hidden)drawPhase();
}
function setupMoonPreview(image){const c=document.createElement('canvas');c.width=256;c.height=128;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,256,128);phaseImageData=ctx.getImageData(0,0,256,128).data;lastPreviewKey='';drawPhase();}
function drawPhase(){if(!phaseImageData)return;const lunar=state.destination==='moon',key=state.destination+':'+(lunar?state.hour:state.phase).toFixed(4);if(key===lastPreviewKey)return;lastPreviewKey=key;
  const c=$('phase-preview'),ctx=c.getContext('2d'),n=104,data=previewBuffer||(previewBuffer=ctx.createImageData(n,n)),a=state.phase*Math.PI*2;
  const light=lunar?sky.u.earthLight.value:null,lx=light?.x??Math.sin(a),ly=light?.y??.025,lz=light?.z??-Math.cos(a),norm=Math.hypot(lx,ly,lz)||1,spin=lunar?sky.u.earthSpin.value+.01:0,tilt=lunar?.4091:0,ct=Math.cos(tilt),st=Math.sin(tilt);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){const px=(x+.5-n/2)/(n/2-2),py=(n/2-y-.5)/(n/2-2),rr=px*px+py*py;if(rr>=1)continue;const z=Math.sqrt(1-rr),dot=(px*lx+py*ly+z*lz)/norm,mx=px*ct-py*st,my=px*st+py*ct;
    const u=(1.5+spin+Math.atan2(mx,z)/(Math.PI*2))%1,v=.5-Math.asin(clamp(my,-1,1))/Math.PI;
    const src=(clamp(Math.floor(v*128),0,127)*256+clamp(Math.floor(u*256),0,255))*4,dst=(y*n+x)*4,edge=smooth(lunar?-.07:-.055,lunar?.09:.070,dot),k=(.18+.82*Math.sqrt(Math.max(0,dot)))*edge+(lunar?0:.018)*(1-edge);for(let b=0;b<3;b++)data.data[dst+b]=phaseImageData[src+b]*k*1.4;data.data[dst+3]=255;}ctx.putImageData(data,0,0);
}
function failGraphics(error){
  if(!globalThis.__skyWebGPU)return false;
  if(contextLost)return true;contextLost=true;renderer?.setAnimationLoop(null);walker?.resetInput();audio?.pause();
  // Flush existing formats before the single recovery reload. No data migration.
  save();inventory?.save();expedition?.science.save();for(const env of Object.values(environments))env.world?.save();
  return recoverGraphics(error);
}
function frame(now,xrFrame){
 try{renderFrame(now,xrFrame);}catch(error){if(!failGraphics(error)){renderer?.setAnimationLoop(null);console.error(error);toast('No se pudo dibujar el paisaje. Recarga para recuperarlo.');}}
}
function renderFrame(now,xrFrame){
  if((document.hidden&&!vr?.active)||contextLost)return;
  if(switching||!scene){if(vr?.active)vr.renderLoading(xrFrame,1/72,now/1000);frameTime=nextFrame=0;return;}
  // ProMotion callbacks may arrive at 120 Hz. Submit at most 60 actual game
  // frames; menus need only 30 and the inactive destination selector only 20.
  const interval=vr?.active?0:1000/(!state.active?20:state.panel||state.inventory||state.expeditionPanel?30:60);
  if(interval!==frameInterval){frameInterval=interval;nextFrame=now;frameTime=0;}
  if(interval){if(now+.35<nextFrame)return;if(now-nextFrame>interval)nextFrame=now;nextFrame+=interval;}
  const raw=frameTime?(now-frameTime)/1000:1/60;const dt=Math.min(.05,raw);frameTime=now;elapsed+=dt;
  if(targetHour){targetHour.elapsed+=dt;const p=clamp(targetHour.elapsed/(targetHour.duration||.9)),s=p*p*(3-2*p);state.hour=cycleHour(targetHour.from+(targetHour.to-targetHour.from)*s);if(p===1)targetHour=null;}
  else if(state.active&&state.playing)state.hour=cycleHour(state.hour+state.direction*Math.min(raw,1)*24/(state.duration*60));
  if(state.destination==='earth'){state.phase+=(state.targetPhase-state.phase)*(1-Math.exp(-dt*10));if(Math.abs(state.targetPhase-state.phase)<.00001)state.phase=state.targetPhase;}
  const reveal=state.scope?state.zoom/3:0;state.zoomReveal+=(reveal-state.zoomReveal)*(1-Math.exp(-dt*5));
  const desired=targetFov();if(!vr?.active&&camera.fov!==desired){camera.fov=Math.exp(Math.log(camera.fov)+(Math.log(desired)-Math.log(camera.fov))*(1-Math.exp(-dt*(reduced?20:5))));if(Math.abs(camera.fov-desired)<.0001)camera.fov=desired;camera.updateProjectionMatrix();}
  walker.sensitivity=state.scope&&!vr?.active?Math.max(.008,Math.tan(camera.fov*Math.PI/360)/Math.tan(state.fov*Math.PI/360)):1;vr?.beforeFrame(xrFrame,dt,elapsed,raw);expedition.beforeMotion();walker.update(dt);expedition.afterMotion();
  if(!vehicle.mounted){vehicle.integrate(dt,0,0,state.active&&!state.panel&&!state.inventory);if(!walker.driver)vehicle.collideWalker(walker);if(!walker.driver){camera.position.x=walker.pos.x;camera.position.z=walker.pos.z;}}
  vr?.afterMotion();vehicle.updateLighting(dt);state.headlightExposure=Math.max(vehicle.exposure(camera),environments[state.destination].world.lights.exposure(camera));
  renderer.info?.reset?.();sky.update(camera,state,elapsed,skyPixelRatio());expedition.update(elapsed,dt,skyPixelRatio());environments[state.destination].world.lights.prepare(renderer,environments[state.destination].world,camera);terrain.prepareLighting?.(renderer,camera,sky);terrain.update(camera,sky,elapsed,state);vehicle.updateAppearance(sky,camera,state,dt);audio.update(elapsed,sky.night,state.hour);motor.update(vehicle);if(!vr?.active)updateVehiclePrompt();vr?.update(dt,elapsed);landscape.render(scene,vr?.active?vr.view:camera);expedition?.renderOverlay();
  uiTime+=dt;if(uiTime>.12){uiTime=0;updateReadouts();updateVehicleUI();}
  graphicsInfo.skyPixelRatio=skyPixelRatio();graphicsInfo.residentWorlds=Object.keys(environments);graphicsInfo.frameLimit=vr?.active?(vr.session?.frameRate||72):1000/frameInterval;
  graphicsInfo.cachedShadows=environments[state.destination].world.lights.u.baseShadowReady.value>.5;
  if(!vr?.active){graphics.sample(raw,state.active&&!state.panel&&!state.inventory&&!state.expeditionPanel);graphics.updateHUD(now,renderer,graphicsInfo);}else{graphicsInfo.averageFrameMs=vr.averageMs||null;graphicsInfo.drawCalls=renderer.info.render.calls;graphicsInfo.profile=graphics.settings.profile;}

}
window.addEventListener('sky-before-update',()=>{save();inventory?.save();expedition?.science.save();for(const env of Object.values(environments))env.world?.save();});
function registerSkyTools(){
  window.addEventListener('expedition-import',()=>{for(const name of Object.keys(destinationSaves))delete destinationSaves[name];for(const [name,env] of Object.entries(environments)){const data=localStorage.getItem('sky-vr-expedition-world-'+name+'-v1');if(data&&env.world)env.world.load(JSON.parse(data));if(env.celestial)env.celestial.setDate(localStorage.getItem('sky-vr-expedition-date'));}expedition.activate();});
  const context=document.modelContext;if(!context?.registerTool)return;
  const lifecycle=new AbortController();window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
  const snapshot=()=>({destination:state.active?state.destination:'selector',hour:Number(state.hour.toFixed(3)),phase:Number(state.phase.toFixed(3)),playing:state.playing,telescope:state.scope,zoom:state.zoom});
  const definitions=[
    {name:'read_sky_state',title:'Leer estado del cielo',description:'Lee el momento del día, la fase lunar y el telescopio de esta experiencia.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute:()=>snapshot()},
    {name:'set_cycle_time',title:'Elegir hora del ciclo',description:'Mueve el mismo control visible de día y noche y deja el ciclo en pausa. Funciona dentro del destino activo.',inputSchema:{type:'object',properties:{hour:{type:'number',minimum:0,maximum:24}},required:['hour'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:input=>{
      if(!input||typeof input!=='object'||Object.keys(input).length!==1||typeof input.hour!=='number'||!Number.isFinite(input.hour)||input.hour<0||input.hour>24)throw new Error('La hora debe ser un número entre 0 y 24.');
      if(!state.active)throw new Error('Entra a un destino antes de modificar su cielo.');
      $('time').value=input.hour;$('time').dispatchEvent(new Event('input',{bubbles:true}));return snapshot();
    }}
  ];
  for(const tool of definitions){try{Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}}
}
init();
