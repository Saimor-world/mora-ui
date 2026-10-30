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
import { Bell, CalendarDays, Grid2X2, Search, Sparkles } from 'lucide-react';
import { DAY_END, DAY_START, dayMarks, hhmm, mailCounts, moraLine, stations, type Station } from '@/lib/mora/bridgeData';
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

const GaugeRing=({station:g}:{station:Station})=>{const r=19,c=2*Math.PI*r;const frac=g.id==='today'?g.progress??0:g.id==='post'&&Number(g.value)>0?Math.min(1,(parseInt(g.detail)||0)/Number(g.value)):g.tone==='calm'?1:1;
  return <span className="bridge__ring" aria-hidden="true"><svg viewBox="0 0 46 46"><circle cx="23" cy="23" r={r} className="bridge__ring-track" />{g.id!=='nightwatch'?<circle cx="23" cy="23" r={r} className="bridge__ring-fill" strokeDasharray={`${frac*c} ${c}`} transform="rotate(-90 23 23)" />:null}{g.id==='nightwatch'?<polyline className="bridge__pulse" points="9,24 16,24 19,17 23,31 27,20 30,24 37,24" />:null}</svg>{g.id==='post'||g.id==='today'?<b>{g.value}</b>:null}</span>;};
type Props={items:FeatureManifest[]; activeId:string; onNavigate:(id:string)=>void; onMora:()=>void; onMore:()=>void; onNotifications:()=>void; onSearch:()=>void; onControl?:()=>void; mood:SpiritMood; moraOpen:boolean; attention:number; phone:boolean; showLegacy:boolean };
export function BridgeConcept({items,activeId,onNavigate,onMora,onMore,onNotifications,onSearch,onControl,mood,moraOpen,attention,phone,showLegacy}:Props) {
  const { snapshot }=useScopedToday({backgroundRefresh:true});
  const { data: briefing } = useDailyBriefing();
  const briefingUnread = briefing?.metrics?.unread_mails ?? null;
  const mail = mailCounts(snapshot, briefingUnread);
  const incidents = available(snapshot?.nightwatch) ? snapshot?.nightwatch.open_incidents ?? 0 : 0;
  const [now,setNow]=useState(berlinNow);
  useEffect(()=>{const timer=setInterval(()=>setNow(berlinNow()),60000);return()=>clearInterval(timer);},[]);
  const marks=useMemo(()=>dayMarks(snapshot, now),[snapshot, now]);
  const line=useMemo(()=>moraLine(snapshot, now, briefingUnread),[snapshot, now, briefingUnread]);
  const gauges=useMemo(()=>stations(snapshot, briefingUnread),[snapshot, briefingUnread]);
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
  const controls = [
    {id:'search',name:'Suche',icon:Search,action:onSearch},
    ...items.map(item=>({id:item.id,name:item.title,icon:item.icon,action:()=>onNavigate(item.id)})),
    {id:'calendar',name:'Kalender',icon:CalendarDays,action:()=>openLegacyApp('calendar')},
    {id:'notifications',name:'Mitteilungen',icon:Bell,action:incidents>0 && attention===0 ? openNightwatch : onNotifications},
    ...(onControl ? [{id:'control',name:'Kontrollzentrum',icon:Sparkles,action:onControl}] : []),
    {id:'more',name:'Mehr',icon:Grid2X2,action:onMore},
  ];
  const midpoint = Math.ceil(controls.length / 2);
  const renderControl = (control:typeof controls[number]) => {
    const Icon=control.icon;
    const count=control.id==='post' ? mail.unread : control.id==='today' && available(snapshot?.tasks) ? snapshot?.tasks.counts.open : control.id==='notifications' ? attention+incidents : null;
    const next=snapshot?.calendar.next_event;
    const status=control.id==='calendar' && available(snapshot?.calendar) && next?.time ? `Heute ${next.time}` : null;
    return <button type="button" key={control.id} className="bridge__dock-item" data-feature={control.id} data-active={control.id===activeId?'true':undefined} onClick={control.action} title={status ? `${control.name} · ${status}` : control.name} aria-label={control.name} aria-current={control.id===activeId?'page':undefined}><span className="bridge__dock-icon"><Icon size={19} strokeWidth={1.5} />{typeof count==='number' && count>0 ? <b className="bridge__badge" data-alert={control.id==='notifications' && incidents>0 ? 'true' : undefined}>{count>99?'99+':count}</b> : null}</span><span>{control.name}</span>{status ? <small className="bridge__dock-status">{status}</small> : null}</button>;
  };
  return <nav className="os-dock bridge" data-variant="c" aria-label="Hauptnavigation" data-testid="os-dock">
    <div className="bridge__body" data-testid="dock"><div className="bridge__rim" aria-hidden="true" />
      <svg className="bridge__hull" viewBox="0 0 1440 300" preserveAspectRatio="none" aria-hidden="true">
        <defs><linearGradient id="bridge-glass" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#244c42" stopOpacity=".79" /><stop offset=".35" stopColor="#092b29" stopOpacity=".91" /><stop offset="1" stopColor="#021513" stopOpacity=".98" /></linearGradient><linearGradient id="bridge-edge" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#86cfa4" stopOpacity=".45" /><stop offset=".5" stopColor="#e5c983" stopOpacity=".7" /><stop offset="1" stopColor="#86cfa4" stopOpacity=".45" /></linearGradient></defs>
        <path d="M0 0 C220 5 300 82 720 82 C1140 82 1220 5 1440 0 L1440 300 L0 300 Z" fill="url(#bridge-glass)" />
        <path d="M0 0 C220 5 300 82 720 82 C1140 82 1220 5 1440 0" fill="none" stroke="url(#bridge-edge)" strokeWidth="1.5" />
        <path d="M0 22 C220 27 320 103 720 103 C1120 103 1220 27 1440 22" fill="none" stroke="#b2e3bc" strokeOpacity=".16" />
        <path d="M0 190 C250 215 420 235 720 235 C1020 235 1190 215 1440 190" fill="none" stroke="#e5c983" strokeOpacity=".16" />
      </svg>
      <div className="bridge__station-wing bridge__station-wing--left">{controls.slice(0,midpoint).map(renderControl)}</div>
      <div className="bridge__heart" data-mood={mood} data-attention={attention>0?'true':undefined}>
        <span className="bridge__beam" aria-hidden="true" />
        <button ref={moraRef} type="button" className="bridge__mora" data-flying={flight?'true':undefined} style={flight?{transform:`translate(${flight.x}px, ${flight.y}px) scale(.7)`}:undefined} aria-pressed={moraOpen} aria-label="MÔRA" onClick={onMora} data-testid="dock-mora"><span data-testid="mora-mark"><PixelMora size={phone?76:112} mood={mood} /></span></button>
        <p className="bridge__voice" aria-live="polite">{line}</p>
        <div id={DOCK_ASK_SLOT} className="bridge__ask"><button type="button" onClick={onMora} data-testid="dock-ask-open">Frag MÔRA …</button></div>
      </div>
      <div className="bridge__station-wing bridge__station-wing--right">{controls.slice(midpoint).map(renderControl)}</div>
      {showLegacy ? <Link href="/home?classic=1" className="bridge__legacy" data-testid="legacy-shell-link">Klassische Oberfläche</Link> : null}
      <section className="bridge__gauges" aria-label="Lage">
        {gauges.map((g,i)=>{const x=[17,31,69,83][i];const side=x<50?'left':'right';const act=g.id==='post'?()=>onNavigate('post'):g.id==='today'?()=>onNavigate('today'):g.id==='team'?()=>openLegacyApp('calendar'):openNightwatch;return <button key={g.id} type="button" className="bridge__gauge" data-station={g.id} data-tone={g.tone} data-side={side} style={{left:`${x}%`,top:`calc(${hullY(x*14.4)/3}% + 66px)`}} onClick={act} title={`${g.label}: ${g.value} · ${g.detail}`}><GaugeRing station={g} /><span className="bridge__gauge-text"><small>{g.label}</small><strong>{g.id==='nightwatch'||g.id==='team'?g.value:g.detail}</strong></span></button>;})}
      </section>
      <section className="bridge__day" aria-label="Tagesverlauf 6 bis 22 Uhr">
        <span className="bridge__day-edge" style={{left:`${dayX(DAY_START)}%`,top:`${hullY(dayX(DAY_START)*14.4)/3}%`}}>6 Uhr</span>
        <span className="bridge__day-edge" style={{left:`${dayX(DAY_END)}%`,top:`${hullY(dayX(DAY_END)*14.4)/3}%`}}>22 Uhr</span>
        {marks.map((m,i)=>{const x=dayX(m.minute);return <button key={m.id} type="button" className="bridge__mark" data-problem={m.problem?'true':undefined} data-past={m.minute<now?'true':undefined} data-row={i%2} style={{left:`${x}%`,top:`${hullY(x*14.4)/3}%`}} onClick={()=>openLegacyApp('calendar')} aria-label={`${m.time} ${m.label}`}><span className="bridge__mark-label" style={Math.abs(x-50)<7?(x<50?{left:'auto',right:`${Math.round(100-(50-x)*14.4)}px`,transform:'none',bottom:'-4px'}:{left:`${Math.round(100-(x-50)*14.4)}px`,transform:'none',bottom:'-4px'}):undefined}><b>{m.time}</b> {m.label}</span></button>;})}
        {now>=DAY_START && now<=DAY_END ? <span className="bridge__now" style={{left:`${dayX(now)}%`,top:`${hullY(dayX(now)*14.4)/3}%`}} aria-label={`Jetzt ${hhmm(now)}`}><span>jetzt</span></span> : null}
      </section>
    </div></nav>;
}

