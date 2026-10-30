'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { useScopedToday } from '@/lib/os/useScopedToday';
import { openLegacyApp } from '@/lib/os-prototype/legacyApps';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';
import { DOCK_ASK_SLOT } from '@/lib/mora/hubMood';
import { PixelMora } from '@/components/world/PixelMora';
import type { SpiritMood } from '@/components/world/MoraSpirit';
import type { TodaySnapshot, TodaySourceMeta } from '@/lib/api/todayClient';
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
function minuteOfDay(date:string, today:string):number|null {
  const match = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})/.exec(date);
  if (!match || match[1] !== today) return null;
  const h=Number(match[2]), m=Number(match[3]); return h<24 && m<60 ? h*60+m : null;
}
function berlinNow():number {
  const parts = new Intl.DateTimeFormat('de-DE',{timeZone:'Europe/Berlin',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
  return Number(parts.find(x=>x.type==='hour')?.value ?? 0)*60+Number(parts.find(x=>x.type==='minute')?.value ?? 0);
}
type Props={ onNavigate:(id:string)=>void; onMora:()=>void; onMore:()=>void; mood:SpiritMood; moraOpen:boolean; attention:number; phone:boolean };
export function BridgeConcept({onNavigate,onMora,onMore,mood,moraOpen,attention,phone}:Props) {
  const { snapshot, loading, loadError }=useScopedToday({backgroundRefresh:true});
  const lights=useMemo(()=>bridgeLights(snapshot),[snapshot]);
  const [now,setNow]=useState(berlinNow);
  useEffect(()=>{const timer=setInterval(()=>setNow(berlinNow()),60000);return()=>clearInterval(timer);},[]);
  const timed=lights.map(light=>({light,minute:minuteOfDay(light.date,snapshot?.date ?? '')})).filter((x):x is {light:Light;minute:number}=>x.minute!==null);
  const hour=(m:number)=>`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
  const openLight=(light:Light)=>light.target==='calendar' ? openLegacyApp('calendar') : onNavigate('today');
  const next=snapshot?.calendar.next_event;
  const stations=[
    {name:'Post',value:available(snapshot?.mail) && snapshot?.mail.unread_count!=null ? `${snapshot.mail.unread_count} ungelesen` : 'Nicht verfügbar', action:()=>onNavigate('post')},
    {name:'Kalender',value:!available(snapshot?.calendar) ? 'Nicht verfügbar' : next ? `${next.time ? `Heute ${next.time} · ` : ''}${next.title}` : 'Heute keine Termine',action:()=>openLegacyApp('calendar')},
    {name:'Heute',value:available(snapshot?.tasks) && snapshot?.tasks.counts.open!=null ? `${snapshot.tasks.counts.open} offen` : 'Nicht verfügbar',action:()=>onNavigate('today')},
    {name:'Universe',value:'Deine Bereiche',action:()=>onNavigate('universe')},
    {name:'Vorfälle',value:available(snapshot?.nightwatch) && snapshot?.nightwatch.open_incidents!=null ? snapshot.nightwatch.open_incidents === 0 ? 'Alles ruhig' : `${snapshot.nightwatch.open_incidents} offen` : 'Nicht verfügbar',action:()=>useOsShellStore.getState().setNightwatchOpen(true)},
  ];
  return <nav className="os-dock bridge" data-variant="c" aria-label="SAIMÔR Brücke" data-testid="os-dock">
    <div className="bridge__body" data-testid="dock"><div className="bridge__rim" aria-hidden="true" />
      <div className="bridge__station-wing bridge__station-wing--left">{stations.slice(0,3).map(s=><button type="button" className="bridge__instrument" key={s.name} onClick={s.action}><small>{s.name}</small><strong>{loading?'Lädt …':loadError?'Nicht verfügbar':s.value}</strong></button>)}</div>
      <div className="bridge__heart" data-mood={mood} data-attention={attention>0?'true':undefined}>
        <span className="bridge__beam" aria-hidden="true" />
        <button type="button" className="bridge__mora" aria-pressed={moraOpen} aria-label="MÔRA öffnen" onClick={onMora} data-testid="dock-mora"><PixelMora size={phone?76:112} mood={mood} /></button>
        <div id={DOCK_ASK_SLOT} className="bridge__ask"><button type="button" onClick={onMora} data-testid="dock-ask-open">Frag MÔRA …</button></div>
      </div>
      <div className="bridge__station-wing bridge__station-wing--right">{stations.slice(3).map(s=><button type="button" className="bridge__instrument" key={s.name} onClick={s.action}><small>{s.name}</small><strong>{loading?'Lädt …':loadError?'Nicht verfügbar':s.value}</strong></button>)}<button type="button" className="bridge__instrument bridge__more" onClick={onMore}><small>Weitere Bereiche</small><strong>Mehr <span aria-hidden="true">↗</span></strong></button></div>
      <section className="bridge__day" aria-label="Tagesverlauf"><svg viewBox="0 0 1000 80" preserveAspectRatio="none" aria-hidden="true"><path d="M 12 74 Q 500 -20 988 74" /></svg><span className="bridge__day-start">00 Uhr</span><span className="bridge__day-end">24 Uhr</span>
        {timed.map(({light,minute})=>{const x=4+minute/1440*92; const y=34+Math.pow((x-50)/46,2)*58.5;return <button key={`${light.kind}:${light.id}`} type="button" className="bridge__day-dot" style={{left:`${x}%`,top:`${y}%`}} onClick={()=>openLight(light)} aria-label={`${hour(minute)} ${light.kind}: ${light.label}`}><span className="bridge__tooltip">{hour(minute)} · {light.label}</span></button>;})}
        <span className="bridge__now" style={{left:`${4+now/1440*92}%`,top:`${34+Math.pow(((4+now/1440*92)-50)/46,2)*58.5}%`}} title={`Jetzt ${hour(now)}`} aria-label={`Jetzt ${hour(now)}`} />
      </section>
    </div></nav>;
}

