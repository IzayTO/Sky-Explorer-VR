import * as THREE from './three.module.js?v=4.0.0';
export const RELEASE='VR-1.0.1';
export const graphicsInfo={version:RELEASE,three:THREE.REVISION,renderer:'WebGL2 / WebXR',ready:false,world:'earth',pixelRatio:1,averageFrameMs:null,drawCalls:null,xr:false};
window.SkyDiagnostics=graphicsInfo;
export function onGraphicsFailure(){}
export function recoverGraphics(){return false;}
export async function createRenderer(){
 globalThis.__skyWebGPU=false;
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
 renderer.xr.enabled=true;renderer.xr.setReferenceSpaceType('local-floor');
 renderer.xr.setFramebufferScaleFactor(.85);renderer.xr.setFoveation(.45);
 console.info('[Sky Explorer VR] WebGL2 · WebXR · Three r'+THREE.REVISION);
 return renderer;
}
export async function compileScene(renderer,scene,camera){
 if(renderer.xr.isPresenting)return;
 if(renderer.compileAsync)await renderer.compileAsync(scene,camera);else renderer.compile(scene,camera);
}
