import {canvasMesh} from './vr-ui.js';
import {UI,icon,tile,round} from './vr-art.js';
export class ForearmInventory{
 constructor(inventory,grip){Object.assign(this,canvasMesh(1024,440,.28,.1203));this.inventory=inventory;this.revision=-1;this.hovered=-1;this.active=false;this.dirty=true;this.hits=[];this.mesh.name='Diez accesos · antebrazo izquierdo';this.mesh.position.set(-.018,.058,.16);this.mesh.rotation.set(-Math.PI/2,0,.13);this.mesh.renderOrder=19950;grip.add(this.mesh);}
 setActive(active){if(active!==this.active){this.active=active;this.hovered=-1;this.dirty=true;}}
 hover(uv){if(!this.active)return null;const x=uv.x*1024,y=(1-uv.y)*440,hit=this.hits.find(h=>x>=h.x&&x<=h.x+h.w&&y>=h.y&&y<=h.y+h.h);const next=hit?.index??-1;if(next!==this.hovered){this.hovered=next;this.dirty=true;}return hit;}
 select(hit){if(!this.active||!hit)return false;this.inventory.select(hit.index);return true;}
 update(visible){this.mesh.visible=visible;if(!visible)return;if(this.revision!==this.inventory.revision){this.revision=this.inventory.revision;this.dirty=true;}if(!this.dirty)return;this.dirty=false;const c=this.ctx;c.clearRect(0,0,1024,440);round(c,4,4,1016,432,26);c.fillStyle='#102a32c9';c.fill();c.strokeStyle=this.active?UI.gold:UI.cyan;c.lineWidth=1.5;c.stroke();icon(c,'bag',43,220,42,UI.cyan);this.hits=[];for(let i=0;i<10;i++){const x=81+i%5*185,y=22+Math.floor(i/5)*199,w=174,h=184;tile(c,x,y,w,h,this.inventory.slots[30+i],{selected:i===this.inventory.selected,equipped:false,hover:i===this.hovered,number:i+1});if(i===this.hovered){round(c,x+4,y+4,w-8,h-8,10);c.strokeStyle=UI.gold;c.lineWidth=3;c.stroke();}this.hits.push({index:i,x,y,w,h});}this.texture.needsUpdate=true;}
}
