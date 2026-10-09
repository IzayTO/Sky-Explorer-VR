import * as THREE from './three.module.js?v=4.0.0';
// Resolution scaling applies to the landscape, never to the star field. A
// coverage mask rejects hidden sky pixels before the original sky is shaded.
// Transparent ghosts/laser retain premultiplied coverage over the sharp sky.
const vertex='varying vec2 screenUV;void main(){screenUV=position.xy*.5+.5;gl_Position=vec4(position.xy,0.,1.);}';
export class LandscapeRenderer{
 constructor(renderer){
  this.renderer=renderer;this.target=null;this.split=false;this.color=new THREE.Color();
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute([-1,-1,0,3,-1,0,-1,3,0],3));
  this.uniforms={landscapeColor:{value:null}};
  this.maskMaterial=new THREE.ShaderMaterial({uniforms:this.uniforms,vertexShader:vertex,fragmentShader:'varying vec2 screenUV;uniform sampler2D landscapeColor;void main(){if(texture2D(landscapeColor,screenUV).a<.99999)discard;gl_FragColor=vec4(0.);}',colorWrite:false,depthWrite:true,depthTest:true,toneMapped:false});
  this.colorMaterial=new THREE.ShaderMaterial({uniforms:this.uniforms,vertexShader:vertex,fragmentShader:'varying vec2 screenUV;uniform sampler2D landscapeColor;void main(){gl_FragColor=texture2D(landscapeColor,screenUV);}',depthWrite:false,depthTest:false,transparent:true,premultipliedAlpha:true,toneMapped:false});
  this.maskScene=new THREE.Scene();this.colorScene=new THREE.Scene();
  for(const [scene,mat]of [[this.maskScene,this.maskMaterial],[this.colorScene,this.colorMaterial]]){const mesh=new THREE.Mesh(geometry,mat);mesh.frustumCulled=false;scene.add(mesh);}
  this.camera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
 }
 resize(width,height,worldRatio,skyRatio){
  this.split=worldRatio<skyRatio-.02;
  if(!this.split){this.release();return;}
  const w=Math.max(1,Math.round(width*worldRatio)),h=Math.max(1,Math.round(height*worldRatio));
  if(!this.target){this.target=new THREE.WebGLRenderTarget(w,h,{minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:true,stencilBuffer:false,samples:4});this.target.texture.generateMipmaps=false;this.target.texture.name='Landscape resolution';}
  else if(this.target.width!==w||this.target.height!==h)this.target.setSize(w,h);
  this.uniforms.landscapeColor.value=this.target.texture;
 }
 render(scene,camera){
  const r=this.renderer;if(r.xr?.isPresenting){r.render(scene,camera);return;}if(!this.split){r.render(scene,camera);return;}
  const target=r.getRenderTarget(),auto=r.autoClear,alpha=r.getClearAlpha(),layers=camera.layers.mask;r.getClearColor(this.color);
  try{
   r.autoClear=true;r.setClearColor(0,0);r.setRenderTarget(this.target);camera.layers.set(0);r.render(scene,camera);
   r.setRenderTarget(target);r.setClearColor(this.color,alpha);r.render(this.maskScene,this.camera);
   r.autoClear=false;camera.layers.set(3);r.render(scene,camera);r.render(this.colorScene,this.camera);
  }finally{camera.layers.mask=layers;r.autoClear=auto;r.setRenderTarget(target);r.setClearColor(this.color,alpha);}
 }
 release(){this.target?.dispose();this.target=null;this.uniforms.landscapeColor.value=null;}
}
