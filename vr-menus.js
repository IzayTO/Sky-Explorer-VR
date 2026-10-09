import {ITEMS,CATEGORIES} from './items.js?v=4.1.2';
import {formRows} from './vr-ui.js';
const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const CONTROL_ROWS=[
 ['Y · Menú de la mano','Abre/cierra con una pulsación. Tres bloques sobre la mano izquierda.'],
 ['Menú · Seleccionar','Joystick izquierdo: navegar. A o gatillo izquierdo: aceptar. Rayo derecho + gatillo derecho también sirve.'],
 ['Caminar y mirar','Joystick izquierdo: desplazarse. Derecho: giro suave. Mira también con la cabeza. Sistema permite intercambiar joysticks.'],
 ['Correr y saltar','A: salto. Mantén gatillo derecho: correr. No hay balanceo artificial de cabeza en VR.'],
 ['Linterna / faros','Pulsa agarre derecho lejos del volante. Al conducir alterna faros.'],
 ['X · Interactuar','Apunta a silla, vehículo, mesa, lámpara o instrumento y pulsa X. X también sirve para levantarte o bajar.'],
 ['Construcción','Menú → Expedición → Catálogo. Selecciona pieza, Y para cerrar, apunta con mando derecho; gatillo izquierdo para colocar.'],
 ['Rotación libre','Agarre izquierdo mantenido + joystick derecho gira la pieza. Clic en joystick derecho cambia X/Y/Z. Menú Construcción: ángulos exactos, cimiento, deshacer y borrar.'],
 ['Inventario','30 casillas y 10 a mano. Selecciona casilla: equipar, mover, dividir o lanzar. Catálogo: elegir cantidad y equipar.'],
 ['Herramientas','Equipa desde catálogo/inventario. Gatillo izquierdo: usar. Identificador: mantener 0,65 s. El rayo indica la dirección.'],
 ['B · Telescopio','Abre/cierra visor óptico. Joystick derecho arriba/abajo: aumento. Orienta con mando derecho. Gatillo izquierdo: registrar. Filtros en Cielo.'],
 ['Conducir','Gatillo derecho: acelerar. Izquierdo: frenar. Joystick de movimiento hacia atrás: reversa; horizontal: dirección alternativa. A: salto. X: bajar detenido.'],
 ['Volante / manillar','Pon un mando cerca y mantén su agarre para sujetar. Gira la mano alrededor del volante, o mueve el manillar. Suelta para volver al joystick.'],
 ['Impulso','Agarre izquierdo lejos del volante, o clic del joystick izquierdo. No comparte el gatillo de freno.'],
 ['Manos libres · Solo conducción','Opcional en Sistema antes de entrar VR. Pulgar e índice juntos cerca del volante sujetan; abrir suelta. Mandos siguen siendo la forma de acceder al resto del juego.'],
 ['Conducción sin mandos','Ambas manos sujetando: inclina palmas hacia delante para acelerar; hacia atrás para frenar. Soltar ambas frena. No acelera si falta seguimiento.'],
 ['Guardar y archivos','Bases/mochila/cuaderno se guardan automáticamente, separados de otros repos. Importar/exportar abre el navegador fuera de la inmersión.'],
 ['Tierra / Luna','Cielo → destino. Se guarda el anterior y aparece Preparando mientras se carga el elegido. Solo un entorno 3D permanece en memoria.'],
 ['PC','WASD, ratón, Espacio, Shift, F y E conservan los controles originales. T telescopio; B mochila; C catálogo. No hay controles táctiles.']
];
export class VRMenus{
 constructor(vr){this.vr=vr;this.api=vr.api;this.path='root';this.source=null;this.dirty=false;this.lastScan=0;this.slotFrom=null;this.quantity=1;this.catalogCategory=CATEGORIES[0];this.watching=false;
 this.observer=new MutationObserver(()=>{this.dirty=true;});for(const id of ['sky-settings','performance-settings'])$(id).addEventListener('input',()=>this.dirty=true);for(const id of ['sky-settings','performance-settings'])$(id).addEventListener('change',()=>this.dirty=true);this.observer.observe($('science-content'),{subtree:true,childList:true,characterData:true,attributes:true});
 vr.menu.panel.back=()=>this.back();
 }
 get x(){return this.api.expedition;}get inv(){return this.api.inventory;}
 show(title,rows,path=this.path){this.path=path;this.vr.menu.toggle(true);this.vr.menu.show(title,rows);this.source=null;}
 home(){if(this.api.state.expeditionPanel)this.x.closeDialog();this.path='root';this.source=null;this.vr.menu.home();}
 back(){if(this.vr.keyboard.mesh.visible){this.vr.keyboard.close(false);return;}if(this.api.state.expeditionPanel){this.x.closeDialog();this.exploration();}else this.home();}
 category(i){if(i===0)this.sky();else if(i===1)this.exploration();else this.system();}
 button(label,action,hint){return {label,action,hint};}
 setting(label,get,set,min,max,step=1){return {label,value:()=>String(get()),adjust:d=>set(clamp(Number(get())+d*step,min,max)),action:()=>{const input=document.createElement('input');input.type='number';input.min=min;input.max=max;input.step=step;input.value=get();this.vr.keyboard.open(input,()=>{set(clamp(Number(input.value)||0,min,max));this.vr.menu.panel.dirty=true;});},hint:'← → ajustar · aceptar: valor exacto'};}
 sky(){const s=this.api.state;this.show('Cielo y destinos',[
 this.button('Explorar Tierra',()=>this.vr.changeDestination('earth')),this.button('Explorar Luna',()=>this.vr.changeDestination('moon')),
 this.setting('Hora / ciclo',()=>s.hour.toFixed(2),v=>this.api.setHour(v),0,23.99,.25),
 {label:'Ciclo temporal',value:()=>s.playing?'En movimiento':'Pausado',action:()=>s.playing=!s.playing},
 {label:'Sentido del tiempo',value:()=>s.direction===1?'Avanzar':'Retroceder',action:()=>s.direction*=-1},
 this.button('Fases, duración y Vía Láctea',()=>this.form('Cielo',$('sky-settings'))),
 this.button('Telescopio · B',()=>{this.vr.menu.toggle(false);this.api.setScope(!s.scope);}),
 this.button('Bandas del telescopio',()=>this.x.science.filters()),
 this.button('Cuaderno y fecha astronómica',()=>this.x.science.journal())
 ],'sky');}
 exploration(){this.show('Expedición',[
 this.button('Catálogo de objetos',()=>this.catalog()),this.button('Mochila · 30 + 10',()=>this.bag()),
 this.button('Construcción y edición',()=>this.build()),
 this.button('Cuaderno de observaciones',()=>this.x.science.journal()),this.button('Guía de instrumentos',()=>this.x.guide.show(this.inv.hand?.id)),
 this.button('Sentarse / interactuar / salir · X',()=>{this.vr.menu.toggle(false);this.vr.withWorldAim(()=>this.vr.interact());}),
 this.button('Linterna / faros',()=>this.api.useLight()),this.button('Terminar construcción',()=>{this.x.cancelBuild();this.vr.menu.toggle(false);}),
 this.button('Ver controles VR',()=>this.controls()),this.button('Volver al punto de llegada',()=>{$('reset-position').click();this.vr.recenter();this.vr.menu.toggle(false);})
 ],'exploration');}
 system(){const p=this.vr.preferences;this.show('Sistema',[
 this.button('Rendimiento del paisaje',()=>this.form('Rendimiento',$('performance-settings'))),
 {label:'Joysticks',value:()=>p.swap?'Derecho mueve · izquierdo gira':'Izquierdo mueve · derecho gira',action:()=>{p.swap=!p.swap;this.vr.savePreferences();}},
 this.setting('Giro suave · grados/s',()=>p.turnSpeed,v=>{p.turnSpeed=v;this.vr.savePreferences();},20,140,10),
 this.setting('Velocidad al caminar',()=>this.api.walker.speed,v=>{$('speed').value=v;$('speed').dispatchEvent(new Event('input'));},.4,4,.1),
 this.setting('Volumen · %',()=>Math.round(this.api.state.volume*100),v=>{$('volume').value=v;$('volume').dispatchEvent(new Event('input'));},0,100,5),
 {label:'Manos solo al conducir',value:()=>p.hands?'Permitidas':'Desactivadas',action:()=>{p.hands=!p.hands;this.vr.savePreferences();this.api.toast('La solicitud de manos se aplica al volver a entrar en VR.');}},
 {label:'Resolución por ojo',value:()=>p.scale.toFixed(2)+'×',adjust:d=>{p.scale=clamp(Math.round((p.scale+d*.05)*100)/100,.65,1);this.vr.savePreferences();this.api.toast('Resolución aplicada en la próxima entrada a VR.');},hint:'Se aplica al volver a entrar en VR'},
 this.setting('Foveación periférica',()=>p.foveation.toFixed(2),v=>{p.foveation=v;this.vr.foveation=v;this.api.renderer.xr.setFoveation(v);this.vr.savePreferences();},0,.8,.1),
 {label:'Adaptación sostenida de foveación',value:()=>p.auto?'Activada':'Desactivada',action:()=>{p.auto=!p.auto;this.vr.savePreferences();}},
 this.button('Recentrar postura',()=>this.vr.recenter()),this.button('Controles y guía VR',()=>this.controls()),
 this.button('Guardar y exportar',()=>this.vr.desktopAction(()=>this.x.export())),
 this.button('Importar expedición',()=>this.vr.openImport()),
 {label:'Versión offline',value:()=>$('pwa-update').hidden?$('offline-status').textContent:'Actualización lista',action:()=>{if(!$('pwa-update').hidden)this.vr.desktopAction(()=>$('pwa-update').click());else this.diagnostics();}},
 this.button('Diagnóstico',()=>this.diagnostics()),this.button('Salir de la inmersión',()=>this.vr.session?.end())
 ],'system');}
 diagnostics(){const d=window.SkyDiagnostics;this.show('Diagnóstico VR',[
 {type:'text',label:'Versión '+d.version+' · '+d.renderer},
 {type:'text',label:'Sesión inmersiva: '+(this.vr.active?'sí':'no')+' · frecuencia solicitada: '+(this.vr.session?.frameRate||'nativa')+' Hz'},
 {type:'text',label:'Ciclo de frames: '+(this.vr.averageMs?this.vr.averageMs.toFixed(1)+' ms · '+Math.round(1000/this.vr.averageMs)+' FPS':'midiendo')+' (no tiempo de GPU)'},
 {type:'text',label:'Mundo residente: '+this.api.state.destination+' · foveación: '+this.vr.foveation.toFixed(2)},
 {type:'text',label:'Offline: '+($('offline-status')?.textContent||'consultando')},
 this.button('Actualizar lectura',()=>this.diagnostics())
 ],'system');}
 controls(){this.show('Controles · Quest 3S',CONTROL_ROWS.map(([label,hint])=>({type:'text',label:label+' — '+hint})),'controls');}
 bag(){this.show('Mochila · Elige una casilla',[
 ...Array.from({length:10},(_,i)=>this.slotRow(i+30)),...Array.from({length:30},(_,i)=>this.slotRow(i)),
 this.button('Catálogo de objetos',()=>this.catalog())
 ],'inventory');}
 slotRow(i){const s=this.inv.slots[i];return this.button((i>=30?'A mano '+(i-29):'Mochila '+(i+1))+' · '+(s?ITEMS[s.id].name+' ×'+s.qty:'Vacía'),()=>this.slot(i));}
 slot(i){if(this.slotFrom!==null){this.inv.transfer(this.slotFrom,i);this.slotFrom=null;return this.bag();}const s=this.inv.slots[i];if(!s){this.api.toast('Casilla vacía. Usa el catálogo para añadir un objeto.');return;}
 this.show(ITEMS[s.id].name+' ×'+s.qty,[
 this.button('Equipar y cerrar',()=>{if(i<30)this.inv.transfer(i,30+this.inv.selected);else this.inv.select(i-30);this.x.selectHand();this.vr.menu.toggle(false);}),
 this.button('Mover / intercambiar',()=>{this.slotFrom=i;this.bag();this.vr.menu.panel.title='Elige la casilla de destino';}),
 this.button('Mover entre mochila y accesos',()=>{this.inv.quickMove(i);this.bag();}),
 this.button('Dividir stack',()=>{this.inv.split(i);this.bag();}),
 this.button('Lanzar una unidad',()=>{if(this.x.env.world.throwStack({id:s.id,qty:1},this.vr.menuAimCamera)){this.inv.consume(i);this.bag();}}),
 this.button('Rellenar a 30',()=>{s.qty=30;this.inv.changed();this.slot(i);}),
 this.button('Vaciar esta casilla',()=>{this.inv.slots[i]=null;this.inv.changed();this.bag();})
 ],'inventory');}
 catalog(){this.show('Catálogo · '+this.catalogCategory,[
 {label:'Categoría',value:()=>this.catalogCategory,action:()=>{this.catalogCategory=CATEGORIES[(CATEGORIES.indexOf(this.catalogCategory)+1)%CATEGORIES.length];this.catalog();},adjust:d=>{this.catalogCategory=CATEGORIES[(CATEGORIES.indexOf(this.catalogCategory)+d+CATEGORIES.length)%CATEGORIES.length];this.catalog();}},
 this.setting('Cantidad',()=>this.quantity,v=>this.quantity=Math.round(v),1,30),
 ...Object.values(ITEMS).filter(i=>i.category===this.catalogCategory&&!i.sample).map(i=>this.button(i.name,()=>this.catalogItem(i),i.note||'Añadir a mochila o equipar'))
 ],'catalog');}
 catalogItem(item){this.show(item.name,[
 {type:'text',label:item.note||'Objeto del catálogo original de Sky Explorer.'},
 this.button('Equipar ×'+this.quantity,()=>{const slot=30+this.inv.selected,current=this.inv.slots[slot];if(current&&current.id!==item.id){const empty=this.inv.slots.indexOf(null);if(empty<0)return this.api.toast('Mochila llena. Libera una casilla primero.');this.inv.transfer(slot,empty);}this.inv.create(item.id,this.quantity,slot);this.x.selectHand();this.vr.menu.toggle(false);}),
 this.button('Añadir ×'+this.quantity+' a mochila',()=>{const left=this.inv.add(item.id,this.quantity);this.api.toast(left?'No cabe toda la cantidad.':'Añadido a tu mochila.');}),
 this.button('Cómo se usa',()=>this.x.guide.show(item.id)),this.button('Volver al catálogo',()=>this.catalog())
 ],'catalog');}
 build(){const x=this.x;this.show('Construcción',[
 this.button('Editar sin fantasma',()=>{x.startEdit();this.vr.menu.toggle(false);}),this.button('Catálogo de piezas',()=>{this.catalogCategory='Construcción';this.catalog();}),
 ...['x','y','z'].map(axis=>this.setting('Rotación '+axis.toUpperCase()+' · °',()=>Math.round(x.rotation[axis]*180/Math.PI),v=>{if(ITEMS[this.inv.hand?.id]?.adaptive||(this.inv.hand?.id==='foundation'&&axis!=='y'))return;x.rotation[axis]=v*Math.PI/180;x.dimensions.rotationTouched=true;x.lastPose=-1;x.syncRotation();},0,360,5)),
 this.button('Girar 90° en '+x.axis.toUpperCase(),()=>x.rotate()),
 this.setting('Cimiento · ancho en m',()=>x.dimensions.width,v=>{x.dimensions.width=v;x.lastPose=-1;},2,24,2),
 this.setting('Cimiento · fondo en m',()=>x.dimensions.depth,v=>{x.dimensions.depth=v;x.lastPose=-1;},2,24,2),
 this.button('Recuperar pieza marcada',()=>this.vr.withWorldAim(()=>x.removeAimed()),'Apunta a la pieza antes de abrir Y'),this.button('Deshacer',()=>x.undo(false)),this.button('Rehacer',()=>x.undo(true)),this.button('Terminar edición',()=>{x.cancelBuild();this.vr.menu.toggle(false);})
 ],'build');}
 form(title,node){this.path='form';this.source=node;this.vr.menu.toggle(true);this.refreshForm(title,true);}
 refreshForm(title=this.vr.menu.panel.title,reset=false){const rows=formRows(this.source,(input,emit)=>this.vr.keyboard.open(input,emit),input=>this.vr.desktopAction(()=>input.click()));if(this.source===$('performance-settings')){
 const controls=rows.filter(row=>row.source&&row.source.id!=='graphics-resolution');
 rows.splice(0,rows.length,{type:'text',label:'El paisaje conserva sus perfiles. En VR la nitidez se ajusta con Resolución por ojo y Foveación, en Sistema.'},...controls);
 }
 for(const row of rows)if(row.source?.id==='export-field')row.action=()=>this.vr.desktopAction(()=>this.x.export());
 this.vr.menu.show(title,rows,reset);this.dirty=false;}
 update(time){if(this.path==='science'&&this.source&&!this.api.state.expeditionPanel){this.source=null;this.path='root';this.vr.menu.toggle(false);}if(this.api.state.expeditionPanel&&this.source!==$('science-content')){this.source=$('science-content');this.vr.menu.toggle(true);this.path='science';this.refreshForm($('science-title').textContent,true);this.dirty=true;}
 if(this.source&&time-this.lastScan>.2){this.lastScan=time;if(this.dirty||this.api.expedition.science.tick){this.refreshForm(this.path==='science'?$('science-title').textContent:this.vr.menu.panel.title);}}
 }
}
export {CONTROL_ROWS};
