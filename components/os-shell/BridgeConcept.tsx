'use client';
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { flightOffset, useMoraPresence } from '@/lib/mora/moraPresence';
import { useScopedToday } from '@/lib/os/useScopedToday';
import { openLegacyApp } from '@/lib/os-prototype/legacyApps';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';
import { DOCK_ASK_SLOT } from '@/lib/mora/hubMood';
import { PixelMora } from '@/components/world/PixelMora';
import type { SpiritMood } from '@/components/world/MoraSpirit';
import type { TodaySnapshot, TodaySourceMeta } from '@/lib/api/todayClient';
import type { FeatureManifest } from '@/features/types';
import { AlarmClock, Bell, CalendarClock, CalendarDays, Grid2X2, Search, Sparkles, SunMoon } from 'lucide-react';
import { SCENES, sceneFor, type SceneId } from '@/lib/os-prototype/scene';
import { DAY_END, DAY_START, dayMarks, hhmm, mailCounts, moraLine, stageCard, stations, type Station } from '@/lib/mora/bridgeData';
import { useDailyBriefing } from '@/lib/queries/useDailyBriefing';
import Link from 'next/link';
import './bridge-concept.css';

type Light = { id:string; label:string; date:string; kind:'Termin'|'Aufgabe'; target:'calendar'|'today' };
export function bridgeLights(snapshot: TodaySnapshot | null): Light[] {
  if (!snapshot) return [];
  const lights: Light[] = [];
  if (snapshot.calendar.status === 'ok' && snapshot.calendar.complete) for (const e of snapshot.calendar.events) if (e.id && e.title && e.date) lights.push({id:e.id,label:e.title,date:`${e.date}${e.time ? ` ${e.time}` : ''}`,kind:'Termin',target:'calendar'});
  if (snapshot.tasks.status === 'ok' && snapshot.tasks.complete) for (const t of snapshot.tasks.items) if (t.id && t.title && t.due_date && t.status !== 'done') lights.push({id:t.id,label:t.title,date:t.due_date,kind:'Aufgabe',target:'today'});
  return lights.sort((a,b)=>a.date.replace(' ','T').localeCompare(b.date.replace(' ','T')));
}
const available = (source?: TodaySourceMeta) => !!source?.complete && (source.status === 'ok' || source.status === 'empty');
function berlinNow():number {
  const parts = new Intl.DateTimeFormat('de-DE',{timeZone:'Europe/Berlin',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
  return Number(parts.find(x=>x.type==='hour')?.value ?? 0)*60+Number(parts.find(x=>x.type==='minute')?.value ?? 0);
}
/** y (viewBox 1440×300) der Rumpfkante bei x – die Tagesleiste liegt genau auf dieser Kurve. */
function hullY(x:number):number {
  const half=x<=720; const X=half?x:1440-x; let best=0, d=1e9;
  for(let i=0;i<=200;i++){const t=i/200,u=1-t;const bx=3*u*u*t*220+3*u*t*t*300+t*t*t*720;const by=3*u*u*t*5+3*u*t*t*82+t*t*t*82;if(Math.abs(bx-X)<d){d=Math.abs(bx-X);best=by;}}
  return best;
}
const dayX=(minute:number)=>5+(Math.min(DAY_END,Math.max(DAY_START,minute))-DAY_START)/(DAY_END-DAY_START)*90;

const Ring=({station:g}:{station:Station})=>{const r=13,c=2*Math.PI*r;const frac=g.id==='today'?g.progress??0:g.id==='post'&&Number(g.value)>0?Math.min(1,(parseInt(g.detail)||0)/Number(g.value)):1;
  return <span className="bridge__ring" aria-hidden="true"><svg viewBox="0 0 32 32"><circle cx="16" cy="16" r={r} className="bridge__ring-track" />{g.id==='nightwatch'?<polyline className="bridge__pulse" points="6,16 11,16 13,11 16,22 19,13 21,16 26,16" />:<circle cx="16" cy="16" r={r} className="bridge__ring-fill" strokeDasharray={`${frac*c} ${c}`} transform="rotate(-90 16 16)" />}</svg></span>;};
/** Text der Komplikation: nie dieselbe Zahl wie das Badge am Icon. */
type Orb={key:string;src:string;x:number;y:number;size:number};
/** Spiegelbilder der Glasplaneten: Position je Sekunde nachmessen (billig, kein Canvas). */
function useOrbReflections(water:React.RefObject<HTMLDivElement|null>):Orb[]{
  const [orbs,setOrbs]=useState<Orb[]>([]);
  useEffect(()=>{let last='';
    const measure=()=>{const w=water.current?.getBoundingClientRect();if(!w)return;
      const next=[...document.querySelectorAll<HTMLElement>('.glass-orb')].filter(o=>!o.closest('.bridge')).map((o,i)=>{const r=o.getBoundingClientRect();const img=o.querySelector('img');
        // gespiegelt an der Wasserlinie, gestaucht wie auf echter Wasseroberfläche
        const x=r.left+r.width/2-w.left;const line=hullY(x/w.width*1440)/300*w.height;
        return {key:String(i),src:img?.getAttribute('src')??'',x,y:line+Math.max(4,(w.top+line-(r.top+r.height/2))*.22),size:r.width*.8};}).filter(o=>o.src&&o.size>0);
      const sig=next.map(o=>`${o.src}${Math.round(o.x)}:${Math.round(o.y)}`).join('|');if(sig!==last){last=sig;setOrbs(next);}};
    measure();const t=setInterval(measure,1000);window.addEventListener('resize',measure);
    return()=>{clearInterval(t);window.removeEventListener('resize',measure);};
  },[water]);
  return orbs;
}
/** Zusatz-Widgets: nur echte Snapshot-Werte; fehlt die Quelle, steht dort „Offline“. */
type Widget={id:string;label:string;value:string;tone:'calm'|'amber'|'red';icon:typeof CalendarClock;target:'calendar'|'today'|'control'};
export function bridgeWidgets(snapshot:TodaySnapshot|null, phase:SceneId|null):Widget[]{
  const cal=snapshot&&available(snapshot.calendar)?snapshot.calendar:null;
  const tasks=snapshot&&available(snapshot.tasks)?snapshot.tasks:null;
  const next=cal?.next_event;
  const overdue=tasks?(tasks.counts.overdue??tasks.overdue.length):null;
  const count=cal?(cal.count??cal.events.filter(e=>e.date===snapshot?.date).length):null;
  const scene=phase?SCENES.find(x=>x.id===phase):null;
  return [
    {id:'next',label:'Als Nächstes',value:!cal?'Offline':next?`${next.time?`${next.time} `:''}${next.title.replace(/\[(fiktiv)\]|\((fiktiv)\)/gi,'').trim()}`:'Heute frei',tone:'calm',icon:CalendarClock,target:'calendar'},
    {id:'overdue',label:'Überfällig',value:overdue===null?'Offline':overdue?`${overdue} ${overdue===1?'Aufgabe':'Aufgaben'}`:'Nichts',tone:overdue?'amber':'calm',icon:AlarmClock,target:'today'},
    {id:'events',label:'Termine',value:count===null?'Offline':String(count),tone:'calm',icon:CalendarDays,target:'calendar'},
    {id:'phase',label:'Zeit-Theme',value:scene?`${scene.label} · ${scene.range.split(' · ')[0]}`:'…',tone:'calm',icon:SunMoon,target:'control'},
  ];
}
const complicationText=(g:Station)=>g.id==='team'||g.id==='nightwatch'?g.value:g.detail;
type Props={items:FeatureManifest[]; activeId:string; onNavigate:(id:string)=>void; onMora:()=>void; onMore:()=>void; onNotifications:()=>void; onSearch:()=>void; onControl?:()=>void; mood:SpiritMood; moraOpen:boolean; attention:number; phone:boolean; showLegacy:boolean };
const DISMISS_KEY='mora.bridge.dismissed';
export function BridgeConcept({items,activeId,onNavigate,onMora,onMore,onNotifications,onSearch,onControl,mood,moraOpen,attention,phone,showLegacy}:Props) {
  const { snapshot }=useScopedToday({backgroundRefresh:true});
  const { data: briefing } = useDailyBriefing();
  const briefingUnread = briefing?.metrics?.unread_mails ?? null;
  const mail = mailCounts(snapshot, briefingUnread);
  const incidents = available(snapshot?.nightwatch) ? snapshot?.nightwatch.open_incidents ?? 0 : 0;
  const [now,setNow]=useState(berlinNow);
  useEffect(()=>{const timer=setInterval(()=>setNow(berlinNow()),60000);return()=>clearInterval(timer);},[]);
  const marks=useMemo(()=>dayMarks(snapshot, now, 8),[snapshot, now]);
  const line=useMemo(()=>moraLine(snapshot, now, briefingUnread),[snapshot, now, briefingUnread]);
  const gauges=useMemo(()=>stations(snapshot, briefingUnread),[snapshot, briefingUnread]);
  const card=useMemo(()=>stageCard(snapshot, now, briefingUnread),[snapshot, now, briefingUnread]);
  const [dismissed,setDismissed]=useState<string|null>(null);
  useEffect(()=>{try{setDismissed(sessionStorage.getItem(DISMISS_KEY));}catch{/* privat */}},[]);
  const [asking,setAsking]=useState(false);
  // Aktiv: etwas Dringendes (bis „Später“) oder Frag MÔRA ist offen/fokussiert.
  const active=!!card && (moraOpen || asking || (card.urgent && dismissed!==card.id));
  const phaseOverride=useOsShellStore(s=>s.phaseOverride);
  const [phase,setPhase]=useState<SceneId|null>(null);
  useEffect(()=>{const p=phaseOverride??sceneFor(new Date()).id;setPhase(p);document.documentElement.dataset.phase=p;},[phaseOverride,now]);
  const widgets=useMemo(()=>bridgeWidgets(snapshot,phase),[snapshot,phase]);
  const waterRef=useRef<HTMLDivElement>(null);
  const orbs=useOrbReflections(waterRef);
  const target=useMoraPresence(s=>s.target);
  const moraRef=useRef<HTMLButtonElement>(null);
  const [flight,setFlight]=useState<{x:number;y:number}|null>(null);
  useLayoutEffect(()=>{
    if(target.kind==='dock'){setFlight(null);return;}
    const measure=()=>{const el=moraRef.current;if(!el)return;const prev=el.style.transform;el.style.transform='none';const home=el.getBoundingClientRect();el.style.transform=prev;setFlight(flightOffset(home,document.querySelector(target.selector)?.getBoundingClientRect()??null));};
    const raf=requestAnimationFrame(measure);window.addEventListener('resize',measure);
    return()=>{cancelAnimationFrame(raf);window.removeEventListener('resize',measure);};
  },[target]);
  const openNightwatch=()=>useOsShellStore.getState().setNightwatchOpen(true);
  const openTarget=(t:'calendar'|'post'|'nightwatch')=>t==='calendar'?openLegacyApp('calendar'):t==='post'?onNavigate('post'):openNightwatch();
  const later=()=>{if(!card)return;setDismissed(card.id);setAsking(false);try{sessionStorage.setItem(DISMISS_KEY,card.id);}catch{/* privat */}};
  const controls = [
    {id:'search',name:'Suche',icon:Search,action:onSearch},
    ...items.map(item=>({id:item.id,name:item.title,icon:item.icon,action:()=>onNavigate(item.id)})),
    {id:'calendar',name:'Kalender',icon:CalendarDays,action:()=>openLegacyApp('calendar')},
    {id:'notifications',name:'Mitteilungen',icon:Bell,action:incidents>0 && attention===0 ? openNightwatch : onNotifications},
    ...(onControl ? [{id:'control',name:'Kontrollzentrum',icon:Sparkles,action:onControl}] : []),
    {id:'more',name:'Mehr',icon:Grid2X2,action:onMore},
  ];
  const renderControl = (control:typeof controls[number]) => {
    const Icon=control.icon;
    const count=control.id==='post' ? mail.unread : control.id==='today' && available(snapshot?.tasks) ? snapshot?.tasks.counts.open : control.id==='notifications' ? attention+incidents : null;
    const next=snapshot?.calendar.next_event;
    const status=control.id==='calendar' && available(snapshot?.calendar) && next?.time ? `Heute ${next.time}` : null;
    const tip=status ? `${control.name} · ${status}` : control.name;
    return <button type="button" key={control.id} className="bridge__app" data-feature={control.id} data-tip={tip} data-active={control.id===activeId?'true':undefined} onClick={control.action} aria-label={tip} aria-current={control.id===activeId?'page':undefined}><span className="bridge__app-icon"><Icon size={22} strokeWidth={1.5} /></span>{typeof count==='number' && count>0 ? <b className="bridge__badge" data-alert={control.id==='notifications' && incidents>0 ? 'true' : undefined}>{count>99?'99+':count}</b> : null}</button>;
  };
  const holoRef=useRef<HTMLElement|null>(null);
  const [holoPos,setHoloPos]=useState<{left:number;top:number}|null>(null);
  const showHolo=Boolean(active&&card);
  useEffect(()=>{
    if(!showHolo)return;
    /** Kollisionsfrei: nächstgelegene freie Stelle über dem Wasser, Planeten und Tageslabels bleiben frei. */
    const place=()=>{
      const el=holoRef.current; const host=el?.offsetParent as HTMLElement|null; if(!el||!host)return;
      const hr=host.getBoundingClientRect(); const w=el.offsetWidth, h=el.offsetHeight;
      const obstacles=Array.from(document.querySelectorAll<HTMLElement>('.ck-planet,.bridge__mark-label,.bridge__mora,.bridge__voice,.bridge__comp')).map(o=>o.getBoundingClientRect()).filter(r=>r.width>0);
      const free=(l:number,t:number)=>t>=64&&l>=16&&l+w<=window.innerWidth-16&&!obstacles.some(o=>l<o.right+8&&l+w>o.left-8&&t<o.bottom+8&&t+h>o.top-8);
      const cx=hr.left+hr.width/2; let best:{l:number;t:number;d:number}|null=null;
      for(let t=hr.top-h-8;t>hr.top-h-360;t-=12)for(let l=16;l+w<=window.innerWidth-16;l+=16){if(!free(l,t))continue;const d=Math.hypot(l+w/2-cx,(hr.top-h-8-t)*1.6);if(!best||d<best.d)best={l,t,d};}
      setHoloPos(best?{left:best.l-hr.left,top:best.t-hr.top}:null);
    };
    const t=window.setTimeout(place,700);window.addEventListener('resize',place);
    return()=>{window.clearTimeout(t);window.removeEventListener('resize',place);};
  },[showHolo,card?.title]);
  const act=(g:Station)=>g.id==='post'?()=>onNavigate('post'):g.id==='today'?()=>onNavigate('today'):g.id==='team'?()=>openLegacyApp('calendar'):openNightwatch;
  const complication=(g:Station)=><button key={g.id} type="button" className="bridge__comp" data-station={g.id} data-tone={g.tone} onClick={act(g)} title={`${g.label}: ${g.value} · ${g.detail}`}><Ring station={g} /><span className="bridge__comp-text"><small>{g.label}</small><strong>{complicationText(g)}</strong></span></button>;
  const widget=(w:Widget)=>{const Icon=w.icon;const go=w.target==='calendar'?()=>openLegacyApp('calendar'):w.target==='today'?()=>onNavigate('today'):(onControl??onMore);
    return <button key={w.id} type="button" className="bridge__comp bridge__comp--mini" data-station={w.id} data-tone={w.tone} onClick={go} title={`${w.label}: ${w.value}`}><span className="bridge__ring bridge__ring--icon" aria-hidden="true"><Icon size={16} strokeWidth={1.6} /></span><span className="bridge__comp-text"><small>{w.label}</small><strong>{w.value}</strong></span></button>;};
  // Tagesbogen: höchstens 4 Beschriftungen, alle oberhalb, keine im MÔRA-Bereich.
  const arc=marks.map(m=>({...m,x:dayX(m.minute)})).filter(m=>Math.abs(m.x-50)>=11)
    .reduce<(typeof marks[number]&{x:number})[]>((kept,m)=>kept.length<4 && kept.every(k=>Math.abs(k.x-m.x)>=16) ? [...kept,m] : kept,[])
    .sort((a,b)=>a.x-b.x);
  return <nav className="os-dock bridge" data-variant="c" aria-label="Hauptnavigation" data-testid="os-dock">
    <div className="bridge__body" data-testid="dock" data-active={active?'true':undefined}>
      <svg className="bridge__hull" viewBox="0 0 1440 300" preserveAspectRatio="none" aria-hidden="true">
        <defs><linearGradient id="bridge-glass" x1="0" y1="0" x2="0" y2="1"><stop style={{stopColor:'var(--dw-top)'}} stopOpacity=".38" /><stop offset=".35" style={{stopColor:'var(--dw-mid)'}} stopOpacity=".7" /><stop offset="1" style={{stopColor:'var(--dw-bot)'}} stopOpacity=".95" /></linearGradient><linearGradient id="bridge-edge" x1="0" y1="0" x2="1" y2="0"><stop style={{stopColor:'var(--dw-rim)'}} stopOpacity=".12" /><stop offset=".5" style={{stopColor:'var(--dw-rim-hi)'}} stopOpacity=".7" /><stop offset="1" style={{stopColor:'var(--dw-rim)'}} stopOpacity=".12" /></linearGradient></defs>
        <path d="M0 0 C220 5 300 82 720 82 C1140 82 1220 5 1440 0 L1440 300 L0 300 Z" fill="url(#bridge-glass)" />
        <path d="M0 0 C220 5 300 82 720 82 C1140 82 1220 5 1440 0" fill="none" stroke="url(#bridge-edge)" strokeWidth="6" strokeOpacity=".18" vectorEffect="non-scaling-stroke" /><path d="M0 0 C220 5 300 82 720 82 C1140 82 1220 5 1440 0" fill="none" stroke="url(#bridge-edge)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </svg>
      <div ref={waterRef} className="bridge__water" aria-hidden="true">
        <span className="bridge__reflect">{orbs.map(o=>(
          // eslint-disable-next-line @next/next/no-img-element
          <img key={o.key} src={o.src} alt="" style={{left:o.x,top:o.y,width:o.size,height:o.size*.6,marginLeft:-o.size/2}} />
        ))}</span>
        <span className="bridge__sparkle" /><span className="bridge__ripple" />
      </div>
      <section className="bridge__day" aria-label="Tagesverlauf 6 bis 22 Uhr">
        {arc.map(m=><button key={m.id} type="button" className="bridge__mark" data-problem={m.problem?'true':undefined} data-past={m.minute<now?'true':undefined} data-edge={m.x<16?'start':m.x>84?'end':undefined} style={{left:`${m.x}%`,top:`${hullY(m.x*14.4)/3}%`}} onClick={()=>openLegacyApp('calendar')} aria-label={`${m.time} ${m.label}`}><span className="bridge__mark-label"><b>{m.time}</b> {m.label}</span></button>)}
        {now>=DAY_START && now<=DAY_END ? <span className="bridge__now" style={{left:`${dayX(now)}%`,top:`${hullY(dayX(now)*14.4)/3}%`}} aria-label={`Jetzt ${hhmm(now)}`} title={`Jetzt ${hhmm(now)}`} /> : null}
      </section>
      <span className="bridge__plate" aria-hidden="true" />
      <section className="bridge__comps" aria-label="Lage">
        <div className="bridge__comps-side" data-side="left">{gauges.slice(0,2).map(complication)}{widgets.slice(0,2).map(widget)}</div>
        <div className="bridge__comps-gap" aria-hidden="true" />
        <div className="bridge__comps-side" data-side="right">{gauges.slice(2,4).map(complication)}{widgets.slice(2,4).map(widget)}</div>
      </section>
      <div className="bridge__heart" data-mood={mood} data-attention={attention>0?'true':undefined}>
        <span className="bridge__beam" aria-hidden="true" />
        <span className="bridge__aura" aria-hidden="true"><i /><i /><i /><i /></span>
        {active && card ? <article ref={holoRef} className="bridge__holo" style={holoPos?{left:holoPos.left,top:holoPos.top,right:"auto"}:undefined} data-placed={holoPos?"true":undefined} data-kind={card.kind} data-urgent={card.urgent?'true':undefined} aria-live="polite">
          <small>{card.eyebrow}</small><strong>{card.title}</strong><p>{card.detail}</p>
          <div className="bridge__holo-actions"><button type="button" data-primary="true" onClick={()=>openTarget(card.primary.target)}>{card.primary.label}</button>{card.urgent?<button type="button" onClick={later}>Später</button>:null}</div>
        </article> : null}
        <button ref={moraRef} type="button" className="bridge__mora" data-flying={flight?'true':undefined} style={flight?{transform:`translate(${flight.x}px, ${flight.y}px) scale(.7)`}:undefined} aria-pressed={moraOpen} aria-label="MÔRA" onClick={onMora} data-testid="dock-mora"><span data-testid="mora-mark"><PixelMora size={phone?76:104} mood={mood} /></span></button>
        <p className="bridge__voice" aria-live="polite">{line}</p>
        <div id={DOCK_ASK_SLOT} className="bridge__ask" onFocus={()=>setAsking(true)} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node|null))setAsking(false);}}><button type="button" onClick={onMora} data-testid="dock-ask-open"><Search size={15} strokeWidth={1.75} aria-hidden="true" /><span>Frag MÔRA …</span><kbd>M</kbd></button></div>
      </div>
      <div className="bridge__pill" role="toolbar" aria-label="Apps">{controls.map(renderControl)}</div>
      {showLegacy ? <Link href="/home?classic=1" className="bridge__legacy" data-testid="legacy-shell-link">Klassische Oberfläche</Link> : null}
    </div></nav>;
}
