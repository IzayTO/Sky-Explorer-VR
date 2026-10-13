import * as T from './three.module.js?v=4.0.0';
// Preserve the exact three legacy colours at their original temperatures.
export const LAMP_TEMPERATURES=[{label:'Cálida · 2700 K',kelvin:2700,color:0xffc38c},{label:'Neutra · 4000 K',kelvin:4000,color:0xffe6cc},{label:'Fría · 6500 K',kelvin:6500,color:0xd4e6ff}];
const colours=LAMP_TEMPERATURES.map(t=>new T.Color(t.color));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const isLamp=e=>!!e&&(e.item.category==='Iluminación'||!!e.item.decorLight);
export function lampKelvin(params={}){return Number.isFinite(params.kelvin)?clamp(params.kelvin,2700,6500):LAMP_TEMPERATURES[clamp(Math.round(Number(params.temperature)||0),0,2)].kelvin;}
export function lampIntensity(params={}){return Number.isFinite(params.intensity)?clamp(params.intensity,0,1):1;}
export function lampColour(params,target=new T.Color()){const k=lampKelvin(params),i=k<=4000?0:1,t=(k-LAMP_TEMPERATURES[i].kelvin)/(LAMP_TEMPERATURES[i+1].kelvin-LAMP_TEMPERATURES[i].kelvin);return target.copy(colours[i]).lerp(colours[i+1],t);}
export function normaliseLamp(params){params.kelvin=lampKelvin(params);params.intensity=lampIntensity(params);}
