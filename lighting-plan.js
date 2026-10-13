import {UI,round,fit,wrap} from './vr-art.js';
import {lampKelvin,lampIntensity} from './lamp-settings.js';
import {savedAreas,areaLamps,planGeometry} from './lighting-areas.js';
// Shared 2D drawing + hit regions, used unchanged by the desktop canvas and
// the existing XR panel. No second renderer and no offscreen 3D scene.
export class LightingPlan{
 constructor(system,panel){this.system=system;this.world=system.world;this.panel=panel;this.rows=[];this.hits=[];this.selectedLamp=null;this.zoom=1;this.panX=this.panZ=0;this.level=null;this.group=null;this.draft=null;this.geometryKey='';this.revision=0;this.lastWorldRevision=-1;this.selected=0;this.refresh();}
 refresh(){const areas=savedAreas(this.world),uid=this.panel.params.zoneUid;this.areas=areas;this.area=areas.find(a=>a.uid===uid)||areas.find(a=>a.uid===this.area?.uid)||areas[0]||null;
  if(this.area){if(uid!==this.area.uid)this.world.change(this.panel,{zoneUid:this.area.uid});if(this.areaKey!==JSON.stringify(this.area.points)){this.areaKey=JSON.stringify(this.area.points);const ys=this.area.points.map(p=>p[1]).sort((a,b)=>a-b);this.level=ys[1];this.zoom=1;this.panX=this.panZ=0;}}
  this.lamps=areaLamps(this.world,this.area);if(!this.lamps.some(e=>e.uid===this.selectedLamp?.uid))this.selectedLamp=null;
  const validGroups=(Array.isArray(this.panel.params.lightGroups)?this.panel.params.lightGroups:[]).filter(g=>g&&typeof g.id==='string'&&g.zoneUid===this.area?.uid&&Array.isArray(g.lamps));this.groups=validGroups;this.group=validGroups.find(g=>g.id===this.group?.id)||null;
  this.rows=[];this.actions={};const add=(key,label,action,disabled=false)=>{const index=this.rows.length;this.rows.push({label,action,disabled});this.actions[key]=index;return index;};
  add('previous','Área anterior',()=>this.cycle(-1),areas.length<2||!!this.draft);add('area',this.area?.name||'Sin áreas guardadas',()=>this.system.areaPicker(this),!!this.draft);add('next','Área siguiente',()=>this.cycle(1),areas.length<2||!!this.draft);
  add('on',this.group?'Encender grupo':'Encender todas',()=>this.setAll(true),!this.lamps.length||!!this.draft);add('off',this.group?'Apagar grupo':'Apagar todas',()=>this.setAll(false),!this.lamps.length||!!this.draft);add('groups',this.group?this.group.name:'Grupos',()=>this.system.groupsMenu(this),!this.area||!!this.draft);
  this.markerRows=new Map();for(const e of this.lamps)this.markerRows.set(e.uid,add('lamp-'+e.uid,e.item.name+' · '+(e.params.on===false?'apagada':'encendida'),()=>{this.selectedLamp=e;if(this.draft){this.draft.ids.has(e.uid)?this.draft.ids.delete(e.uid):this.draft.ids.add(e.uid);}else this.world.change(e,{on:e.params.on===false});this.system.x.tickSound();this.changed();}));
  add('details','Temperatura / intensidad',()=>this.selectedLamp&&this.system.x.science.lamp(this.selectedLamp,()=>this.system.showPlan(this)),!this.selectedLamp||!!this.draft);
  add('newgroup',this.draft?'Guardar grupo ('+this.draft.ids.size+')':'Crear grupo',()=>this.draft?this.system.saveGroup(this):this.system.nameGroup(this),!this.area||this.draft?.ids.size===0);
  add('reset','Centrar plano',()=>{this.zoom=1;this.panX=this.panZ=0;this.changed();});add('zoomout','Alejar',()=>{this.zoom=Math.max(1,this.zoom/1.4);this.changed();});add('zoomin','Acercar',()=>{this.zoom=Math.min(8,this.zoom*1.4);this.changed();});
  add('floorDown','Bajar planta',()=>{this.level-=3;this.changed();},!this.area);add('floorUp','Subir planta',()=>{this.level+=3;this.changed();},!this.area);
  for(const [key,dx,dz]of [['north',0,-1],['south',0,1],['west',-1,0],['east',1,0]])add(key,'Desplazar plano',()=>{this.panX+=dx*(this.span||10)/this.zoom*.20;this.panZ+=dz*(this.span||10)/this.zoom*.20;this.changed();});
  add('close',this.draft?'Cancelar grupo':'Cerrar',()=>{if(this.draft){this.draft=null;this.changed();}else this.system.x.closeDialog();});
  this.lastWorldRevision=this.world.revision;this.revision++;
 }
 changed(){this.refresh();this.onChange?.();}
 cycle(delta){if(!this.areas.length)return;const i=this.areas.findIndex(a=>a.uid===this.area.uid);this.world.change(this.panel,{zoneUid:this.areas[(i+delta+this.areas.length)%this.areas.length].uid});this.areaKey='';this.group=null;this.selectedLamp=null;this.changed();}
 targets(){const ids=this.group?new Set(this.group.lamps):null;return ids?this.lamps.filter(e=>ids.has(e.uid)):this.lamps;}
 setAll(on){for(const e of this.targets())if((e.params.on!==false)!==on)this.world.change(e,{on},false);this.world.save();this.changed();}
 hit(x,y){return [...this.hits].reverse().find(h=>x>=h.x&&x<=h.x+h.w&&y>=h.y&&y<=h.y+h.h);}
 activate(hit){const r=this.rows[hit?.index];if(r&&!r.disabled)r.action();}
 draw(c,selected=-1){this.hits=[];c.save();c.textAlign='left';c.textBaseline='alphabetic';
  const button=(key,x,y,w,h,label=null)=>{const index=this.actions[key],row=this.rows[index];if(!row)return;this.hits.push({x,y,w,h,index});round(c,x,y,w,h,10);c.fillStyle=index===selected?UI.active:UI.cell;c.fill();c.strokeStyle=index===selected?UI.gold:'#6099a077';c.lineWidth=1;c.stroke();c.globalAlpha=row.disabled?.35:1;c.fillStyle=UI.ink;c.font='20px system-ui';c.textAlign='center';c.fillText(fit(c,label||row.label,w-16),x+w/2,y+h/2+7);c.textAlign='left';c.globalAlpha=1;};
  button('previous',28,107,46,47,'‹');button('area',80,107,292,47);button('next',378,107,46,47,'›');button('on',438,107,177,47);button('off',623,107,173,47);button('groups',804,107,192,47);
  const map={x:28,y:168,w:704,h:461};round(c,map.x,map.y,map.w,map.h,12);c.fillStyle='#0a222b';c.fill();c.strokeStyle='#53858a77';c.stroke();
  if(this.area){const points=this.area.points,xs=points.map(p=>p[0]),zs=points.map(p=>p[2]),cx=(Math.min(...xs)+Math.max(...xs))/2+this.panX,cz=(Math.min(...zs)+Math.max(...zs))/2+this.panZ;this.span=Math.max(Math.max(...xs)-Math.min(...xs),Math.max(...zs)-Math.min(...zs),2);const scale=Math.min((map.w-65)/Math.max(2,Math.max(...xs)-Math.min(...xs)),(map.h-65)/Math.max(2,Math.max(...zs)-Math.min(...zs)))*this.zoom;
   const pos=(x,z)=>[map.x+map.w/2+(x-cx)*scale,map.y+map.h/2+(z-cz)*scale],polygon=points.map(p=>pos(p[0],p[2]));this.project=pos;this.mapScale=scale;
   const key=this.world.spatialRevision+':'+this.areaKey+':'+this.level;if(this.geometryKey!==key){this.geometry=planGeometry(this.world,this.area,this.level);this.geometryKey=key;}
   c.save();c.beginPath();c.rect(map.x,map.y,map.w,map.h);c.clip();c.strokeStyle='#52818b24';c.lineWidth=1;const grid=2**Math.ceil(Math.log2(this.span/12));for(let x=Math.floor((cx-this.span)/grid)*grid;x<cx+this.span;x+=grid){const p=pos(x,cz);c.beginPath();c.moveTo(p[0],map.y);c.lineTo(p[0],map.y+map.h);c.stroke();}for(let z=Math.floor((cz-this.span)/grid)*grid;z<cz+this.span;z+=grid){const p=pos(cx,z);c.beginPath();c.moveTo(map.x,p[1]);c.lineTo(map.x+map.w,p[1]);c.stroke();}
   const path=poly=>{c.beginPath();poly.forEach((p,i)=>c[i?'lineTo':'moveTo'](...p));c.closePath();};path(polygon);c.fillStyle='#16383d';c.fill();c.strokeStyle=UI.cyan;c.lineWidth=2;c.stroke();c.save();c.clip();
   for(const s of this.geometry){path(s.poly.map(p=>pos(...p)));c.fillStyle={floor:'#22454a',furniture:'#3a5b60',wall:'#9bb9b8',door:'#ad9569'}[s.layer];c.fill();c.strokeStyle=s.layer==='wall'?'#b6cac655':'#49797a55';c.lineWidth=.7;c.stroke();}c.restore();
   const used=[];let number=0;for(const e of this.lamps){number++;if(e.anchor.y<this.level-.3||e.anchor.y>this.level+3.45)continue;const [px,py]=pos(e.anchor.x,e.anchor.z);if(px<map.x+15||px>map.x+map.w-15||py<map.y+15||py>map.y+map.h-15)continue;
    let x=px,y=py;for(let n=0;n<24&&used.some(p=>Math.hypot(p[0]-x,p[1]-y)<34);n++){const angle=n*2.4,r=22+Math.floor(n/6)*16;x=Math.max(map.x+18,Math.min(map.x+map.w-18,px+Math.cos(angle)*r));y=Math.max(map.y+18,Math.min(map.y+map.h-18,py+Math.sin(angle)*r));}used.push([x,y]);
    if(Math.hypot(x-px,y-py)>1){c.beginPath();c.moveTo(px,py);c.lineTo(x,y);c.strokeStyle=UI.cyan;c.stroke();}const index=this.markerRows.get(e.uid),active=this.draft?this.draft.ids.has(e.uid):e.params.on!==false&&lampIntensity(e.params)>0,highlight=index===selected||e===this.selectedLamp;
    c.beginPath();c.arc(x,y,highlight?17:14,0,Math.PI*2);c.fillStyle=active?UI.gold:'#203e48';c.fill();c.strokeStyle=highlight?'#ffffff':UI.cyan;c.lineWidth=highlight?2:1.3;c.stroke();c.fillStyle=active?'#172d33':UI.ink;c.textAlign='center';c.font='16px system-ui';c.fillText(String(number),x,y+5);c.textAlign='left';this.hits.push({x:x-18,y:y-18,w:36,h:36,index});
   }
   c.restore();c.fillStyle=UI.muted;c.font='17px system-ui';c.fillText('N ↑  ·  Planta '+this.level.toFixed(1)+' m  ·  '+this.lamps.length+' luces en el área',41,653);
  }else{c.fillStyle=UI.ink;c.font='23px system-ui';c.fillText('Primero coloca un Delimitador de área.',64,343);c.font='20px system-ui';c.fillText('Marca cuatro esquinas y guarda el nombre.',64,379);}
  const e=this.selectedLamp;c.fillStyle=UI.gold;c.font='23px system-ui';c.fillText(this.draft?'Seleccionar grupo':e?'Lámpara seleccionada':'Control de la base',752,195);c.font='20px system-ui';c.fillStyle=UI.ink;const lines=wrap(c,this.draft?'Toca las lámparas que quieres agrupar. Las doradas están seleccionadas.':e?e.item.name:'Toca un punto para encender o apagar esa lámpara.',224);lines.slice(0,4).forEach((l,i)=>c.fillText(l,752,233+i*29));
  if(e&&!this.draft){c.fillStyle=UI.muted;c.fillText(e.params.on===false?'Apagada':'Encendida',752,366);c.fillText(lampKelvin(e.params)+' K',752,398);c.fillText(Math.round(lampIntensity(e.params)*100)+' % de intensidad',752,430);}
  button('details',752,448,244,60,'Ajustar luz');button('newgroup',752,521,244,55);button('close',752,586,244,43);
  button('zoomout',28,673,56,45,'−');button('zoomin',90,673,56,45,'+');button('reset',152,673,135,45,'Centrar');button('floorDown',301,673,110,45,'Planta −');button('floorUp',417,673,110,45,'Planta +');button('west',545,673,47,45,'←');button('north',598,673,47,45,'↑');button('south',651,673,47,45,'↓');button('east',704,673,47,45,'→');
  c.font='17px system-ui';c.fillStyle=UI.muted;c.fillText(this.draft?'El grupo sólo incluye luces de esta área.':'Plano sin techos · luces doradas: encendidas · toca un punto para alternar',29,748);c.restore();return this.hits;
 }
}
