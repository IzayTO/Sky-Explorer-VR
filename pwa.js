// Installation/update status is confined to the existing destination screen.
// Diagnostics are opt-in (?diagnostico=1), never a permanent in-game overlay.
const status=document.getElementById('offline-status'),update=document.getElementById('pwa-update');
let registration,installError='',acceptedUpdate=false,lastCheck=0,cacheStatus=null;
const standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
const base=new URL('./',import.meta.url);
function text(message){status.textContent=message;}
function ask(worker,message){return new Promise((resolve,reject)=>{if(!worker)return reject(Error('El servicio offline aún no controla esta ventana.'));const channel=new MessageChannel(),timer=setTimeout(()=>reject(Error('El servicio offline no respondió.')),6000);channel.port1.onmessage=e=>{clearTimeout(timer);channel.port1.close();resolve(e.data);};worker.postMessage(message,[channel.port2]);});}
async function refreshStatus(){
 try{cacheStatus=await ask(navigator.serviceWorker.controller,{type:'SKY_STATUS'});window.SkyOffline=cacheStatus;
  if(cacheStatus.ready){installError='';text('Disponible sin conexión · Tierra y Luna');}
 }catch(error){if(!installError)text('Preparando archivos para uso sin conexión…');}
 renderDiagnostics();
}
function waiting(){if(!registration?.waiting)return;update.hidden=false;update.textContent='Actualización lista · Guardar y recargar';}
async function checkUpdate(force=false){if(!registration||!navigator.onLine||(!force&&Date.now()-lastCheck<60000))return;lastCheck=Date.now();try{await registration.update();waiting();}catch(error){console.warn('[Sky Explorer] No se pudo buscar actualización.',error);}await refreshStatus();}
update.addEventListener('click',()=>{if(!registration?.waiting)return;window.dispatchEvent(new Event('sky-before-update'));acceptedUpdate=true;update.disabled=true;update.textContent='Aplicando…';registration.waiting.postMessage({type:'SKY_APPLY_UPDATE'});});
if('serviceWorker' in navigator&&isSecureContext){
 navigator.serviceWorker.addEventListener('message',event=>{
  const data=event.data||{};
  if(data.type==='SKY_CACHE_PROGRESS')text('Guardando para uso sin conexión · '+data.done+' / '+data.total);
  if(data.type==='SKY_CACHE_ERROR'){installError=data.message;text('Descarga offline pendiente. Conserva Internet y vuelve a abrir.');console.warn('[Sky Explorer] Caché incompleta:',data.message);renderDiagnostics();}
  if(data.type==='SKY_CACHE_READY'||data.type==='SKY_WORKER_ACTIVE'){refreshStatus();waiting();}
 });
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(acceptedUpdate){location.reload();return;}refreshStatus();});
 navigator.serviceWorker.register(new URL('service-worker.js',base),{scope:base.pathname,updateViaCache:'none'}).then(async reg=>{
  registration=reg;waiting();reg.addEventListener('updatefound',()=>{const worker=reg.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'){waiting();refreshStatus();}});});
  await navigator.serviceWorker.ready;await refreshStatus();
  // Persistence is a request, not a promise: Browsers can still evict site data
  // under storage pressure. We never clear localStorage or IndexedDB.
  try{await navigator.storage?.persist?.();}catch{}
 }).catch(error=>{installError=error.message;text('No se pudo preparar el modo offline. Reabre conectado.');console.error('[Sky Explorer] PWA:',error);renderDiagnostics();});
 window.addEventListener('online',()=>checkUpdate(true));document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkUpdate();});
}else text('El modo offline requiere un navegador compatible y una conexión HTTPS.');
let panel=null,details=null,diagnosticTimer=null;
function renderDiagnostics(){if(!details)return;const g=window.SkyDiagnostics||{},p=cacheStatus||{};details.textContent=[
 'Versión: '+(g.version||'iniciando'),
 'Renderer: '+(g.renderer||'iniciando'),
 'Three.js: r'+(g.three||'—'),
 'Gráficos listos: '+(g.ready?'sí':'todavía no'),
 'VR activa: '+(g.xr?'sí':'no')+' · WebXR',
 'Ventana: '+(standalone?'PWA / pantalla de inicio':'pestaña del navegador'),
 'Destino: '+(g.world==='moon'?'Luna':'Tierra'),
 'Sombras de construcciones: '+(g.cachedShadows?'mapas reutilizados':'sin estructuras activas'),
 'Offline: '+(p.ready?'Tierra y Luna guardadas':'descarga pendiente'),
 'Caché: '+(p.version||'preparando'),
 'Archivos: '+(p.files||'—'),
 'Perfil gráfico: '+({auto:'Automático',performance:'Rendimiento',balanced:'Equilibrado',quality:'Calidad'}[g.profile]||'Automático'),
 'Mundo cargado: '+(g.residentWorlds?.map(n=>n==='moon'?'Luna':'Tierra').join(', ')||'preparando'),
 'Límite de render: '+(g.frameLimit?Math.round(g.frameLimit)+' FPS':'60 FPS'),
 'Escala del cielo: '+(g.skyPixelRatio||1).toFixed(2),
 'Escala de píxeles 3D: '+(g.pixelRatio||1).toFixed(2),
 'Promedio reciente: '+(g.averageFrameMs?g.averageFrameMs+' ms / frame':'entra a un destino para medir'),
 Number.isFinite(g.drawCalls)?'Draw calls del último frame: '+g.drawCalls:'',
 g.reason?'Motivo del fallback: '+g.reason:'',installError?'Descarga pendiente: '+installError:''
 ].filter(Boolean).join('\n');}
function openDiagnostics(){
 if(panel)return;panel=document.createElement('dialog');panel.className='pwa-diagnostics';
 const title=document.createElement('h2');title.textContent='Estado de Sky Explorer VR';details=document.createElement('pre');
 const note=document.createElement('p');note.textContent='Esta edición utiliza WebGL2 y WebXR para PC y Meta Quest. Espera a Disponible sin conexión antes de probar sin Internet. Los FPS de tu visor se consultan dentro de VR en Sistema → Diagnóstico.';
 const reload=document.createElement('button');reload.textContent='Buscar actualización';reload.onclick=()=>checkUpdate(true);
 const reset=document.createElement('button');reset.textContent='Restablecer solo la caché offline';reset.onclick=async()=>{
  window.dispatchEvent(new Event('sky-before-update'));reset.disabled=true;
  try{sessionStorage.removeItem('sky-renderer-recovery-'+window.SkyDiagnostics?.version);}catch{}
  try{
   const scopeKey=base.pathname.replace(/[^a-z0-9]/gi,'_'),prefix='sky-explorer-vr-'+scopeKey+'-';
   const own=await navigator.serviceWorker.getRegistration(base.href);if(own?.scope===base.href)await own.unregister();
   for(const name of await caches.keys())if(name.startsWith(prefix))await caches.delete(name);
   cacheStatus=null;installError='Caché retirada. Cierra TODAS las ventanas de Sky Explorer y la app; vuelve a abrir con Internet. Tus guardados siguen intactos.';
   renderDiagnostics();text('Cierra y vuelve a abrir con Internet para preparar los archivos.');
  }catch(error){installError=error.message;renderDiagnostics();reset.disabled=false;}
 };
 const close=document.createElement('button');close.textContent='Cerrar';close.onclick=()=>panel.close();
 panel.append(title,details,note,reload,reset,close);document.body.append(panel);panel.addEventListener('close',()=>{clearInterval(diagnosticTimer);panel.remove();panel=null;details=null;const url=new URL(location.href);url.searchParams.delete('diagnostico');history.replaceState(null,'',url);});
 renderDiagnostics();panel.showModal();diagnosticTimer=setInterval(renderDiagnostics,1000);refreshStatus();
}
// Long press the existing wordmark on the destination screen: diagnostics in
// browser without developer tools or an extra permanent button.
const mark=document.querySelector('#welcome .wordmark');let press;
mark?.addEventListener('pointerdown',()=>{press=setTimeout(openDiagnostics,850);});
for(const type of ['pointerup','pointercancel','pointerleave'])mark?.addEventListener(type,()=>clearTimeout(press));
if(new URL(location.href).searchParams.get('diagnostico')==='1')openDiagnostics();
