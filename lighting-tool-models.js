import * as T from './three.module.js?v=4.0.0';
// Original models: survey receiver/tripod and flush wall touch terminal.
// All fittings merge into the main mesh. Only housing/legs cast shadows.
export function lightingToolModel({p,item,P,b,c,orb,tor,line,group,shape,detail}){
 if(item.id==='zone-delimiter'){
  for(let i=0;i<3;i++){const a=i*Math.PI*2/3,x=Math.sin(a),z=Math.cos(a);
   group([0,0,0],[0,a,0],()=>{b([.050,.58,.038],[0,.60,.17],P.gold,[-.32,0,0]);b([.028,.46,.029],[0,.24,.30],P.frame,[-.24,0,0]);b([.083,.052,.070],[0,.39,.255],P.teal);b([.096,.028,.115],[0,.015,.365],P.rubber);detail([.015,.36,.045],[0,.60,.192],P.shell,[-.32,0,0]);});
   line([0,.51,0],[x*.22,.43,z*.22],.008,P.frame);
  }
  c(.13,.036,[0,.897,0],P.frame,[],.13,24);c(.047,.065,[0,.93,0],P.teal);c(.018,.034,[.105,.93,0],P.gold,[],.018,10);
  b([.30,.10,.23],[0,1.012,0],P.frame);b([.28,.015,.21],[0,1.073,0],P.rubber);
  shape(new T.SphereGeometry(1,24,8,0,Math.PI*2,0,Math.PI/2).scale(.166,.066,.136),P.shell,[0,1.08,0]);
  detail([.23,.056,.01],[0,1.014,.121],P.dark);
  for(let i=0;i<4;i++)c(.007,.010,[-.073+i*.037,1.018,.130],i<3?P.teal:P.gold,[Math.PI/2,0,0],.007,8);
  c(.011,.17,[-.130,1.113,-.046],P.rubber,[],.009,8);c(.018,.025,[-.130,1.047,-.046],P.frame);
  for(const x of[-.122,.122])for(const z of[-.075,.075])c(.006,.003,[x,1.068,z],P.gold,[],.006,6);
  p.collider([.34,.23,.28],[0,1.048,0]);return true;
 }
 if(item.id==='lighting-panel'){
  // Rear mounting plate lies in front of the wall mounting plane z=0.
  b([.49,.36,.020],[0,.21,.011],P.frame);b([.55,.42,.035],[0,.21,.035],P.shell);
  detail([.515,.385,.009],[0,.21,.056],P.dark);
  detail([.447,.293,.003],[-.010,.231,.062],0x163940,[], -.14);
  // A tiny plan etched into the display, rather than a flat blank screen.
  for(const [sx,sy,x,y]of [[.32,.004,0,.329],[.32,.004,0,.139],[.004,.19,-.16,.234],[.004,.19,.16,.234],[.004,.08,0,.289],[.004,.059,0,.168],[.11,.004,.105,.236]])detail([sx,sy,.001],[x-.01,y,.064],P.teal,[],-.25);
  for(const [x,y]of [[-.082,.273],[.087,.285],[.087,.180]]){c(.009,.001,[x,y,.065],P.gold,[Math.PI/2,0,0],.009,12);tor(.016,.0018,[x,y,.065],P.teal);}
  for(let i=0;i<3;i++)detail([.086,.012,.002],[-.115+i*.114,.081,.063],i===0?P.gold:P.teal,[],-.15);
  for(const x of[-.252,.252])for(const y of[.018,.402])c(.004,.002,[x,y,.055],P.frame,[Math.PI/2,0,0],.004,8);
  // Connector/vent detail is visible on the sides, but adds no colliders.
  for(let i=0;i<5;i++)detail([.002,.004,.017],[.276,.15+i*.018,.034],P.dark);
  return true;
 }
 return false;
}

// Give the existing handheld tools distinct authored silhouettes too. These
// are the same cached meshes used by their dropped stacks and catalogue tiles.
export function fieldToolModel(p,item,P){const id=item.id,pi=Math.PI;
 const detail=(size,pos,col=P.gold,glow=0)=>p.add(new T.BoxGeometry(...size),col,pos,[0,0,0],glow,false);
 if(id==='notebook'){
  p.box([.184,.244,.028],[0,.126,0],0xd4cbb9).box([.20,.26,.009],[0,.13,.021],0x906448).box([.20,.26,.009],[0,.13,-.021],0x906448);
  for(let i=0;i<7;i++)p.add(new T.TorusGeometry(.013,.0028,4,12),P.gold,[-.10,.035+i*.032,0],[0,pi/2,0],0,false);
  detail([.125,.006,.001],[.010,.20,.026],P.gold);detail([.105,.004,.001],[.010,.18,.026],P.gold);detail([.052,.051,.001],[.021,.097,.026],P.teal);
 }else if(id==='camera'){
  p.box([.20,.118,.060],[0,.074,0],P.frame).box([.049,.110,.068],[-.08,.073,.002],P.rubber).box([.069,.026,.034],[.026,.143,0],P.shell);
  p.cylinder(.043,.067,[.023,.077,.060],P.rubber,[pi/2,0,0]);p.cylinder(.037,.009,[.023,.077,.100],P.gold,[pi/2,0,0]);p.cylinder(.029,.003,[.023,.077,.107],P.teal,[pi/2,0,0]);p.cylinder(.011,.006,[-.073,.132,0],P.gold);
  detail([.11,.069,.003],[.015,.074,-.032],P.teal,-.3);detail([.021,.015,.005],[-.073,.113,.034],P.shell);
 }else if(id==='visor'){
  for(const x of[-.048,.048]){p.add(new T.TorusGeometry(.045,.009,6,20),P.frame,[x,.08,.027],[0,0,0],0,false);p.cylinder(.037,.009,[x,.08,.030],P.teal,[pi/2,0,0]);p.tube([x*1.92,.082,.02],[x*1.76,.059,-.102],.005,P.rubber);}
  p.box([.028,.012,.018],[0,.080,.027],P.shell);p.tube([-.084,.059,-.10],[.084,.059,-.10],.006,P.rubber);
 }else if(id==='sampler'){
  p.cylinder(.011,.245,[0,.15,0],P.shell);p.cylinder(.014,.036,[0,.273,0],P.frame);p.box([.133,.023,.027],[0,.296,0],P.teal);
  p.cylinder(.031,.067,[0,.033,0],P.frame,[],.023);p.cylinder(.022,.003,[0,.068,0],0x776754);for(let i=0;i<3;i++){const a=i*2*pi/3;p.tube([Math.sin(a)*.023,.029,Math.cos(a)*.023],[Math.sin(a)*.019,.002,Math.cos(a)*.019],.004,P.shell);}
 }else{
  const range=id==='rangefinder';p.box([range?.083:.15,range?.19:.245,.054],[0,range?.097:.126,0],P.frame);
  detail([range?.071:.138,range?.177:.23,.009],[0,range?.098:.128,.031],range?P.gold:P.blue);
  detail([range?.056:.112,range?.068:.125,.003],[0,range?.126:.17,.037],P.teal,-.4);
  for(let i=0;i<3;i++)p.cylinder(.006,.004,[(i-1)*.022,range?.060:.055,.039],P.gold,[pi/2,0,0]);
  if(range){for(const x of[-.022,.020])p.cylinder(.009,.007,[x,.195,0],x<0?P.teal:0xd87959);}
  else if(id==='spectrometer'){for(let i=0;i<6;i++)detail([.009,.025+i*.007,.001],[-.038+i*.016,.17,.040],[0x705caf,0x437eb9,0x5cafa1,0xbbb965,0xc48a50,0xbb6560][i]);p.tube([.045,.25,0],[.065,.296,-.01],.006,P.gold);}
  else {for(const [x,y]of [[-.032,.19],[.03,.207],[.014,.142],[-.022,.133]])p.cylinder(.004,.001,[x,y,.040],P.shell,[pi/2,0,0]);p.tube([-.032,.19,.040],[.03,.207,.040],.0018,P.gold);p.tube([.03,.207,.040],[.014,.142,.040],.0018,P.gold);}
 }
}
