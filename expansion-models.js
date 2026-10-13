import {lightingToolModel} from './lighting-tool-models.js';
import * as T from './three.module.js?v=4.0.0';
import {refinedModel} from './prop-detail-models.js?v=2.2.0';
import {mapArtwork} from './prop-artwork.js?v=2.2.0';
// Authored, static merged meshes. Small fittings do not add shadow volumes.
// Hinges are rebuilt only on interaction; each physical panel has its own OBB.
export function expansionModel(p,item,s,P){
 const [w,h,d]=item.size,id=item.id,pi=Math.PI;let frame=new T.Matrix4();const glass=[];
 const transform=(pos=[0,0,0],rot=[0,0,0])=>frame.clone().multiply(new T.Matrix4().compose(new T.Vector3(...pos),new T.Quaternion().setFromEuler(new T.Euler(...rot)),new T.Vector3(1,1,1)));
 function shape(g,col,pos=[0,0,0],rot=[0,0,0],solid=false,em=0){const m=transform(pos,rot);if(solid){g.computeBoundingBox();const c={box:g.boundingBox.clone(),matrix:m.clone()};p.colliders.push(c);p.boxes.push(c.box.clone().applyMatrix4(m));p.shadowParts.push(c);}g.applyMatrix4(m);p.add(g,col,[0,0,0],[0,0,0],em,false);}
 const b=(a,pos,col=P.shell,rot=[0,0,0],solid=true,em=0)=>shape(new T.BoxGeometry(...a),col,pos,rot,solid,em);
 const c=(r,len,pos,col=P.frame,rot=[0,0,0],r2=r,n=12)=>shape(new T.CylinderGeometry(r,r2,len,n),col,pos,rot);
 const orb=(r,pos,col,scale=[1,1,1],rot=[0,0,0],detail=12)=>shape(new T.SphereGeometry(r,detail,detail>16?12:8).scale(...(scale.length?scale:[1,1,1])),col,pos,rot);
 const tor=(r,t,pos,col=P.teal,rot=[0,0,0],arc=pi*2)=>shape(new T.TorusGeometry(r,t,5,32,arc),col,pos,rot);
 function line(a,z,r=.012,col=P.frame){const v=new T.Vector3(...a),q=new T.Vector3(...z),len=v.distanceTo(q),e=new T.Euler().setFromQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),q.clone().sub(v).normalize()));c(r,len,v.add(q).multiplyScalar(.5).toArray(),col,[e.x,e.y,e.z],r,6);}
 function group(pos,rot,fn){const old=frame;frame=transform(pos,rot);fn();frame=old;}
 function pane(size,pos,rot=[0,0,0]){const m=transform(pos,rot),axis=size.indexOf(Math.min(...size));let g;
  if(axis===0){g=new T.PlaneGeometry(size[2],size[1]);g.rotateY(pi/2);}else if(axis===1){g=new T.PlaneGeometry(size[0],size[2]);g.rotateX(-pi/2);}else g=new T.PlaneGeometry(size[0],size[1]);
  const n=g.toNonIndexed();n.applyMatrix4(m);glass.push(...n.attributes.position.array);g.dispose();n.dispose();const box=new T.Box3(new T.Vector3(...size).multiplyScalar(-.5),new T.Vector3(...size).multiplyScalar(.5));p.colliders.push({box,matrix:m});p.boxes.push(box.clone().applyMatrix4(m));}

 const detail=(size,pos,col=P.teal,rot=[0,0,0],em=0)=>b(size,pos,col,rot,false,em);
 function bolts(xs,ys,z){for(const x of xs)for(const y of ys)c(.012,.009,[x,y,z],P.frame,[pi/2,0,0],.012,6);}
 function vents(x,y,z,width=.25,n=5){for(let i=0;i<n;i++)detail([width,.008,.008],[x,y+i*.022,z],P.dark);}
 function feet(W,D,H){for(const x of [-W/2+.06,W/2-.06])for(const z of [-D/2+.06,D/2-.06]){b([.045,H,.045],[x,H/2,z],P.frame);c(.036,.026,[x,.013,z],P.rubber);}}
 function screen(W,H,x,y,z){detail([W+.025,H+.025,.02],[x,y,z],P.dark);detail([W,H,.023],[x,y,z+.006],0x326c73,[0,0,0],-.6);for(let i=0;i<3;i++)detail([W*(.65-i*.12),.006,.003],[x-W*.08,y+H*.22-i*H*.2,z+.02],P.teal,[0,0,0],-.5);}
 function tabletop(W,D,Y){b([W,.065,D],[0,Y-.0325,0],P.shell);detail([W,.025,.022],[0,Y-.025,D/2+.008],P.teal);feet(W-.04,D-.04,Y-.07);}
 function guard(W,D,Y){for(const x of [-W/2+.045,W/2-.045]){for(const z of [-D/2,0,D/2])b([.045,.98,.045],[x,Y+.49,z],P.frame);b([.045,.055,D],[x,Y+.98,0],P.teal);b([.025,.035,D],[x,Y+.50,0],P.frame);}}
 function deck(W,D,Y){b([W,.14,D],[0,Y-.07,0],P.frame);for(let z=-D/2+.15;z<D/2;z+=.28)detail([W-.16,.004,.014],[0,Y+.003,z],P.teal);for(const x of [-W/2+.08,W/2-.08])detail([.025,.005,D-.1],[x,Y+.004,0],P.gold);}
 function port(Z,door=false,amount=0){for(const x of [-1,1]){const side=Math.max(0,(w-2)/2);if(side)b([side,2.8,.12],[x*(1+side/2),1.56,Z]);b([.065,2.45,.18],[x*1.025,1.36,Z],P.teal);}b([Math.min(w,2.1),.32,.14],[0,2.8,Z]);detail([2,.03,.19],[0,2.62,Z],P.gold);
  if(door)for(const sign of [-1,1])group([sign*(.50+.93*amount),.16,Z-Math.sign(Z)*.13],[0,0,0],()=>{b([.98,1.425,.08],[0,.7125,0],P.shell);b([.98,.425,.08],[0,2.1875,0],P.shell);for(const x of[-.345,.345])b([.29,.55,.08],[x,1.70,0],P.shell);detail([.85,.06,.086],[0,.20,0],P.blue);pane([.40,.55,.084],[0,1.7,0]);for(const y of [.1,2.28])detail([.87,.025,.09],[0,y,0],P.frame);detail([.04,.22,.10],[-sign*.35,1.08,0],P.gold);});
 }
 if(lightingToolModel({p,item,s,P,b,c,orb,tor,line,group,shape,pane,detail})||refinedModel({p,item,s,P,b,c,orb,tor,line,group,shape,pane,detail})){}else if(['habitat-module','airlock-module','pressure-corridor'].includes(id)){
  deck(w,d,.16);b([w,.16,d],[0,3.04,0],P.shell);for(const x of [-w/2+.06,w/2-.06]){b([.12,2.8,d],[x,1.56,0]);for(const z of [-1.8,0,1.8])b([.08,2.72,.09],[x-Math.sign(x)*.085,1.56,z],P.frame);detail([.022,.13,d-.12],[x-Math.sign(x)*.071,.40,0],P.blue);}
  port(-d/2+.06,id!=='pressure-corridor',Number(s.doorA)||0);port(d/2-.06,id!=='pressure-corridor',Number(s.doorB)||0);
  for(const z of [-1.9,1.9])b([w-.15,.08,.08],[0,2.91,z],P.teal);for(const x of [-w/2-.005,w/2+.005])for(const z of [-1.8,0,1.8])detail([.022,2.7,.055],[x,1.56,z],P.teal);for(const z of [-1,1])detail([w-.18,.013,.025],[0,3.127,z],P.frame);
  if(id==='habitat-module'){for(let z=-1.5;z<2;z+=1)detail([.8,.012,.24],[0,2.951,z],P.teal);for(const x of [-1.84,1.84]){screen(.012,.24,x,1.55,.9);vents(x,2.4,1.84,.18,3);}}
  if(id==='airlock-module'){for(const z of [-1.82,1.82]){screen(.20,.30,1.34,1.50,z);detail([.12,.035,.018],[1.34,1.28,z],P.gold);}for(const z of [-1.5,1.5])detail([1.7,.008,.035],[0,.165,z],P.gold);}
 }else if(id==='panorama-dome'){
  deck(4,4,.16);const R=2,base=.72;
  // Faceted cupola: twelve independent glazed bays, front bay is a doorway.
  for(let j=0;j<12;j++){const a=j*pi/6,aa=(j+1)*pi/6,mid=(a+aa)/2;const doorway=j===2||j===3;
   for(let r=0;r<3;r++){const el=r*pi/6,ee=(r+1)*pi/6,rr=R*Math.cos(el),ss=R*Math.cos(ee),y=base+R*Math.sin(el),yy=base+R*Math.sin(ee);const A=[rr*Math.cos(a),y,rr*Math.sin(a)],B=[rr*Math.cos(aa),y,rr*Math.sin(aa)],C=[ss*Math.cos(aa),yy,ss*Math.sin(aa)],D=[ss*Math.cos(a),yy,ss*Math.sin(a)];if(!doorway||r===2){glass.push(...A,...B,...C,...A,...C,...D);line(A,B,.023,P.teal);line(A,D,.025,P.frame);const cy=(y+yy)/2,radius=(rr+ss)/2*Math.cos(pi/12),tilt=(el+ee)/2;const sz=[Math.max(.08,rr*.518),Math.hypot(yy-y,(rr-ss)*Math.cos(pi/12))+.015,.04],m=frame.clone().multiply(new T.Matrix4().compose(new T.Vector3(radius*Math.cos(mid),cy,radius*Math.sin(mid)),new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),pi/2-mid).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),-tilt)),new T.Vector3(1,1,1)));const box=new T.Box3(new T.Vector3(...sz).multiplyScalar(-.5),new T.Vector3(...sz).multiplyScalar(.5));p.colliders.push({box,matrix:m});p.boxes.push(box.clone().applyMatrix4(m));}}
   if(!doorway)group([Math.cos(mid)*1.92,0,Math.sin(mid)*1.92],[0,pi/2-mid,0],()=>b([1,.56,.10],[0,.44,0],P.blue));
  }const ring=new T.TorusGeometry(2,.035,5,40,pi*5/3);ring.rotateZ(pi*2/3);shape(ring,P.frame,[0,.72,0],[pi/2,0,0]);c(.18,.08,[0,2.76,0],P.gold);p.collider([.34,.08,.34],[0,2.76,0]);for(const x of [-1,1])b([.10,2.35,.15],[x*.92,1.33,1.70],P.teal);
  const sheet=(A,B,C)=>{glass.push(...A,...B,...C);const a=new T.Vector3(...A),b0=new T.Vector3(...B),c0=new T.Vector3(...C),bounds=new T.Box3().setFromPoints([a,b0,c0]);bounds.expandByScalar(.008);p.colliders.push({box:bounds,matrix:frame.clone()});p.boxes.push(bounds.clone().applyMatrix4(frame));};
  for(const sign of[-1,1]){
   const edge=[[sign, .16,1.732],[sign,.72,1.732],[sign*.866,1.72,1.5],[sign*.5,2.452,.866]],front=edge.map(v=>[sign*.94,v[1],1.70]);
   for(let i=0;i<3;i++){sheet(edge[i],front[i],front[i+1]);sheet(edge[i],front[i+1],edge[i+1]);line(edge[i],edge[i+1],.018,P.frame);}
   sheet([sign*.94,2.50,1.70],[sign*.94,2.452,1.70],[sign*.5,2.452,.866]);line([sign*.94,2.50,1.70],[sign*.5,2.452,.866],.023,P.frame);
  }
  sheet([-.94,2.50,1.70],[.94,2.50,1.70],[.5,2.452,.866]);sheet([-.94,2.50,1.70],[.5,2.452,.866],[-.5,2.452,.866]);
  b([1.94,.11,.17],[0,2.50,1.70],P.teal);for(const sign of[-1,1])group([sign*.88,.16,1.70],[0,sign*(Number(s.open)||0)*pi*.51,0],()=>{
   b([.86,.63,.07],[-sign*.44,.315,0],P.blue);b([.86,.15,.07],[-sign*.44,2.265,0],P.shell);
   for(const x of[-sign*.84,-sign*.035])b([.055,1.56,.07],[x,1.41,0],P.shell);pane([.76,1.55,.025],[-sign*.44,1.405,0]);detail([.028,.22,.10],[-sign*.78,1.08,0],P.gold);
  });

 }else if(id==='reinforced-window'){
  for(const x of [-1.94,1.94])b([.12,2.8,.20],[x,1.4,0],P.frame);for(const y of [.10,2.70])b([3.8,.20,.20],[0,y,0],P.shell);pane([3.76,2.4,.035],[0,1.4,0]);for(const x of [-.65,.65])b([.06,2.4,.09],[x,1.4,0],P.teal);bolts([-1.9,1.9],[.10,.70,2.1,2.70],.106);
 }else if(id==='insulated-panel'){
  b([w,h,.16],[0,h/2,0]);for(const z of [-.09,.09]){detail([w-.12,h-.12,.014],[0,h/2,z],0xa7b8b4);for(const y of [.30,1.4,2.5])detail([w-.1,.025,.02],[0,y,z],P.teal);bolts([-.89,.89],[.15,1.4,2.65],z+Math.sign(z)*.016);}for(const x of [-.96,.96])b([.08,h,.20],[x,h/2,0],P.frame);
 }else if(id==='raised-platform'){deck(w,d,1.4);feet(w-.2,d-.2,1.26);for(const z of [-1.86,1.86]){line([-1.84,.20,z],[1.84,1.25,z],.03);line([1.84,.20,z],[-1.84,1.25,z],.03);}guard(w,d,1.4);
 }else if(id==='metal-catwalk'||id==='modular-bridge'){deck(w,d,h);guard(w,d,h);if(id==='modular-bridge')for(const x of [-.94,.94])for(let z=-2.9;z<2.5;z+=1.45){line([x,h+.1,z],[x,h+.93,z+1.4],.021);line([x,h+.93,z],[x,h+.1,z+1.4],.021);}
 }else if(id==='floor-hatch'){
  for(const x of [-.77,.77])b([.46,.16,2],[x,.08,0],P.frame);for(const z of [-.77,.77])b([1.08,.16,.46],[0,.08,z],P.frame);
  group([0,.16,-.54],[-(Number(s.open)||0)*pi/2,0,0],()=>{b([1.06,.12,1.06],[0,-.06,.53],P.shell);detail([.22,.015,.04],[0,.005,.82],P.gold);for(const x of [-.47,.47])detail([.025,.014,.9],[x,.004,.53],P.teal);});for(const x of [-.32,.32])c(.035,.16,[x,.16,-.54],P.frame,[0,0,pi/2]);for(const z of[-.57,.57])detail([1.15,.008,.026],[0,.166,z],P.gold);for(const x of[-.57,.57])detail([.026,.008,1.15],[x,.166,0],P.gold);
 }else if(id==='vertical-ladder'){
  for(const x of [-.30,.30]){b([.045,2.8,.05],[x,1.4,0],P.frame);for(const y of [.20,2.5])line([x,y,0],[x,y,-.22],.025,P.teal);}for(let y=.14;y<2.8;y+=.28){c(.023,.61,[0,y,0],P.teal,[0,0,pi/2],.023,8);detail([.50,.012,.035],[0,y+.022,.005],P.rubber);} // Rungs are climbable, not an impenetrable wall.
 }else if(id==='swivel-chair'){
  c(.045,.46,[0,.28,0],P.frame);c(.072,.10,[0,.12,0],P.dark);for(let i=0;i<5;i++){const a=i*pi*.4;line([0,.14,0],[Math.cos(a)*.29,.075,Math.sin(a)*.29],.025);c(.032,.045,[Math.cos(a)*.29,.045,Math.sin(a)*.29],P.rubber,[pi/2,0,a]);}
  group([0,0,0],[0,Number(s.seatYaw)||0,0],()=>{b([.50,.10,.47],[0,.49,0],P.teal);b([.47,.47,.075],[0,.82,.225],P.blue,[-.12,0,0]);b([.12,.24,.045],[0,.66,.26],P.frame);for(const x of [-.30,.30]){b([.03,.20,.035],[x,.57,.09],P.frame);b([.09,.04,.30],[x,.69,0],P.dark);}});
 }else if(id==='lounge-seat'){
  feet(.68,.65,.32);b([.68,.17,.64],[0,.42,0],P.teal);b([.66,.46,.16],[0,.72,.30],P.blue,[-.15,0,0]);for(const x of [-.35,.35]){b([.08,.24,.65],[x,.54,0],P.frame);detail([.09,.06,.65],[x,.68,0],P.teal);}detail([.50,.12,.025],[0,.86,.197],P.shell,[-.15,0,0]);
 }else if(id==='folding-bunk'){
  for(const x of [-1,1])b([.06,1.85,.06],[x, .925,-.40],P.frame);b([2.1,1.85,.08],[0,.925,-.44],P.blue);for(const y of [.42,1.24])group([0,y,-.36],[-(Number(s.folded)||0)*pi/2,0,0],()=>{b([2,.09,.82],[0,0,.40],P.frame);b([1.94,.09,.76],[0,.09,.40],0xb8c9bb);b([.32,.09,.65],[-.72,.17,.40],P.shell);detail([1.1,.008,.74],[.31,.14,.40],P.teal);for(const x of [-.98,.98])b([.035,.27,.035],[x,.09,.75],P.frame);b([1.94,.035,.035],[0,.22,.75],P.frame);});
 }else if(['laboratory-table','technical-desk','workbench','folding-table','instrument-stand'].includes(id)){
  if(id==='folding-table'){group([0,.74,-.30],[-(Number(s.folded)||0)*pi/2,0,0],()=>{b([1.4,.06,.7],[0,.03,.30],P.shell);for(const x of [-.59,.59])group([x,-.04,.30],[0,0,(Number(s.folded)||0)*1.1],()=>{b([.035,.68,.035],[0,-.34,-.22],P.frame);b([.035,.68,.035],[0,-.34,.22],P.frame);line([0,-.45,-.22],[0,-.45,.22],.018,P.teal);});});for(const x of [-.59,.59])b([.07,.74,.08],[x,.37,-.30],P.frame);
  }else if(id==='instrument-stand'){b([1,.05,.70],[0,.915,0],P.shell);c(.07,.60,[0,.58,0],P.frame);for(let i=0;i<3;i++){const a=pi/6+i*pi*2/3;line([0,.70,0],[Math.cos(a)*.42,.03,Math.sin(a)*.32],.027);c(.055,.03,[Math.cos(a)*.42,.02,Math.sin(a)*.32],P.dark);}for(const x of [-.40,.4])for(const z of [-.25,.25])c(.01,.004,[x,.943,z],P.dark);
  }else{tabletop(w,d,id==='technical-desk'?.78:id==='workbench'?.90:.90);if(id==='laboratory-table'){for(const x of [-.70,.70]){c(.017,.20,[x,1,-.34],P.frame);line([x,1.1,-.34],[x,1.1,-.23],.017,P.teal);c(.025,.02,[x,.92,-.22],P.gold);}detail([.40,.006,.06],[0,.904,-.35],P.dark);
   }else if(id==='technical-desk'){b([.07,.21,.06],[.44,.89,-.28],P.frame);b([.63,.38,.045],[.44,1.12,-.30],P.dark,[-.10,0,0]);screen(.56,.30,.44,1.12,-.27);detail([.48,.02,.17],[.40,.80,.05],P.frame);for(let i=0;i<8;i++)detail([.026,.008,.10],[.20+i*.05,.814,.05],P.shell);
   }else{b([1.94,.50,.04],[0,1.19,-.43],P.blue);for(let x=-.8;x<=.8;x+=.20)for(let y=1;y<1.4;y+=.14)detail([.015,.015,.008],[x,y,-.402],P.dark);for(let i=0;i<4;i++){line([-.75+i*.2,1.08,-.37],[-.75+i*.2,1.36,-.37],.014,P.shell);tor(.030,.010,[-.75+i*.2,1.36,-.37],P.shell);}b([.26,.13,.25],[.71,.97,.17],P.frame);b([.28,.06,.05],[.71,1.06,.04],P.shell);b([.28,.06,.05],[.71,1.06,.29],P.shell);line([.71,.95,.24],[.71,.95,.43],.018,P.gold);}}
 }else if(id==='instrument-shelving'){
  feet(w,d,h);for(const y of [.12,.66,1.20,1.84]){b([1.6,.045,.60],[0,y-.0225,0],P.shell);detail([1.6,.035,.026],[0,y-.02,.305],P.teal);}line([-.74,.10,-.27],[.74,1.84,-.27],.012);line([.74,.10,-.27],[-.74,1.84,-.27],.012);
 }else if(['tool-cupboard','metal-drawers','sealed-container'].includes(id)){
  const thick=.035; b([w,.07,d],[0,.035,0],P.frame);if(id!=='sealed-container')b([w,.045,d],[0,h-.0225,0],P.frame);b([w,h,.035],[0,h/2,-d/2+.0175],P.blue);for(const x of [-w/2+.018,w/2-.018])b([thick,h,d],[x,h/2,0],P.shell);
  if(id==='tool-cupboard'){for(const y of [.35,.90,1.42])b([w-.06,.025,d-.05],[0,y,0],P.frame);for(const sign of [-1,1])group([sign*w/2,h/2,d/2],[0,sign*(Number(s.open)||0)*1.75,0],()=>{b([w/2-.01,h-.10,.035],[-sign*w/4,0,0],P.shell);detail([.035,.23,.04],[-sign*(w/2-.10),.1,.04],P.gold);vents(-sign*w/4,-.65,.023,.32,5);for(const y of[-.63,.63])c(.016,.085,[0,y,0],P.frame);detail([w/2-.12,h-.23,.008],[-sign*w/4,0,-.023],P.blue);bolts([-sign*w/4],[h/2-.11,-h/2+.11],.023);});
  }else if(id==='metal-drawers'){for(let i=0;i<3;i++)group([0,.09+i*.26,(Number(s.drawer)===i+1?Number(s.open??1):0)*.40],[0,0,0],()=>{b([w-.08,.025,d-.06],[0,0,0],P.frame);for(const x of [-w/2+.055,w/2-.055])b([.025,.20,d-.05],[x,.09,0],P.blue);b([w-.10,.20,.025],[0,.09,-d/2+.045],P.blue);b([w-.05,.245,.04],[0,.105,d/2],P.shell);detail([.25,.027,.055],[0,.16,d/2+.025],P.gold);});
  }else{b([w,h,.035],[0,h/2,d/2-.0175],P.blue);group([0,h,-d/2],[ -(Number(s.open)||0)*1.6,0,0],()=>b([w,.06,d],[0,0,d/2],P.shell));for(const x of [-w/2+.08,w/2-.08]){detail([.06,h-.15,.025],[x,h/2,d/2+.008],P.teal);detail([.13,.14,.045],[x,h*.75,d/2+.023],P.gold);}detail([.45,.20,.018],[0,h*.60,d/2+.008],P.shell);}
 }else if(id==='meteorite-case'){
  b([.36,.04,.30],[0,.02,0],P.frame);shape(new T.IcosahedronGeometry(.12,1).scale(1,.78,.83),0x605e57,[0,.15,0],[.3,.4,.1]);for(const x of [-.17,.17])for(const z of [-.14,.14])line([x,.04,z],[x,.38,z],.006,P.gold);for(const x of [-.175,.175])pane([.006,.34,.29],[x,.21,0]);for(const z of [-.145,.145])pane([.35,.34,.006],[0,.21,z]);pane([.35,.006,.29],[0,.383,0]);detail([.13,.045,.014],[0,.045,.15],P.gold,[-.35,0,0]);
 }else if(id==='framed-photo'){
  for(const x of [-.17,.17])b([.02,.27,.03],[x,.155,0],P.frame);for(const y of [.025,.285])b([.32,.018,.03],[0,y,0],P.gold);b([.32,.24,.012],[0,.155,-.008],P.blue);b([.03,.23,.02],[0,.123,-.063],P.frame,[.45,0,0]);detail([.17,.02,.20],[0,.011,-.045],P.frame);
 }else if(id==='satellite-model'){
  c(.11,.02,[0,.01,0],P.frame);line([0,.02,0],[0,.15,0],.014,P.frame);b([.15,.18,.12],[0,.23,0],P.gold);
  for(const sign of[-1,1]){line([sign*.06,.23,0],[sign*.27,.23,0],.009,P.frame);group([sign*.20,.23,0],[-.30,0,0],()=>{b([.20,.008,.23],[0,0,0],P.frame);detail([.187,.003,.216],[0,.006,0],P.blue);for(let i=0;i<5;i++)detail([.002,.001,.216],[-.094+i*.047,.008,0],P.shell);for(let i=0;i<7;i++)detail([.188,.001,.002],[0,.008,-.106+i*.0353],P.shell);detail([.185,.003,.215],[0,-.006,0],0xa2936b);});}
  c(.065,.025,[0,.34,0],P.shell,[.45,0,0],.035);line([0,.35,0],[0,.40,.035],.006,P.frame);for(const z of[-.064,.064]){detail([.10,.12,.005],[0,.23,z],P.shell);for(const x of[-.04,.04])c(.005,.009,[x,.275,z],P.frame,[pi/2,0,0],.005,6);detail([.055,.058,.007],[0,.22,z+Math.sign(z)*.004],P.blue);}for(const x of[-.061,.061])c(.012,.024,[x,.141,0],P.frame,[],.018,8);
 }else if(id==='station-clock'){
  b([.30,.035,.14],[0,.0175,0],P.frame);c(.17,.055,[0,.205,0],P.frame,[pi/2,0,0],.17,32);c(.152,.012,[0,.205,.035],P.shell,[pi/2,0,0],.152,32);for(let i=0;i<12;i++){const a=i*pi/6;detail([.008,.021,.006],[Math.sin(a)*.133,.205+Math.cos(a)*.133,.044],P.dark,[0,0,-a]);}c(.012,.015,[0,.205,.05],P.gold,[pi/2,0,0]);p.collider([.34,.34,.06],[0,.205,0]);
 }else if(id==='mineral-crystal'){
  shape(new T.IcosahedronGeometry(.115,0).scale(1,.35,1),0x747575,[0,.045,0]);for(let i=0;i<5;i++){const a=i*2.4,L=.16+(i%3)*.055,x=Math.cos(a)*.058,z=Math.sin(a)*.055;group([x,.06,z],[.17*Math.sin(a),a,.18*Math.cos(a)],()=>{c(.028,L,[0,L/2,0],i%2?0x87afbd:0xa3bac8,[0,0,0],.030,6);c(0,.055,[0,L+.027,0],0xbacdd3,[0,0,0],.028,6);});}p.collider([.20,.33,.20],[0,.17,0]);
 }else if(id==='lunar-base-model'){
  b([.66,.03,.46],[0,.015,0],0x797c7e);for(const [x,z]of[[-.15,-.09],[.15,-.09],[0,.11]]){b([.14,.08,.11],[x,.07,z],P.shell);c(.07,.018,[x,.12,z],P.white);detail([.04,.045,.006],[x,.066,z+.058],P.blue);}line([-.15,.068,-.09],[.15,.068,-.09],.028,P.teal);line([0,.068,-.09],[0,.068,.11],.028,P.teal);for(const x of [-.26,.26])detail([.09,.007,.18],[x,.053,0],P.blue,[.25,0,0]);line([.25,.03,.17],[.25,.25,.17],.006,P.frame);orb(.033,[.25,.25,.17],P.shell,[1,.25,1],[.4,0,0]);b([.065,.035,.045],[-.22,.06,.15],P.gold);for(const x of [-.245,-.195])for(const z of [.12,.18])orb(.014,[x,.045,z],P.dark);

  for(const [x,z]of[[-.15,-.09],[.15,-.09],[0,.11]]){for(const dx of[-.05,.05])detail([.008,.072,.124],[x+dx,.070,z],P.teal);for(const dx of[-.039,.039])detail([.029,.023,.008],[x+dx,.091,z+.059],P.blue);detail([.022,.034,.009],[x,.061,z+.059],P.frame);for(const sx of[-.051,.051])for(const sz of[-.034,.034])c(.010,.024,[x+sx,.040,z+sz],P.frame,[],.012,6);}
  for(const x of[-.26,.26])for(let i=0;i<5;i++)detail([.083,.003,.002],[x,.058+Math.sin(.25)*(-.074+i*.037),-.074+i*.037],P.shell,[.25,0,0]);
  b([.05,.025,.045],[-.22,.089,.15],P.shell);detail([.042,.003,.035],[-.22,.104,.15],P.blue);line([-.22,.10,.15],[-.22,.156,.15],.0018,P.frame);
  for(let i=0;i<8;i++){const a=i*2.399,x=Math.sin(a)*.29,z=Math.cos(a)*.19;shape(new T.IcosahedronGeometry(.010+(i%3)*.003,0).scale(1,.45,.8),0x949690,[x,.031,z]);}
  detail([.56,.007,.012],[0,.034,-.207],P.gold);detail([.56,.007,.012],[0,.034,.207],P.gold);
 }else if(item.kind==='instrument'){
  if(id==='raman-spectrometer'){b([.56,.26,.38],[0,.15,0],P.shell);b([.19,.13,.25],[-.15,.345,-.035],P.blue);c(.045,.02,[-.15,.28,.095],P.dark);screen(.22,.11,.125,.20,.196);for(const x of[-.20,.20])c(.022,.03,[x,.015,.11],P.rubber);detail([.16,.08,.02],[-.15,.14,.196],P.gold);vents(-.15,.30,.092,.14,4);bolts([-.245,.245],[.08,.25],.196);
  }else if(id==='gravimeter'){b([.28,.27,.26],[0,.19,0],P.gold);for(let i=0;i<3;i++){const a=i*2*pi/3;c(.034,.06,[Math.cos(a)*.13,.035,Math.sin(a)*.13],P.frame);}screen(.19,.095,0,.25,.14);for(const x of[-.11,.11])line([x,.31,0],[x,.40,0],.012,P.frame);line([-.11,.40,0],[.11,.40,0],.012,P.frame);detail([.03,.018,.018],[.085,.17,.145],P.teal);bolts([-.11,.11],[.10,.29],.137);
  }else if(id==='dosimeter'){b([.19,.29,.055],[0,.155,0],P.gold);screen(.13,.12,0,.20,.036);for(const x of[-.06,0,.06])c(.013,.008,[x,.08,.04],P.dark,[pi/2,0,0],.013,8);detail([.15,.045,.013],[0,.28,.036],P.frame);b([.16,.02,.18],[0,.01,-.032],P.frame);b([.02,.18,.02],[0,.09,-.06],P.frame,[-.40,0,0]);
  }else{b([.58,.08,.39],[0,.05,0],P.frame);for(const y of[.17,.30,.43]){b([.36,.038,.29],[-.055,y,-.025],P.blue);detail([.30,.009,.25],[-.055,y+.025,-.025],P.dark);for(const x of[-.23,.13])for(const z of[-.17,.12])c(.012,.12,[x,y+.062,z],P.gold);}b([.12,.34,.25],[.245,.25,-.01],P.shell);screen(.38,.046,0,.055,.202);for(let i=0;i<4;i++)line([.13,.20+i*.05,.12],[.21,.19+i*.05,.15],.004,P.teal);}
 }else if(id==='rover-shelter'||id==='deployable-canopy'){
  const deployed=id==='rover-shelter'?1:1-(Number(s.folded)||0),D=id==='rover-shelter'?6:3*deployed;
  for(const x of[-w/2+.10,w/2-.10])for(const z of[-d/2+.10,...(id==='rover-shelter'?[d/2-.10]:[])]){b([.10,h-.10,.10],[x,(h-.10)/2,z],P.frame);b([.30,.045,.30],[x,.0225,z],P.frame);bolts([x-.09,x+.09],[.12],z+.06);}
  if(id==='rover-shelter'){for(const z of[-2.90,0,2.90]){line([-2.90,3.0,z],[0,3.36,z],.065,P.teal);line([0,3.36,z],[2.90,3.0,z],.065,P.teal);}for(const sign of[-1,1])b([3.02,.055,6],[sign*1.49,3.19,0],P.shell,[0,0,-sign*.12]);for(const x of[-2.90,2.90])line([x,2.2,-2.90],[x,3,-2.1],.05,P.frame);
  }else{b([w,.14,.20],[0,2.52,-1.4],P.blue);if(D>.02){b([w,.04,D],[0,2.53-D*.04,-1.4+D/2],0xaebda6,[-.08,0,0]);for(const x of[-1.8,1.8]){line([x,2.4,-1.4],[x,2.37,-1.4+D/2],.026);line([x,2.37,-1.4+D/2],[x,2.53-D*.08,-1.4+D],.026,P.teal);}b([w,.10,.06],[0,2.53-D*.08,-1.4+D],P.shell);}}
 }else if(id==='landing-platform'){
  deck(8,8,.20);for(const x of[-.9,.9])detail([.14,.01,2.8],[x,.208,0],P.white);detail([1.8,.01,.14],[0,.208,0],P.white);for(const sign of[-1,1]){detail([6,.009,.08],[0,.208,sign*3],P.gold);detail([.08,.009,6],[sign*3,.208,0],P.gold);}for(const x of[-3.7,3.7])for(const z of[-3.7,3.7])detail([.18,.018,.18],[x,.215,z],P.teal,[0,0,0],-.8);
 }else if(id==='perimeter-fence'){
  for(const x of[-1.96,0,1.96]){b([.05,1.35,.07],[x,.675,0],P.frame);b([.16,.035,.12],[x,.0175,0],P.frame);}for(const y of[.15,1.25])b([4,.03,.035],[0,y,0],P.teal);for(let x=-1.8;x<=1.8;x+=.24)line([x,.18,0],[x,1.23,0],.006,P.frame);for(const y of[.40,.65,.90])line([-1.96,y,0],[1.96,y,0],.006,P.frame);p.collider([4,1.25,.05],[0,.675,0],[0,0,0],true);
 }else if(id==='direction-sign'){
  b([.055,1.65,.055],[0,.825,0],P.frame);b([.28,.025,.18],[0,.0125,0],P.frame);group([0,1.38,0],[0,Number(s.bearing)||0,0],()=>{b([.80,.22,.055],[0,0,0],P.blue);detail([.45,.035,.009],[-.06,0,.032],P.white);detail([.20,.035,.009],[.19,.054,.032],P.white,[0,0,-.6]);detail([.20,.035,.009],[.19,-.054,.032],P.white,[0,0,.6]);});
 }else if(id==='trail-beacon'){c(.115,.045,[0,.0225,0],P.frame);b([.08,.55,.08],[0,.32,0],P.frame);b([.18,.12,.18],[0,.64,0],P.teal,[0,0,0],true,-1);b([.23,.027,.23],[0,.71,0],P.shell);detail([.11,.12,.012],[0,.39,.045],P.gold);
 }else if(id==='communications-antenna'){
  for(let i=0;i<3;i++){const a=i*pi*2/3;line([0,.80,0],[Math.cos(a)*.55,.025,Math.sin(a)*.55],.035,P.frame);}c(.065,1.25,[0,.80,0],P.frame);b([.25,.22,.22],[0,1.40,0],P.blue);
  group([0,1.56,0],[-(Number.isFinite(s.elevation)?s.elevation:.3),Number(s.azimuth)||0,0],()=>{
   const R=.61,N=32,rings=6,positions=[],normals=[],paint=[];
   // Two distinct curved shells with smooth analytic normals. No coincident
   // reverse triangles: the former antenna flickered as both faces fought.
   for(const back of[false,true])for(let j=0;j<rings;j++)for(let i=0;i<N;i++){
    const a=i*pi*2/N,aa=(i+1)*pi*2/N,r=j*R/rings,rr=(j+1)*R/rings,pt=(a,r)=>[Math.cos(a)*r,Math.sin(a)*r,-.30*r*r+(back?.018:0)],A=pt(a,r),B=pt(aa,r),C=pt(aa,rr),D=pt(a,rr);
    const tris=j===0?[[A,C,D]]:[[A,B,C],[A,C,D]];for(let tri of tris){if(back)tri=[tri[0],tri[2],tri[1]];for(const v of tri){positions.push(...v);const n=new T.Vector3(-.60*v[0],-.60*v[1],-1).normalize().multiplyScalar(back?-1:1);normals.push(...n.toArray());}}
   }
   const g=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(positions,3)).setAttribute('normal',new T.Float32BufferAttribute(normals,3));shape(g,P.shell);tor(R,.012,[0,0,-.30*R*R+.009],P.teal);
   for(let i=0;i<3;i++){const a=i*pi*2/3;line([Math.cos(a)*R,Math.sin(a)*R,-.30*R*R],[0,0,-.43],.008,P.gold);line([Math.cos(a)*R*.94,Math.sin(a)*R*.94,-.30*(R*.94)**2+.027],[0,0,.060],.012,P.frame);}
   c(.075,.08,[0,0,.046],P.frame,[pi/2,0,0]);c(.035,.09,[0,0,-.43],P.frame,[pi/2,0,0]);c(.045,.018,[0,0,-.465],P.gold,[pi/2,0,0]);
  });p.collider([.20,1.45,.20],[0,.725,0]);for(let i=0;i<3;i++){const a=i*pi*2/3;c(.055,.018,[Math.cos(a)*.55,.016,Math.sin(a)*.55],P.rubber);}
 }else if(item.kind==='energy'){
  if(id==='rtg-generator'){c(.20,.68,[0,.50,0],P.frame);p.collider([.40,.74,.40],[0,.51,0]);for(let i=0;i<8;i++){const a=i*pi/4;group([0,.50,0],[0,a,0],()=>b([.22,.65,.025],[.27,0,0],0x747e83));}for(const y of[.17,.83])c(.25,.035,[0,y,0],P.gold);c(.15,.06,[0,.885,0],P.shell);for(const x of[-.24,.24])b([.055,.17,.30],[x,.085,0],P.frame);detail([.11,.12,.014],[0,.45,.207],P.gold);
  }else if(id==='battery-bank'){b([w,h,d],[0,h/2,0],P.frame);for(let y=.13;y<1.2;y+=.25){detail([.78,.19,.03],[0,y,.315],P.shell);for(const x of[-.32,.32])detail([.08,.023,.027],[x,y,.34],P.gold);screen(.15,.055,.05,y,.338);}for(const x of[-.39,.39])b([.04,.09,.52],[x,.045,0],P.dark);vents(0,1.11,.321,.28,4);
  }else if(id==='rover-charger'){b([.50,.08,.45],[0,.04,0],P.frame);b([.33,1.02,.25],[0,.59,0],P.shell);b([.52,.25,.31],[0,.98,0],P.blue);screen(.34,.12,0,1.02,.165);for(let i=0;i<20;i++){const a=i*pi*2/20,aa=(i+1)*pi*2/20;line([.25+.11*Math.cos(a),.54+.27*Math.sin(a),.06],[.25+.11*Math.cos(aa),.54+.27*Math.sin(aa),.06],.013,P.dark);}b([.07,.18,.08],[.31,.76,.06],P.gold);detail([.08,.08,.02],[0,.81,.16],P.teal,[0,0,0],-.5);
  }else{b([w,h,d],[0,h/2,0],P.blue);b([w-.04,h-.05,.018],[0,h/2,d/2+.01],P.shell);screen(w*.62,h*.22,0,h*.67,d/2+.024);vents(0,h*.19,d/2+.024,w*.66,4);bolts([-w/2+.035,w/2-.035],[.045,h-.045],d/2+.024);for(let i=0;i<(id==='power-distributor'?4:2);i++){const x=-w*.28+i*w*.56/(id==='power-distributor'?3:1);c(.018,.035,[x,.02,d/2],P.dark,[pi/2,0,0]);detail([.018,.018,.022],[x,h*.45,d/2+.025],P.teal,[0,0,0],-.5);}if(id==='power-inverter')for(const x of[-w/2-.008,w/2+.008])for(let y=.08;y<h-.06;y+=.06)detail([.018,.014,d-.04],[x,y,0],P.frame);}
 }else throw new Error('Falta modelo de expansión: '+id);
 if(item.kind==='instrument'||(item.kind==='energy'&&id!=='rtg-generator')){
  const bx=id==='particle-detector'?.245:0;const dims={'gravimeter':[.23,.17,-.132,.20],'dosimeter':[.15,.17,-.030,.17],'particle-detector':[.10,.17,-.137,.27],'rover-charger':[.27,.28,-.127,.57]},spec=dims[id],W=spec?.[0]||Math.min(w*.74,.52),H=spec?.[1]||Math.min(h*.50,.31),z=spec?.[2]??(-d/2-.002),cy=spec?.[3]??h*.48;
  detail([W,H,.006],[bx,cy,z],P.frame);shape(mapArtwork(new T.PlaneGeometry(W*.78,H*.64),'instrument'),P.shell,[bx,cy,z-.004],[0,pi,0]);
  for(const x of[-W*.4,W*.4])c(.011,.014,[bx+x,cy-H*.62,z-.003],P.gold,[pi/2,0,0],.011,8);
  for(let i=0;i<4;i++)detail([W*.7,.008,.005],[bx,cy+H*.30+i*.014,z-.004],P.dark);
 }
 if(item.small&&!p.colliders.length)p.collider([Math.min(w,.36),h,Math.min(d,.30)],[0,h/2,0]);
 if(id==='vertical-ladder')for(const x of[-.30,.30])p.collider([.045,2.8,.05],[x,1.4,0]);
 if(glass.length)p.glass=glass;
}
