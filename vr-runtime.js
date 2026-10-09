import * as THREE from './three.module.js?v=4.0.0';
import {WristMenu,VRKeyboard,canvasMesh} from './vr-ui.js';
import {VRMenus} from './vr-menus.js';
import {VROptics} from './vr-optics.js';
import {HandGuide,matteSkin} from './vr-hand-guides.js';
const V=()=>new THREE.Vector3(),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const KEY='sky-vr-controls-v1';
export function deadAxis(v){return Math.abs(v)>.15?Math.sign(v)*(Math.abs(v)-.15)/.85:0;}
export function readPad(source,out){const p=source?.gamepad,axes=p?.axes;out.x=deadAxis(axes?.[2]??0);out.y=deadAxis(axes?.[3]??0);for(let i=0;i<6;i++){const value=p?.buttons[i]?.value||0;out.edge[i]=value>.6&&out.buttons[i]<=.6;out.buttons[i]=value;}return out;}
function pad(){return {x:0,y:0,buttons:new Float32Array(6),edge:Array(6).fill(false),source:null};}
export class VRRuntime{
 constructor(api){this.api=api;this.active=false;this.session=null;this.preferences={swap:false,turnSpeed:65,hands:false,scale:.85,foveation:.45,auto:true};try{const p=JSON.parse(localStorage.getItem(KEY));if(p){for(const k of ['swap','hands','auto'])if(typeof p[k]==='boolean')this.preferences[k]=p[k];for(const [k,min,max]of [['turnSpeed',20,140],['scale',.65,1],['foveation',0,.8]])if(Number.isFinite(p[k]))this.preferences[k]=clamp(p[k],min,max);}}catch{}
 this.foveation=this.preferences.foveation;this.rig=new THREE.Group();this.rig.name='XR · seguimiento';this.view=new THREE.PerspectiveCamera(90,1,.05,18000);this.view.layers.enable(3);this.view.layers.enable(4);this.rig.add(this.view);this.bodyCamera=api.camera.clone();this.aimCamera=new THREE.PerspectiveCamera(75,1,.02,18000);this.aimCamera.userData.xrPointer=true;this.menuAimCamera=this.aimCamera.clone();
 this.headLocal=V();this.lastHead=V();this.seatHead=V();this.roomStep=V();this.headQuaternion=new THREE.Quaternion();this.headEuler=new THREE.Euler(0,0,0,'YXZ');this.move=V();this.oldPosition=V();this.direction=V();this.tmp=V();this.anchor=V();this.q=new THREE.Quaternion();this.matrix=new THREE.Matrix4();this.steerLocal=V();this.steerEuler=new THREE.Euler(0,0,0,'YXZ');this.steerAxis=new THREE.Vector3(1,0,0);this.headSeen=false;this.baseHeight=1.68;this.bodyYaw=0;this.driver=null;this.pause=false;this.reference=null;
 this.menu=new WristMenu();this.keyboard=new VRKeyboard();this.menu.root.add(this.keyboard.mesh);this.keyboard.mesh.position.set(0,-.19,.012);this.menus=new VRMenus(this);this.optics=new VROptics(this);
 this.status=canvasMesh(1000,180,.70,.126);this.status.mesh.visible=false;this.lastStatus='';this.statusAt=0;this.notice='';this.noticeUntil=0;
 this.loadingScene=new THREE.Scene();this.loadingScene.background=new THREE.Color(0x10191c);this.loading=false;this.loadingText='Preparando el paisaje…';
 this.hands={left:this.makeHand('left'),right:this.makeHand('right')};this.pads={left:pad(),right:pad()};this.ray=new THREE.Raycaster();this.hit=null;this.sliderPlane=new THREE.Plane();this.sliderPoint=V();this.sliderNormal=V();this.sliderUV=new THREE.Vector2();this.navigateAt=0;this.actionOn=false;this.previousMenu=false;this.lastProbe=0;this.probeDistance=8;this.samples=0;this.sampleTime=0;this.averageMs=0;this.pressure=0;this.headroom=0;
 this.makeGizmo();this.bindSession();this.bindEntry();
 api.expedition.captureXR=()=>this.active?this.optics.capture():null;
 }
 savePreferences(){try{localStorage.setItem(KEY,JSON.stringify(this.preferences));}catch{}}
 makeHand(side){const grip=new THREE.Group(),ray=new THREE.Group();this.rig.add(grip,ray);const skin=new THREE.CapsuleGeometry(.027,.09,4,8),model=new THREE.Mesh(skin,matteSkin(skin));model.rotation.x=.65;model.layers.set(4);grip.add(model);
 const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(),new THREE.Vector3(0,0,-1)]),new THREE.LineBasicMaterial({color:0x9fd8c4,transparent:true,opacity:.7,depthTest:true,depthWrite:false,toneMapped:false}));line.layers.set(4);ray.add(line);line.scale.z=8;
 const dot=new THREE.Mesh(new THREE.SphereGeometry(.011,8,6),new THREE.MeshBasicMaterial({color:0xe6d3aa,transparent:true,depthWrite:false,toneMapped:false}));dot.layers.set(4);ray.add(dot);dot.position.z=-8;
 const jointGeometry=new THREE.SphereGeometry(1,6,4),joints=new THREE.InstancedMesh(jointGeometry,matteSkin(jointGeometry),25);joints.layers.set(4);joints.frustumCulled=false;joints.visible=false;this.rig.add(joints);
 const guide=new HandGuide(side);return {grip,ray,model,line,dot,joints,guide,tracked:false,bare:false,grabbing:false,grabAngle:0,grabSteer:0,handPitch:0,pinching:false,source:null};}
 makeGizmo(){this.gizmo=new THREE.Group();this.gizmo.visible=false;this.gizmo.name='Ejes de construcción VR';for(const [axis,color,rotation]of [['x',0xe5a18f,[0,Math.PI/2,0]],['y',0x98d9ba,[Math.PI/2,0,0]],['z',0x98bdea,[0,0,0]]]){const ring=new THREE.Mesh(new THREE.TorusGeometry(1,.012,6,64),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.7,depthTest:true,depthWrite:false,toneMapped:false}));ring.rotation.set(...rotation);ring.userData.axis=axis;this.gizmo.add(ring);}this.box=new THREE.Box3();}
 bindSession(){const xr=this.api.renderer.xr;xr.addEventListener('sessionstart',()=>this.start());xr.addEventListener('sessionend',()=>this.end());window.addEventListener('pagehide',()=>this.reset());}
 async bindEntry(){const b=document.getElementById('enter-vr');b.disabled=true;try{const supported=isSecureContext&&await navigator.xr?.isSessionSupported('immersive-vr');b.disabled=!supported;b.textContent=supported?'Entrar en VR · Quest':'VR requiere navegador compatible';document.body.classList.toggle('xr-capable',!!supported);document.body.classList.toggle('vr-unsupported-touch',!supported&&matchMedia('(pointer:coarse)').matches);this.supported=!!supported;}catch(e){console.warn('[VR] Detección',e);b.textContent='VR no disponible';}b.onclick=()=>this.enter();document.getElementById('enter-vr-hud').onclick=()=>this.enter();}
 async enter(){if(this.active||this.entering)return;this.entering=true;const b=document.getElementById('enter-vr');b.disabled=true;this.api.getEnv()?.audio.start();try{this.api.renderer.xr.setFramebufferScaleFactor(this.preferences.scale);this.api.renderer.xr.setFoveation(this.preferences.foveation);const session=await navigator.xr.requestSession('immersive-vr',{requiredFeatures:['local-floor'],optionalFeatures:this.preferences.hands?['hand-tracking']:[]});this.session=session;await this.api.renderer.xr.setSession(session);if(session.supportedFrameRates?.includes(72))await session.updateTargetFrameRate(72).catch(e=>console.warn('[VR] Frecuencia nativa conservada',e));if(!this.api.state.active)await this.changeDestination(this.api.state.destination);this.api.getEnv()?.audio.start();}catch(e){console.error('[VR] No se pudo entrar',e);this.api.toast('No se pudo iniciar VR: '+e.message);if(this.session&&!this.active)this.session.end().catch(()=>{});}finally{this.entering=false;b.disabled=!this.supported;}}
 start(){this.active=true;this.session=this.api.renderer.xr.getSession();this.reference=this.api.renderer.xr.getReferenceSpace();this.reference?.addEventListener('reset',()=>this.recenter());const a=this.api;this.pcSway=a.walker.sway;a.walker.sway=false;a.walker.camera=this.bodyCamera;this.bodyCamera.copy(a.camera);this.bodyYaw=a.walker.yaw;this.headSeen=false;this.driver=a.walker.driver;a.state.xr=true;a.state.hiddenUI=false;a.state.xrMenu=false;a.expedition.xrAimCamera=this.aimCamera;document.body.classList.add('in-xr');a.setScope(false);if(a.state.panel)a.setPanel(false);if(a.state.inventory)a.setInventory(false);this.reset();this.attach();this.session.addEventListener('visibilitychange',()=>{this.pause=this.session?.visibilityState!=='visible';this.reset();});this.session.addEventListener('inputsourceschange',()=>{this.actionOn=false;a.expedition.actionHeld(false);});window.SkyDiagnostics.xr=true;this.noticeText('Y · Menú   X · Interactuar   A · Saltar');this.menus.controls();this.menu.toggle(true);}
 end(){const a=this.api;this.active=false;a.state.xr=a.state.xrMenu=false;a.expedition.xrAimCamera=null;this.detach();a.walker.camera=a.camera;a.walker.sway=this.pcSway;a.walker.resetInput();a.walker.pitch=0;a.walker.enabled=a.state.active&&!a.state.expeditionPanel;document.body.classList.remove('in-xr');this.session=null;this.menu.toggle(false);this.optics.release();a.setScope(false);a.resize();window.SkyDiagnostics.xr=false;this.reset();a.walker.update(0);}
 reset(){this.menu.panel.endSlider();this.hit=null;this.api.walker.resetInput();this.api.expedition.actionHeld(false);this.actionOn=false;for(const side of ['left','right']){this.pads[side].buttons.fill(0);this.pads[side].edge.fill(false);this.hands[side].grabbing=false;this.pads[side].x=this.pads[side].y=0;}this.sampleTime=this.samples=this.pressure=this.headroom=0;}
 attach(){const scene=this.api.getEnv()?.scene;if(!scene||!this.active)return;scene.add(this.rig,this.menu.root,this.status.mesh,this.gizmo,this.hands.left.guide.mesh,this.hands.right.guide.mesh);this.optics.attach(scene);}
 detach(){for(const o of [this.rig,this.menu.root,this.status.mesh,this.gizmo,this.hands.left.guide.mesh,this.hands.right.guide.mesh])o.removeFromParent();this.optics.detach();}
 recenter(){this.headSeen=false;this.reset();this.noticeText('Postura recentrada');}
 async changeDestination(name){if(this.loading)return;this.loading=true;this.loadingText='Preparando '+(name==='moon'?'la Luna':'la Tierra')+'…';this.reset();this.detach();for(const h of Object.values(this.hands))h.grip.visible=h.ray.visible=h.joints.visible=false;this.loadingScene.add(this.rig,this.status.mesh);this.menu.toggle(false);try{await this.api.enterDestination(name);}finally{this.loading=false;this.attach();this.recenter();this.bodyYaw=this.api.walker.yaw;this.noticeText(name==='moon'?'Luna · Y abre el menú':'Tierra · Y abre el menú');}}
 noticeText(text){this.notice=String(text);this.noticeUntil=performance.now()+4000;}
 updatePose(frame){const pose=frame?.getViewerPose(this.reference);if(!pose){this.pause=true;this.reset();return false;}this.pause=this.session?.visibilityState!=='visible';this.headLocal.copy(pose.transform.position);this.headQuaternion.copy(pose.transform.orientation);this.headEuler.setFromQuaternion(this.headQuaternion,'YXZ');if(!this.headSeen){this.lastHead.copy(this.headLocal);this.seatHead.copy(this.headLocal);this.baseHeight=Math.max(.6,this.headLocal.y);this.headSeen=true;}return true;}
 pollHands(frame){for(const side of ['left','right']){const h=this.hands[side],p=this.pads[side];h.source=p.source=null;h.tracked=false;h.bare=false;h.pinching=false;h.grip.visible=h.ray.visible=h.joints.visible=false;}
 for(const source of this.session.inputSources){const side=source.handedness,h=this.hands[side];if(!h)continue;const p=this.pads[side];h.source=p.source=source;
 if(source.hand){h.bare=true;if(!this.preferences.hands||!this.api.getEnv()?.vehicle.mounted)continue;let i=0,valid=true;for(const joint of source.hand.values()){const pose=frame.getJointPose(joint,this.reference);if(!pose){valid=false;break;}this.matrix.compose(pose.transform.position,pose.transform.orientation,this.tmp.setScalar(pose.radius||.009));h.joints.setMatrixAt(i++,this.matrix);}h.joints.visible=valid;h.joints.instanceMatrix.needsUpdate=true;if(!valid)continue;const wrist=frame.getJointPose(source.hand.get('wrist'),this.reference),thumb=frame.getJointPose(source.hand.get('thumb-tip'),this.reference),index=frame.getJointPose(source.hand.get('index-finger-tip'),this.reference);if(wrist&&thumb&&index){h.grip.position.copy(wrist.transform.position);h.grip.quaternion.copy(wrist.transform.orientation);h.tracked=true;h.pinching=this.tmp.copy(thumb.transform.position).distanceTo(index.transform.position)<.035;}continue;}
 const grip=source.gripSpace&&frame.getPose(source.gripSpace,this.reference),ray=frame.getPose(source.targetRaySpace,this.reference);if(grip){h.grip.position.copy(grip.transform.position);h.grip.quaternion.copy(grip.transform.orientation);h.grip.visible=true;}if(ray){h.ray.position.copy(ray.transform.position);h.ray.quaternion.copy(ray.transform.orientation);h.ray.visible=true;h.tracked=true;}
 }
 for(const side of ['left','right'])readPad(this.hands[side].tracked&&!this.hands[side].bare?this.pads[side].source:null,this.pads[side]);
 }
 beforeFrame(frame,dt,time,raw=dt){if(!this.active)return;if(!this.updatePose(frame))return;this.pollHands(frame);const a=this.api,w=a.walker,vehicle=a.getEnv().vehicle,l=this.pads.left,r=this.pads.right;
 if(this.pause){this.reset();return;}
 if(l.edge[5]){if(this.keyboard.mesh.visible)this.keyboard.close(false);else{this.menu.toggle();if(!this.menu.open&&a.state.expeditionPanel)a.expedition.closeDialog();if(this.menu.open&&!a.state.expeditionPanel)this.menus.home();}}
 const blocked=this.menu.open||a.state.expeditionPanel||this.loading;
 if(blocked!==this.previousMenu){if(blocked)this.menuAimCamera.copy(this.aimCamera);w.resetInput();a.expedition.actionHeld(false);this.actionOn=false;this.previousMenu=blocked;}w.enabled=a.state.active&&!blocked; a.state.xrMenu=blocked;
 if(blocked){w.joy.x=w.joy.y=0;w.sprintHeld=false;this.navigate(l,dt,time);if(this.menu.panel.dragging&&r.buttons[0]<=.6)this.menu.panel.endSlider();if(l.edge[0]||r.edge[4]||r.edge[0]){if(!(r.edge[0]&&this.hit?.type==='panel'&&this.menu.panel.beginSlider(this.hit.entry)))this.confirm();}}
 else{
 const move=this.preferences.swap?r:l,turn=this.preferences.swap?l:r;
 if(r.edge[5]){a.setScope(!a.state.scope);if(a.state.scope&&a.state.zoom===0)a.setZoom(1);}
 if(a.state.scope&&Math.abs(turn.y)>.65&&time-this.navigateAt>.28){a.setZoom(clamp(a.state.zoom+(turn.y<0?1:-1),0,3));this.navigateAt=time;}
 const rotate=a.expedition.buildMode&&l.buttons[1]>.6&&!vehicle.mounted;
 if(rotate){const x=a.expedition;if(!x.rotationLock&&x.proposal)x.rotationLock={position:x.proposal.position.clone(),params:{...x.proposal.params},hit:x.proposal.hit};x.xrRotationHeld=true;x.rotateFree(x.axis,turn.x*dt*1.2);if(r.edge[3])x.axis=['x','y','z'][(['x','y','z'].indexOf(x.axis)+1)%3];}
 else{a.expedition.xrRotationHeld=false;this.bodyYaw+=turn.x*this.preferences.turnSpeed*Math.PI/180*dt;}
 w.yaw=this.bodyYaw-this.headEuler.y;w.pitch=this.headEuler.x;this.inputYaw=w.yaw;
 w.joy.x=move.x;w.joy.y=-move.y;w.sprintHeld=r.buttons[0]>.1;
 if(r.edge[4])w.jump();if(l.edge[4])this.interact();
 if(!vehicle.mounted){const held=l.buttons[0]>.6;if(held!==this.actionOn){if(held&&a.state.scope)a.expedition.science.observe(a.expedition.target);else a.expedition.actionHeld(held);this.actionOn=held;}if(r.edge[1])a.useLight();}
 }
 // Room-scale head movement follows the same collision capsule as locomotion.
 if(!w.driver){this.move.copy(this.headLocal).sub(this.lastHead);this.move.y=0;if(this.move.lengthSq()>1e-10&&this.move.lengthSq()<1){this.move.applyAxisAngle(THREE.Object3D.DEFAULT_UP,-this.bodyYaw);const steps=Math.max(1,Math.ceil(this.move.length()/.08));this.roomStep.copy(this.move).multiplyScalar(1/steps);for(let i=0;i<steps;i++){this.oldPosition.copy(w.pos);w.pos.add(this.roomStep);a.getEnv().world.collide(w.pos,this.oldPosition);}}}
 this.lastHead.copy(this.headLocal);w.sway=false;this.driverChanged();this.updateRig();
 if(vehicle.mounted)this.driveInputs(vehicle,dt,blocked);
 this.sample(raw,blocked);
 }
 driverChanged(){const driver=this.api.walker.driver;if(driver!==this.driver){this.driver=driver;this.seatHead.copy(this.headLocal);this.baseHeight=this.headLocal.y||1.68;this.bodyYaw=this.api.walker.yaw+this.headEuler.y;for(const h of Object.values(this.hands))h.grabbing=false;}}
 updateRig(){const w=this.api.walker;this.rig.rotation.set(0,-this.bodyYaw,0);this.tmp.copy(w.driver?this.seatHead:this.headLocal);this.tmp.y=0;this.tmp.applyAxisAngle(THREE.Object3D.DEFAULT_UP,-this.bodyYaw);this.rig.position.set(w.pos.x-this.tmp.x,w.pos.y-(w.driver?this.baseHeight:1.68),w.pos.z-this.tmp.z);this.rig.updateMatrixWorld(true);}
 afterMotion(){if(!this.active)return;const a=this.api;this.bodyYaw+=Number.isFinite(this.inputYaw)?a.walker.yaw-this.inputYaw:0;this.inputYaw=a.walker.yaw;this.updateRig();a.renderer.xr.updateCamera(this.view);this.view.getWorldPosition(a.camera.position);this.view.getWorldQuaternion(a.camera.quaternion);a.camera.projectionMatrix.copy(this.view.projectionMatrix);a.camera.projectionMatrixInverse.copy(this.view.projectionMatrixInverse);a.camera.fov=this.view.fov;a.camera.updateMatrixWorld(true);
 const right=this.hands.right;if(right.tracked&&!right.bare){right.ray.getWorldPosition(this.aimCamera.position);right.ray.getWorldQuaternion(this.aimCamera.quaternion);}else{this.aimCamera.position.copy(a.camera.position);this.aimCamera.quaternion.copy(a.camera.quaternion);}this.aimCamera.updateMatrixWorld(true);a.expedition.xrAimCamera=a.state.scope?this.optics.aim():this.aimCamera;
 }
 navigate(p,dt,time){if(this.keyboard.mesh.visible){if(time-this.navigateAt>.18&&(Math.abs(p.x)>.65||Math.abs(p.y)>.65)){const d=Math.abs(p.y)>Math.abs(p.x)?(p.y>0?10:-10):(p.x>0?1:-1);this.keyboard.index=(this.keyboard.index+d+this.keyboard.hits.length)%this.keyboard.hits.length;this.keyboard.draw();this.navigateAt=time;}return;}
 if(this.menu.mode==='radial'){this.menu.stick(p.x,p.y);return;}if(time-this.navigateAt<.18)return;if(Math.abs(p.y)>.6){this.menu.panel.navigate(p.y>0?1:-1);this.navigateAt=time;}else if(Math.abs(p.x)>.6){this.menu.panel.adjust(p.x>0?1:-1);this.navigateAt=time;}}
 confirm(){if(this.keyboard.mesh.visible){this.keyboard.press(this.hit?.type==='keyboard'?this.hit.entry:null);return;}if(this.menu.mode==='radial'){this.menus.category(this.menu.index);return;}this.menu.panel.activate(this.hit?.type==='panel'?this.hit.entry:null);}
 withWorldAim(action){const x=this.api.expedition,old=x.xrAimCamera;x.xrAimCamera=this.menuAimCamera;try{return action();}finally{x.xrAimCamera=old;}}
 interact(){const a=this.api,w=a.walker;w.enabled=a.state.active;if(a.getEnv().vehicle.mounted)a.leaveVehicle();else if(a.expedition.seated)a.expedition.exitSeat();else{a.expedition.updateInteraction(true);if(!a.expedition.interact()){if(a.getEnv().vehicle.canEnter(a.camera,w))a.enterVehicle();else this.noticeText('Acércate y apunta con el mando derecho.');}}this.driverChanged();}
 driveInputs(vehicle,dt,blocked){const l=this.pads.left,r=this.pads.right,w=this.api.walker;let steering=(this.preferences.swap?r:l).x,total=0,count=0,bareCount=0,palm=0;
 for(const side of ['left','right']){const h=this.hands[side],p=this.pads[side];if(!h.tracked){h.grabbing=false;continue;}h.grip.getWorldPosition(this.tmp);vehicle.root.worldToLocal(this.tmp);this.tmp.sub(vehicle.model.steering.position);if(vehicle.lunar)this.tmp.applyAxisAngle(this.steerAxis,.4);const near=vehicle.lunar?Math.abs(this.tmp.length()-.15)<.22:Math.abs(this.tmp.x)<.67&&Math.abs(this.tmp.y)<.28&&Math.abs(this.tmp.z)<.4;
 const held=h.bare?h.pinching:p.buttons[1]>.6,angle=vehicle.lunar?Math.atan2(this.tmp.y,this.tmp.x):Math.atan2(this.tmp.x,Math.max(.1,-this.tmp.z+.45));
 if(held&&!h.grabbing&&near&&!blocked){h.grabbing=true;h.grabAngle=angle;h.grabSteer=vehicle.steer/.56;h.handPitch=this.steerEuler.setFromQuaternion(h.grip.quaternion,'YXZ').x;}
 if(!held||blocked)h.grabbing=false;
 if(h.grabbing){const delta=Math.atan2(Math.sin(angle-h.grabAngle),Math.cos(angle-h.grabAngle));total+=clamp(h.grabSteer+(vehicle.lunar?-delta:delta)*1.6,-1,1);count++;if(h.bare){bareCount++;palm+=this.steerEuler.setFromQuaternion(h.grip.quaternion,'YXZ').x-h.handPitch;}}
 if(side==='right'&&p.edge[1]&&!h.grabbing&&!blocked)this.api.useLight();
 }
 if(count)steering=total/count;let throttle=r.buttons[0],brake=l.buttons[0];const reverse=(this.preferences.swap?r:l).y>.55;if(reverse)throttle=-throttle;
 if(bareCount){throttle=bareCount===2?clamp(-palm/2/.45,0,1)*.55:0;brake=bareCount===2?clamp(palm/2/.30,0,1):1;}
 else if(this.hands.left.bare||this.hands.right.bare){throttle=0;brake=1;}
 if(blocked){throttle=0;brake=1;steering=0;}
 if(brake>.08){throttle=0;vehicle.speed=Math.sign(vehicle.speed)*Math.max(0,Math.abs(vehicle.speed)-brake*12*dt);}
 w.joy.y=throttle;w.joy.x=steering;w.sprintHeld=!blocked&&((l.buttons[1]>.6&&!this.hands.left.grabbing)||l.buttons[3]>.6);vehicle.setBoost(w.sprintHeld);
 }
 update(dt,time){if(!this.active)return;const a=this.api;if(this.loading)return;this.menus.update(time);this.optics.update(dt,time);
 const hand=this.hands.left;if(hand.tracked)hand.grip.getWorldPosition(this.anchor);else this.anchor.set(-.32,-.37,-.6).applyQuaternion(a.camera.quaternion).add(a.camera.position);
 this.menu.update(dt,this.anchor,a.camera.position);this.menu.root.updateMatrixWorld(true);this.hit=null;
 const right=this.hands.right,overUI=this.menu.root.visible;
 if(right.tracked&&!right.bare){
  this.ray.set(this.aimCamera.position,this.aimCamera.getWorldDirection(this.direction));this.ray.far=8;this.ray.layers.set(4);
  if(overUI){
   const target=this.keyboard.mesh.visible?this.keyboard.mesh:this.menu.mode==='radial'?this.menu.radial.mesh:this.menu.panel.mesh;
   const hit=this.ray.intersectObject(target)[0];this.probeDistance=hit?.distance||3;
   if(hit){const entry=this.keyboard.mesh.visible?this.keyboard.hover(hit.uv):this.menu.mode==='radial'?this.menu.radialHover(hit.uv):this.menu.panel.hover(hit.uv);if(entry)this.hit={type:this.keyboard.mesh.visible?'keyboard':this.menu.mode==='radial'?'radial':'panel',entry};}
   if(this.menu.panel.dragging){
    if(!this.menu.open||this.pause||this.pads.right.buttons[0]<=.6||this.keyboard.mesh.visible||this.menu.mode!=='panel')this.menu.panel.endSlider();
    else{
     // Captured slider keeps working past either end. Intersect its plane,
     // not just the finite mesh, so dragging clamps reliably at min/max.
     const mesh=this.menu.panel.mesh;mesh.getWorldPosition(this.sliderPoint);this.sliderNormal.set(0,0,1).transformDirection(mesh.matrixWorld);this.sliderPlane.setFromNormalAndCoplanarPoint(this.sliderNormal,this.sliderPoint);
     if(this.ray.ray.intersectPlane(this.sliderPlane,this.sliderPoint)){
      this.probeDistance=Math.min(8,this.sliderPoint.distanceTo(this.ray.ray.origin));mesh.worldToLocal(this.sliderPoint);
      this.sliderUV.set(this.sliderPoint.x/.88+.5,this.sliderPoint.y/.66+.5);this.menu.panel.dragSlider(this.sliderUV);
     }
    }
   }
  }else if(time-this.lastProbe>.05){this.lastProbe=time;const hit=a.getEnv().world.raycast(this.aimCamera.position,this.direction,18);this.probeDistance=hit?.distance||8;}
  // UI is transparent and drawn late: both line AND dot must be in that same
  // queue, later than the panels. Outside menus retain normal world occlusion.
  right.line.renderOrder=right.dot.renderOrder=overUI?20010:0;
  right.line.material.depthTest=right.dot.material.depthTest=!overUI;
  const distance=Math.max(.015,this.probeDistance-(overUI?.003:0));right.line.scale.z=distance;right.dot.position.z=-distance;
  right.dot.scale.setScalar(overUI?.45:Math.max(1,this.probeDistance*.15));right.line.visible=!a.getEnv().vehicle.mounted||this.menu.open;right.dot.visible=right.line.visible;
 }else this.menu.panel.endSlider();

 this.hands.left.line.visible=this.hands.left.dot.visible=false;
 const x=a.expedition;this.gizmo.visible=!!x.preview?.visible&&!this.menu.open;if(this.gizmo.visible){x.preview.geometry.boundingBox.getCenter(this.gizmo.position).applyMatrix4(x.preview.matrixWorld);this.gizmo.quaternion.copy(x.preview.quaternion);const radius=clamp(x.preview.geometry.boundingBox.getSize(this.tmp).length()*.35,.25,2);this.gizmo.scale.setScalar(radius);for(const ring of this.gizmo.children){ring.visible=x.inventory.hand?.id!=='foundation'||ring.userData.axis==='y';ring.material.opacity=ring.userData.axis===x.axis?.95:.48;}}
 this.updateStatus(time);this.optics.render();
 }
 updateStatus(time){
  const a=this.api,x=a.expedition,v=a.getEnv()?.vehicle;
  // Only destination loading uses a head-relative message. Its transform is
  // updated EVERY XR frame, independent of how often text needs to change.
  this.status.mesh.visible=this.loading;
  if(this.loading){
   this.status.mesh.position.set(0,-.12,-1.15).applyQuaternion(a.camera.quaternion).add(a.camera.position);this.status.mesh.quaternion.copy(a.camera.quaternion);
   if(this.lastStatus!==this.loadingText){this.lastStatus=this.loadingText;const c=this.status.ctx;c.clearRect(0,0,1000,180);c.fillStyle='#e5eadf';c.font='36px system-ui';c.textAlign='center';c.fillText(this.loadingText,500,99);this.status.texture.needsUpdate=true;}
   return;
  }
  this.hands.left.guide.pose(this.hands.left,a.camera,!this.pause);this.hands.right.guide.pose(this.hands.right,a.camera,!this.pause);
  if(time-this.statusAt<.15)return;this.statusAt=time;
  let left,right,message='';
  if(this.menu.open){
   left=[['Y',this.keyboard.mesh.visible?'Cerrar teclado':'Cerrar menú'],['JOY','Navegar'],['GAT','Aceptar']];right=[['A','Aceptar'],['GAT',this.menu.mode==='panel'&&!this.keyboard.mesh.visible?'Elegir / arrastrar':'Elegir']];
   message=this.menu.mode==='panel'&&!this.keyboard.mesh.visible&&this.menu.panel.rows[this.menu.panel.selected]?.slider?'Apunta a la barra y mantén gatillo derecho. A: escribir valor exacto.':'';
  }else{
   const interaction=v?.mounted?'Bajar':x.seated?'Levantarse':x.near?.action||'Interactuar';
   left=[['Y','Menú'],['X',interaction],['GAT',v?.mounted?'Frenar':a.state.scope?'Registrar':x.buildMode?'Colocar':'Usar herramienta'],['JOY',this.preferences.swap?'Giro suave':'Caminar'],['LAT',v?.mounted?'Volante / impulso':x.buildMode?'Girar pieza':'—']];
   right=[['A','Saltar'],['B',a.state.scope?'Guardar visor':'Telescopio'],['GAT',v?.mounted?'Acelerar':'Correr'],['JOY',a.state.scope?'Girar / aumento':x.buildMode&&this.pads.left.buttons[1]>.6?'Giro / clic: eje':this.preferences.swap?'Caminar':'Giro suave'],['LAT',v?.mounted?'Volante / faros':'Linterna']];
   if(v?.mounted)(this.preferences.swap?right:left)[3][1]='Dirigir / reversa';else if(!x.buildMode)left.pop();
   if(performance.now()<this.noticeUntil)message=this.notice;
   else if(a.state.scope)message=(x.target?.name||'Telescopio')+' · aumento '+a.state.zoom;
   else if(!x.info.hidden)message=x.info.textContent;
   else if(x.beacons.textContent)message=x.beacons.textContent;
   if(a.graphics.settings.fps)message+=(message?' · ':'')+(this.averageMs?Math.round(1000/this.averageMs)+' FPS · '+this.averageMs.toFixed(1)+' ms':'Midiendo FPS…');
  }
  this.hands.left.guide.content(left,message);this.hands.right.guide.content(right);
 }

 sample(dt,blocked){if(dt<=0||dt>.1||blocked){this.samples=this.sampleTime=0;return;}this.sampleTime+=dt;this.samples++;if(this.sampleTime<3)return;this.averageMs=this.sampleTime/this.samples*1000;const budget=1000/(this.session?.frameRate||72);if(this.averageMs>budget*1.18){this.pressure+=this.sampleTime;this.headroom=0;}else if(this.averageMs<budget*1.06){this.headroom+=this.sampleTime;this.pressure=0;}else this.pressure=this.headroom=0;this.samples=this.sampleTime=0;if(!this.preferences.auto)return;if(this.pressure>6){this.foveation=Math.min(.8,this.foveation+.08);this.pressure=0;}else if(this.headroom>18){this.foveation=Math.max(this.preferences.foveation,this.foveation-.04);this.headroom=0;}this.api.renderer.xr.setFoveation(this.foveation);window.SkyDiagnostics.averageFrameMs=this.averageMs;window.SkyDiagnostics.foveation=this.foveation;}
 renderLoading(frame,dt,time){if(!this.active)return;if(this.updatePose(frame)){this.updateRig();this.api.renderer.xr.updateCamera(this.view);this.view.getWorldPosition(this.api.camera.position);this.view.getWorldQuaternion(this.api.camera.quaternion);}this.updateStatus(time);this.api.renderer.render(this.loadingScene,this.view);}
 async desktopAction(action){if(this.active)await this.session.end();action();this.api.toast('Archivo en el navegador. Usa Entrar en VR para volver.');}
 openImport(){this.desktopAction(()=>{const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.onchange=()=>this.api.expedition.import(input.files[0]);input.click();});}
}
