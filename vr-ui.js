import * as THREE from './three.module.js?v=4.0.0';
const W=1024,H=768,INK='#eceddf',MINT='#92ceb9',GOLD='#dac59e';
const clip=(v,a,b)=>Math.max(a,Math.min(b,v));
function rounded(c,x,y,w,h,r=18){c.beginPath();c.roundRect(x,y,w,h,r);}
function lines(c,text,width){const out=[];for(const para of String(text).split('\n')){let row='';for(const word of para.split(/\s+/)){const next=row?row+' '+word:word;if(c.measureText(next).width>width&&row){out.push(row);row=word;}else row=next;}out.push(row);}return out;}
export function canvasMesh(w,h,width,height){
 const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=THREE.LinearFilter;texture.generateMipmaps=false;
 const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthTest:false,depthWrite:false,toneMapped:false});
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,height),material);mesh.layers.set(4);mesh.renderOrder=20000;mesh.frustumCulled=false;
 return {canvas,ctx:canvas.getContext('2d'),texture,mesh};
}
// Canvas textures upload only on content/selection changes, not every eye/frame.
export class VRPanel{
 constructor(){Object.assign(this,canvasMesh(W,H,.88,.66));this.title='';this.rows=[];this.page=0;this.selected=0;this.hits=[];this.dragging=null;this.dirty=true;this.footer='A / gatillo: aceptar · joystick: navegar · Y: cerrar';this.back=()=>{};}
 set(title,rows,reset=true){if(reset)this.endSlider();this.title=title;this.rows=rows;if(reset){this.page=0;this.selected=0;}this.page=clip(this.page,0,Math.max(0,Math.ceil(rows.length/6)-1));this.selected=clip(this.selected,0,Math.max(0,rows.length-1));this.dirty=true;}
 hover(uv){const x=uv.x*W,y=(1-uv.y)*H,hit=this.hits.find(r=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h);if(hit?.index!==undefined){if(this.selected!==hit.index&&!this.dragging){this.selected=hit.index;this.dirty=true;}if(this.rows[hit.index]?.slider&&y>=hit.y+35)return {...hit,slider:true,fraction:(x-hit.x-28)/(hit.w-56)};}return hit;}
 beginSlider(hit){const row=this.rows[hit?.index];if(!hit?.slider||!row?.slider||row.disabled)return false;this.selected=hit.index;this.dragging={row,x:hit.x+28,w:hit.w-56};this.setSlider(hit.fraction);return true;}
 setSlider(fraction){if(!this.dragging||!Number.isFinite(fraction))return;const s=this.dragging.row.slider,raw=s.min+clip(fraction,0,1)*(s.max-s.min),value=clip(Number((s.min+Math.round((raw-s.min)/s.step)*s.step).toFixed(8)),s.min,s.max);if(Number(s.get())!==value){s.set(value);this.dirty=true;}}
 dragSlider(uv){if(this.dragging)this.setSlider((uv.x*W-this.dragging.x)/this.dragging.w);}
 endSlider(){this.dragging=null;}

 activate(hit){if(hit?.special==='back'){this.back();return;}if(hit?.special==='prev'||hit?.special==='next'){this.page=clip(this.page+(hit.special==='next'?1:-1),0,Math.max(0,Math.ceil(this.rows.length/6)-1));this.selected=this.page*6;this.dirty=true;return;}const row=this.rows[hit?.index??this.selected];if(!row||row.disabled)return;row.action?.();this.dirty=true;}
 navigate(delta){if(this.dragging||!this.rows.length)return;this.selected=(this.selected+delta+this.rows.length)%this.rows.length;this.page=Math.floor(this.selected/6);this.dirty=true;}
 adjust(delta){if(this.dragging)return;const row=this.rows[this.selected];if(!row||row.disabled)return;if(row.adjust)row.adjust(delta);else if(delta>0)row.action?.();this.dirty=true;}
 draw(){if(!this.dirty)return;this.dirty=false;const c=this.ctx;c.clearRect(0,0,W,H);
 rounded(c,8,8,W-16,H-16,38);c.fillStyle='#10252bf5';c.fill();c.strokeStyle='#41606b';c.lineWidth=2;c.stroke();
 c.fillStyle=GOLD;c.font='18px system-ui';c.fillText('SKY EXPLORER  /  VR',40,47);c.fillStyle=INK;c.font='32px system-ui';c.fillText(this.title.slice(0,48),40,94);
 this.hits=[{x:W-134,y:25,w:95,h:74,special:'back'}];c.font='20px system-ui';c.fillStyle=MINT;c.fillText('Volver',W-119,71);
 const start=this.page*6;for(let n=0;n<6;n++){const i=start+n,row=this.rows[i];if(!row)break;const x=30,y=117+n*91,w=W-60,h=82;this.hits.push({x,y,w,h,index:i});rounded(c,x,y,w,h,16);c.fillStyle=i===this.selected?'#315850':'#1b3239';c.fill();if(i===this.selected){c.strokeStyle=MINT;c.stroke();}c.globalAlpha=row.disabled?.48:1;
 if(row.plot){c.save();c.translate(x+8,y+4);c.scale((w-16)/500,(h-8)/140);c.strokeStyle=MINT;c.lineWidth=2;try{c.stroke(new Path2D(row.plot()));}catch{}c.restore();}
 else if(row.image){if(row.image.complete&&row.image.naturalWidth)c.drawImage(row.image,x+8,y+4,h-8,h-8);c.fillStyle=INK;c.font='21px system-ui';c.fillText(row.label||'Observación',x+h+10,y+43);}
 else if(row.slider){const s=row.slider,t=clip((Number(s.get())-s.min)/(s.max-s.min),0,1),left=x+28,length=w-56,trackY=y+57;c.fillStyle=INK;c.font='23px system-ui';c.fillText(row.label+'  ·  '+(row.value?.()??s.get()),x+18,y+28);rounded(c,left,trackY-4,length,8,4);c.fillStyle='#10262c';c.fill();if(t>0){rounded(c,left,trackY-4,Math.max(8,length*t),8,4);c.fillStyle=MINT;c.fill();}c.beginPath();c.arc(left+t*length,trackY,10,0,Math.PI*2);c.fillStyle=GOLD;c.fill();c.font='13px system-ui';c.fillStyle='#b7c5c5';c.fillText(String(s.min),left,y+78);c.textAlign='right';c.fillText(String(s.max),left+length,y+78);c.textAlign='left';}
 else{c.fillStyle=INK;c.font=row.type==='text'?'21px system-ui':'24px system-ui';const value=row.value?.();const label=row.label+(value!==undefined?'  ·  '+value:'');const wrapped=lines(c,label,w-38);wrapped.slice(0,row.hint?2:3).forEach((s,k)=>c.fillText(s,x+18,y+29+k*23));if(row.hint){c.font='16px system-ui';c.fillStyle='#aec6c6';c.fillText(row.hint.slice(0,92),x+18,y+74);}}
 c.globalAlpha=1;}
 const pages=Math.max(1,Math.ceil(this.rows.length/6));c.fillStyle=GOLD;c.font='20px system-ui';c.fillText(`${this.page+1} / ${pages}`,W/2-28,698);
 for(const [x,label,special]of [[35,'‹ Anteriores','prev'],[W-205,'Siguientes ›','next']]){this.hits.push({x,y:668,w:170,h:47,special});c.fillStyle=MINT;c.fillText(label,x+8,698);}
 c.font='17px system-ui';c.fillStyle='#b7c5c5';c.fillText(this.footer,37,739);this.texture.needsUpdate=true;
 }
}
export class WristMenu{
 constructor(){this.root=new THREE.Group();this.root.visible=false;this.root.name='Menú de muñeca';this.progress=0;this.open=false;this.mode='radial';this.index=1;this.lastIndex=-1;
 Object.assign(this,{radial:canvasMesh(1000,550,.92,.506),panel:new VRPanel()});this.radial.mesh.scale.setScalar(.9);this.panel.mesh.scale.setScalar(.8);this.radial.mesh.position.y=.171;this.panel.mesh.position.y=.256;this.root.add(this.radial.mesh,this.panel.mesh);this.panel.mesh.visible=false;this.drawRadial();}
 toggle(on=!this.open){this.open=on;if(!on)this.panel.endSlider();}
 home(){this.panel.endSlider();this.mode='radial';this.radial.mesh.visible=true;this.panel.mesh.visible=false;this.lastIndex=-1;this.drawRadial();}
 show(title,rows,reset=true){this.mode='panel';this.radial.mesh.visible=false;this.panel.mesh.visible=true;this.panel.set(title,rows,reset);}
 drawRadial(){if(this.lastIndex===this.index)return;this.lastIndex=this.index;const c=this.radial.ctx;c.clearRect(0,0,1000,550);const labels=['Cielo','Expedición','Sistema'];
 for(let i=0;i<3;i++){const a=Math.PI+i*Math.PI/3+.035,b=Math.PI+(i+1)*Math.PI/3-.035;c.beginPath();c.arc(500,495,465,a,b);c.arc(500,495,212,b,a,true);c.closePath();c.fillStyle=i===this.index?'#315850f5':'#142c34f0';c.fill();c.lineWidth=3;c.strokeStyle=i===this.index?MINT:'#55717b';c.stroke();const mid=(a+b)/2,x=500+330*Math.cos(mid),y=495+330*Math.sin(mid);c.fillStyle=INK;c.font='28px system-ui';c.textAlign='center';c.fillText(labels[i],x,y);}
 c.textAlign='center';c.fillStyle=GOLD;c.font='22px system-ui';c.fillText('Y · MENÚ',500,466);c.fillStyle='#b4c9c8';c.font='18px system-ui';c.fillText('Joystick izquierdo + gatillo / A',500,531);c.textAlign='left';this.radial.texture.needsUpdate=true;
 }
 radialHover(uv){const x=uv.x*1000-500,y=(1-uv.y)*550-495,r=Math.hypot(x,y);if(y>0||r<212||r>465)return false;this.index=clip(Math.floor((Math.atan2(y,x)+Math.PI)/(Math.PI/3)),0,2);this.drawRadial();return true;}
 stick(x,y){if(Math.hypot(x,y)<.5||y>.1)return;this.index=clip(Math.floor((Math.atan2(y,x)+Math.PI)/(Math.PI/3)),0,2);this.drawRadial();}
 update(dt,anchor,view){this.progress+=((this.open?1:0)-this.progress)*(1-Math.exp(-dt*18));this.root.visible=this.progress>.008;if(!this.root.visible)return;this.root.position.copy(anchor);this.root.position.y+=.09;this.root.lookAt(view);this.root.scale.setScalar(Math.max(.001,.86+.14*this.progress));for(const p of [this.radial,this.panel])p.mesh.material.opacity=this.progress;this.panel.draw();}
}
// Render existing science/guide forms semantically; their real event handlers
// still perform observations, storage, unlocking and saving. No duplicated game.
export function formRows(root,onInput,onFile){
 const rows=[];const text=(label)=>{if(!label)return;const clean=label.trim().replace(/\s+/g,' ');if(!clean)return;for(let i=0;i<clean.length;i+=130)rows.push({type:'text',label:clean.slice(i,i+130)});};
 function visit(node){if(node.nodeType===3){if(node.textContent.trim())text(node.textContent);return;}if(node.nodeType!==1)return;const tag=node.tagName;if(node!==root&&node.hidden&&!(tag==='INPUT'&&node.type==='file'))return;if(['STYLE','SCRIPT','OUTPUT'].includes(tag))return;
 if(tag==='BUTTON'||tag==='A'){rows.push({label:node.textContent.trim()||node.getAttribute('aria-label')||node.title||'Continuar',source:node,disabled:node.disabled,value:node.hasAttribute('aria-pressed')?()=>node.getAttribute('aria-pressed')==='true'?'Seleccionado':'':undefined,action:()=>node.click()});return;}
 if(tag==='INPUT'||tag==='SELECT'||tag==='TEXTAREA'){
  const label=node.labels?.[0]?.textContent.trim().replace(/\s+/g,' ')||node.getAttribute('aria-label')||node.placeholder||node.id;
  if(node.type==='file'){rows.push({label:'Importar archivo de expedición',hint:'Abre el selector del navegador fuera de VR',action:()=>onFile(node)});return;}
  const emit=()=>{node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}));};
  if(node.type==='range'||node.type==='number'){const step=Number(node.step)||1,min=Number(node.min)||0,max=node.max!==''?Number(node.max):100,set=v=>{node.value=String(v);emit();};rows.push({label,source:node,disabled:node.disabled,value:()=>node.value,slider:max>min?{min,max,step,get:()=>Number(node.value),set}:undefined,adjust:d=>set(clip(Number(node.value)+d*step,min,max)),action:()=>onInput(node,emit),hint:'Barra: arrastrar con gatillo derecho · A: valor exacto'});}
  else if(node.type==='checkbox'){rows.push({label,source:node,disabled:node.disabled,value:()=>node.checked?'Sí':'No',action:()=>{node.checked=!node.checked;emit();}});}
  else if(tag==='SELECT'){rows.push({label,source:node,value:()=>node.selectedOptions?.[0]?.textContent||node.value,disabled:node.disabled,action:()=>{node.selectedIndex=(node.selectedIndex+1)%node.options.length;emit();},adjust:d=>{node.selectedIndex=(node.selectedIndex+d+node.options.length)%node.options.length;emit();}});}
  else rows.push({label,source:node,value:()=>node.value,action:()=>onInput(node,emit)});return;
 }
 if(tag==='SVG'){const path=node.querySelector('path');if(node.classList.contains('spectrum-plot')||node.classList.contains('seismogram'))rows.push({label:'Gráfica científica',plot:()=>path?.getAttribute('d')||''});return;}
 if(tag==='IMG'){rows.push({image:node,label:node.alt});return;}
 if(['P','H2','H3','H4','SMALL','LI','SUMMARY'].includes(tag)&&!node.querySelector('button,input,select')){text(node.textContent);return;}
 for(const child of node.childNodes)visit(child);
 }
 visit(root);return rows;
}
export class VRKeyboard{
 constructor(){Object.assign(this,canvasMesh(1200,560,.98,.457));this.mesh.visible=false;this.hits=[];this.target=null;this.index=0;}
 open(input,done){this.target=input;this.done=done;this.value=input.value;this.mesh.visible=true;this.index=0;this.draw();}
 close(save=true){if(save){this.target.value=this.value;this.done?.();}this.mesh.visible=false;this.target=null;}
 draw(){const c=this.ctx;c.clearRect(0,0,1200,560);rounded(c,3,3,1194,554,25);c.fillStyle='#122d35';c.fill();c.fillStyle=INK;c.font='26px system-ui';c.fillText(this.value.slice(-65)||'Escribe con el rayo del mando',30,49);this.hits=[];let k=0;const chars=['1234567890','QWERTYUIOP','ASDFGHJKLÑ','ZXCVBNM.-/'];chars.forEach((row,r)=>{[...row].forEach((char,i)=>{const x=18+i*116,y=78+r*91;this.key(c,x,y,110,80,char,k++);});});[['Espacio',18,420],['Borrar',450,330],['Guardar',794,390]].forEach(([s,x,w])=>this.key(c,x,449,w,87,s,k++));this.texture.needsUpdate=true;}
 key(c,x,y,w,h,label,index){rounded(c,x,y,w,h,10);c.fillStyle=index===this.index?'#3f6a60':'#25444b';c.fill();c.fillStyle=INK;c.font='26px system-ui';c.fillText(label,x+20,y+48);this.hits.push({x,y,w,h,label,index});}
 hover(uv){const x=uv.x*1200,y=(1-uv.y)*560;const hit=this.hits.find(r=>x>=r.x&&x<r.x+r.w&&y>=r.y&&y<r.y+r.h);if(hit&&this.index!==hit.index){this.index=hit.index;this.draw();}return hit;}
 press(hit){const key=hit?.label||this.hits[this.index]?.label;if(key==='Guardar')return this.close();if(key==='Borrar')this.value=this.value.slice(0,-1);else if(key)this.value+=(key==='Espacio'?' ':key);this.value=this.value.slice(0,this.target?.maxLength>0?this.target.maxLength:80);this.draw();}
}
