import * as THREE from './three.module.js?v=4.0.0';
import {ITEMS,itemIcon} from './items.js?v=4.1.2';
import {propGeometry} from './props.js?v=4.1.2';
export const UI={ink:'#e5edef',muted:'#9bb6bb',cyan:'#72bdc8',gold:'#e8ce94',base:'#102a32d8',cell:'#17343ca8',active:'#66573fc8'};
export function round(c,x,y,w,h,r=16){c.beginPath();c.roundRect(x,y,w,h,r);}
const paths={
 sky:'M5 12a7 7 0 1 0 14 0a7 7 0 1 0-14 0 M2 18C-1 14 19 1 22 6S5 23 2 18',
 bag:'M7 7V5a5 5 0 0 1 10 0v2 M6 6h12l2 5v10H4V11Z M8 13h8v6H8Z M7 9h10',
 build:'M4 21L16 6 M11 4l4-3 7 6-4 4Z',
 system:'M9 2h6l1 4 4 1 2 5-3 3v5l-5 2-3-3-5 1-3-5 3-3-1-5 4-2Z M8 12a4 4 0 1 0 8 0a4 4 0 1 0-8 0',
 cube:'M3 6l9-5 9 5v12l-9 5-9-5Z M3 6l9 6 9-6 M12 12v11',
 chair:'M6 12V3h12v9 M4 12h16v5H4Z M6 17v6 M18 17v6',
 lamp:'M8 15C1 8 7 1 12 1S23 8 16 15l-1 4H9Z M9 22h6',
 science:'M9 1h6 M10 1v8L3 20q0 3 3 3h12q3 0 3-3l-7-11V1 M6 16h12',
 tree:'M12 1L3 13h5l-6 7h20l-6-7h5Z M12 20v4',
 clock:'M2 12a10 10 0 1 0 20 0a10 10 0 1 0-20 0 M12 5v8l5 3',
 moon:'M18 2A10 10 0 1 0 22 17A9 9 0 0 1 18 2Z',
 earth:'M2 12a10 10 0 1 0 20 0a10 10 0 1 0-20 0 M3 8l5-2 3 5-3 3 3 6 M15 3l-1 5 5 3-1 6',
 observe:'M2 8l14-5 4 7-15 6Z M11 14v9 M11 17l-5 6 M11 17l6 6',
 move:'M12 2v20 M2 12h20 M8 6l4-4 4 4 M18 8l4 4-4 4',
 image:'M2 3h20v17H2Z M3 17l6-7 5 5 3-3 5 5 M15 6h2',
 sound:'M2 9h5l6-6v18l-6-6H2Z M17 7q6 5 0 10',
 help:'M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0 M9 8q3-5 6 0q0 2-3 4v2 M12 17v1',
 session:'M12 1v10 M6 4a9 9 0 1 0 12 0',
 edit:'M3 21l2-6L17 3l4 4L9 19Z M14 6l4 4',
 undo:'M8 3L2 9l6 6 M3 9h11a7 7 0 0 1 0 14',
 filter:'M2 3h20l-8 9v9l-4-3v-6Z',
 book:'M12 4C7 1 2 3 2 3v18s6-2 10 1c4-3 10-1 10-1V3s-5-2-10 1Z M12 4v18',
 back:'M15 3l-9 9 9 9',
 energy:'M14 1L4 14h7l-1 9 10-13h-7Z'
};
export function icon(c,name,x,y,size=36,color=UI.ink){c.save();c.translate(x-size/2,y-size/2);c.scale(size/24,size/24);c.lineWidth=1.35;c.strokeStyle=color;c.lineJoin='round';c.lineCap='round';try{c.stroke(new Path2D(paths[name]||paths.cube));}finally{c.restore();}}
export function fit(c,text,width){text=String(text);while(text.length>1&&c.measureText(text).width>width)text=text.slice(0,-2)+'…';return text;}
export function wrap(c,text,width){const result=[];for(const para of String(text).split('\n')){let line='';for(const word of para.split(/\s+/)){const next=line?line+' '+word:word;if(line&&c.measureText(next).width>width){result.push(line);line=word;}else line=next;}result.push(line);}return result;}
const thumbnails=new Map();
// Rasterize the SAME authored mesh once on the CPU. No extra WebGL renderer,
// render target, lighting pass, animation or external model is needed by a tile.
export function thumbnail(id){if(thumbnails.has(id))return thumbnails.get(id);const item=ITEMS[id],canvas=document.createElement('canvas');canvas.width=canvas.height=160;const c=canvas.getContext('2d');thumbnails.set(id,canvas);if(!item)return canvas;
 if(item.tool||item.sample){const svg=itemIcon(item);c.save();c.translate(25,25);c.scale(110/24,110/24);c.lineWidth=1.25;c.strokeStyle=UI.gold;c.lineJoin='round';for(const match of svg.matchAll(/\sd="([^"]+)"/g))c.stroke(new Path2D(match[1]));c.restore();return canvas;}
 const g=propGeometry(id),p=g.attributes.position,n=g.attributes.normal,paint=g.attributes.paint;const box=g.boundingBox,center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());const extent=Math.max(size.x,size.y,size.z,.1),camera=new THREE.OrthographicCamera(-extent,extent,extent,-extent,.01,extent*20);camera.position.copy(center).add(new THREE.Vector3(1.4,1.05,1.8).multiplyScalar(extent));camera.lookAt(center);camera.updateMatrixWorld(true);const toEye=camera.position.clone().sub(center).normalize(),vertices=[],faces=[],col=new THREE.Color(),v=new THREE.Vector3();let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
 for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).project(camera);vertices.push([v.x,-v.y,v.z]);minX=Math.min(minX,v.x);maxX=Math.max(maxX,v.x);minY=Math.min(minY,-v.y);maxY=Math.max(maxY,-v.y);}
 const scale=130/Math.max(maxX-minX,maxY-minY),ox=80-(minX+maxX)*scale/2,oy=80-(minY+maxY)*scale/2;
 for(let i=0;i<p.count;i+=3){v.fromBufferAttribute(n,i);if(v.dot(toEye)<-.02)continue;const light=.5+.5*Math.max(0,v.x*.35+v.y*.8+v.z*.45);col.fromBufferAttribute(paint,i).multiplyScalar(light).convertLinearToSRGB();faces.push({i,z:(vertices[i][2]+vertices[i+1][2]+vertices[i+2][2])/3,color:'#'+col.getHexString(THREE.LinearSRGBColorSpace)});}
 faces.sort((a,b)=>b.z-a.z);for(const f of faces){c.beginPath();for(let k=0;k<3;k++){const t=vertices[f.i+k];c[k?'lineTo':'moveTo'](ox+t[0]*scale,oy+t[1]*scale);}c.closePath();c.fillStyle=f.color;c.fill();}
 if(g.userData.owned)g.dispose();return canvas;
}
export function tile(c,x,y,w,h,stack,{selected=false,equipped=false,number=null,hover=false}={}){round(c,x,y,w,h,12);c.fillStyle=selected?UI.active:UI.cell;c.fill();c.strokeStyle=selected||equipped?UI.gold:hover?UI.ink:UI.cyan;c.lineWidth=selected||equipped?2.5:1;c.stroke();if(stack){const s=Math.min(w-16,h-17);c.drawImage(thumbnail(stack.id),x+(w-s)/2,y+(h-s)/2-2,s,s);c.fillStyle=UI.ink;c.font='20px system-ui';c.textAlign='right';c.fillText(String(stack.qty??1),x+w-8,y+h-8);}if(number!==null){c.textAlign='left';c.fillStyle=UI.muted;c.font='17px system-ui';c.fillText(String(number),x+8,y+21);}c.textAlign='left';}
