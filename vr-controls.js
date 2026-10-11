import {UI,round,wrap} from './vr-art.js';
// Quest Touch Plus, xr-standard: 0 trigger, 1 squeeze, 2 reserved touchpad,
// 3 thumbstick click, 4 X/A, 5 Y/B. Stick axes 2/3. System buttons are not used.
export const XR_BUTTON={trigger:0,grip:1,stick:3,primary:4,secondary:5};
export const PROFILES=['Exploración','Construcción','Edición','Conducción','Telescopio','Menú'];
export function controlLabels(mode,{swap=false,mountedScope=false,quick=false,interaction='Interactuar',rotating=false,keyboard=false,lampAction=null}={}){
 if(quick)return {left:[['LAT','Mantén: accesos'],['Y','Menú']],right:[['GAT','Elegir casilla']]};
 if(mode==='blocked')return {left:[],right:[]};
 if(mode==='menu')return {left:[['Y',keyboard?'Cerrar teclado':'Cerrar menú'],['JOY','Navegar'],['GAT','Aceptar']],right:[['A','Aceptar'],['B','Volver'],['GAT','Elegir / deslizar']]};
 if(mode==='vehicle')return {left:[['Y','Menú'],['X','Bajar'],['GAT','Freno / reversa'],['JOY',swap?'Giro suave':'Dirigir'],['LAT','Volante / impulso'],['L3','Impulso']],right:[['A','Salto vehículo'],['GAT','Acelerar'],['JOY',swap?'Dirigir':'Giro suave'],['LAT','Volante / faros']]};
 if(mode==='telescope')return {left:[['Y','Menú'],...(mountedScope?[['X','Levantarse']]:[]),['GAT','Registrar'],['JOY',swap?'Giro / aumento':mountedScope?'Orientar postura':'Caminar']],right:[['B','Cerrar visor'],['JOY',swap?'Caminar':'Giro / aumento'],...(mountedScope?[['R3','Siguiente filtro']]:[])]};
 const left=[['Y','Menú'],['X',mode==='edit'?'Mantén: recuperar':interaction],['GAT',mode==='edit'?'Seleccionar':mode==='build'?'Colocar':'Usar herramienta'],['JOY',swap?'Giro suave':'Caminar']];
 const right=[['A','Saltar'],['B',mode==='edit'?'Deseleccionar':mode==='build'?'Guardar pieza':'Telescopio'],['GAT','Correr'],['JOY',swap?'Caminar':'Giro suave'],['LAT',lampAction||'Linterna']];
 if(mode==='build'){left.push(['LAT','Mantén: rotar']);if(rotating)right.push(['R3','Cambiar eje']);}
 else if(mode==='edit')right.push(['R3','Mantén: salir']);
 else {left.push(['LAT','Mantén: accesos']);right.push(['R3','Mantén: editar']);}
 return {left,right};
}
export function drawControlDiagram(c,profile,swap,hits){const mode=['explore','build','edit','vehicle','telescope','menu'][profile],labels=controlLabels(mode,{swap,mountedScope:profile===4,rotating:profile===1});
 for(let i=0;i<6;i++){const x=30+i*162;round(c,x,99,154,43,12);c.fillStyle=i===profile?UI.active:UI.cell;c.fill();c.strokeStyle=i===profile?UI.gold:UI.cyan;c.stroke();c.font='18px system-ui';c.fillStyle=UI.ink;c.textAlign='center';c.fillText(PROFILES[i],x+77,126);hits.push({special:'profile',profile:i,x,y:99,w:154,h:43});}c.textAlign='left';
 for(const side of ['left','right']){const left=side==='left',cx=left?372:652,cy=338,sign=left?-1:1;c.save();c.translate(cx,cy);c.scale(sign,1);
 // Ringless Touch Plus: oval face, tapered handle, front trigger and side grip.
 c.beginPath();c.moveTo(-57,-64);c.bezierCurveTo(-100,-28,-62,54,-42,113);c.bezierCurveTo(-30,153,8,170,30,132);c.lineTo(53,20);c.bezierCurveTo(88,-18,51,-89,-4,-86);c.bezierCurveTo(-24,-88,-44,-80,-57,-64);c.fillStyle='#c1c9c8';c.fill();c.strokeStyle='#f2efe2';c.lineWidth=2;c.stroke();c.beginPath();c.ellipse(0,-29,62,53,-.18,0,Math.PI*2);c.fillStyle='#273a40';c.fill();
 c.beginPath();c.arc(-21,-38,17,0,Math.PI*2);c.fillStyle='#a1acaa';c.fill();c.strokeStyle=UI.cyan;c.stroke();for(const [x,y]of [[21,-42],[33,-9]]){c.beginPath();c.arc(x,y,12,0,Math.PI*2);c.fillStyle='#111e24';c.fill();c.stroke();}round(c,-69,0,15,39,7);c.fillStyle='#687e81';c.fill();round(c,27,50,17,40,7);c.fill();c.restore();
 c.font='17px system-ui';c.textAlign='center';c.fillStyle=UI.ink;c.fillText(left?'Y':'B',cx+sign*21,cy-36);c.fillText(left?'X':'A',cx+sign*33,cy-3);c.fillStyle=UI.muted;c.font='18px system-ui';c.fillText(left?'IZQUIERDO':'DERECHO',cx,555);c.textAlign='left';
 const points={Y:[21,-42],B:[21,-42],X:[33,-9],A:[33,-9],JOY:[-21,-38],R3:[-21,-38],L3:[-21,-38],GAT:[-64,16],LAT:[35,67]},rows=labels[side];rows.forEach(([key,label],i)=>{const x=left?26:768,y=166+i*77,w=230,h=65,p=points[key]||[0,0];c.strokeStyle='#72bdc880';c.lineWidth=1;c.beginPath();c.moveTo(left?x+w:x,y+h/2);c.lineTo(left?280:745,y+h/2);c.lineTo(cx+sign*p[0],cy+p[1]);c.stroke();round(c,x,y,w,h,14);c.fillStyle=UI.cell;c.fill();c.strokeStyle='#72bdc899';c.stroke();c.fillStyle=UI.gold;c.font='18px system-ui';c.fillText(key,x+12,y+23);c.fillStyle=UI.ink;c.font='19px system-ui';wrap(c,label,w-20).slice(0,2).forEach((line,j)=>c.fillText(line,x+12,y+44+j*18));});
 }
 if(profile===4){c.fillStyle=UI.gold;c.font='18px system-ui';c.textAlign='center';c.fillText('R3: filtros solo en telescopio de piso · respeta desbloqueos y energía',512,665);c.textAlign='left';}
}
