'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { useScopedToday } from '@/lib/os/useScopedToday';
import { openLegacyApp } from '@/lib/os-prototype/legacyApps';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';
import { DOCK_ASK_SLOT } from '@/lib/mora/hubMood';
import { PixelMora } from '@/components/world/PixelMora';
import type { SpiritMood } from '@/components/world/MoraSpirit';
import type { TodaySnapshot, TodaySourceMeta } from '@/lib/api/todayClient';
import type { FeatureManifest } from '@/features/types';
import { Bell, CalendarDays, CircleAlert, Grid2X2, Search, Sparkles } from 'lucide-react';
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
type Props={items:FeatureManifest[]; activeId:string; onNavigate:(id:string)=>void; onMora:()=>void; onMore:()=>void; onNotifications:()=>void; onSearch:()=>void; onControl?:()=>void; mood:SpiritMood; moraOpen:boolean; attention:number; phone:boolean };
export function BridgeConcept({items,activeId,onNavigate,onMora,onMore,onNotifications,onSearch,onControl,mood,moraOpen,attention,phone}:Props) {
  const { snapshot, loading, loadError }=useScopedToday({backgroundRefresh:true});
  const lights=useMemo(()=>bridgeLights(snapshot),[snapshot]);
  const [now,setNow]=useState(berlinNow);
  useEffect(()=>{const timer=setInterval(()=>setNow(berlinNow()),60000);return()=>clearInterval(timer);},[]);
  const timed=lights.map(light=>({light,minute:minuteOfDay(light.date,snapshot?.date ?? '')})).filter((x):x is {light:Light;minute:number}=>x.minute!==null);
  const hour=(m:number)=>`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
  const openLight=(light:Light)=>light.target==='calendar' ? openLegacyApp('calendar') : onNavigate('today');
  const controls = [
    {id:'search',name:'Suche',icon:Search,action:onSearch},
    ...items.map(item=>({id:item.id,name:item.title,icon:item.icon,action:()=>onNavigate(item.id)})),
    {id:'calendar',name:'Kalender',icon:CalendarDays,action:()=>openLegacyApp('calendar')},
    {id:'notifications',name:'Mitteilungen',icon:Bell,action:onNotifications},
    ...(available(snapshot?.nightwatch) ? [{id:'incidents',name:'Vorfälle',icon:CircleAlert,action:()=>useOsShellStore.getState().setNightwatchOpen(true)}] : []),
    ...(onControl ? [{id:'control',name:'Kontrollzentrum',icon:Sparkles,action:onControl}] : []),
    {id:'more',name:'Mehr',icon:Grid2X2,action:onMore},
  ];
  const midpoint = Math.ceil(controls.length / 2);
  const renderControl = (control:typeof controls[number]) => {
    const Icon=control.icon;
    const count=control.id==='post' && available(snapshot?.mail) ? snapshot?.mail.unread_count : control.id==='today' && available(snapshot?.tasks) ? snapshot?.tasks.counts.open : control.id==='notifications' ? attention : control.id==='incidents' && available(snapshot?.nightwatch) ? snapshot?.nightwatch.open_incidents : null;
    const next=snapshot?.calendar.next_event;
    const status=control.id==='calendar' && available(snapshot?.calendar) && next?.time ? `Heute ${next.time}` : control.id==='incidents' && count===0 ? 'Ruhig' : null;
    return <button type="button" key={control.id} className="bridge__dock-item" data-active={control.id===activeId?'true':undefined} onClick={control.action} title={status ? `${control.name} · ${status}` : control.name} aria-current={control.id===activeId?'page':undefined}><span className="bridge__dock-icon"><Icon size={19} strokeWidth={1.5} />{typeof count==='number' && count>0 ? <b className="bridge__badge">{count}</b> : null}</span><span>{control.name}</span>{status ? <small className="bridge__dock-status">{status}</small> : null}</button>;
  };
  return <nav className="os-dock bridge" data-variant="c" aria-label="SAIMÔR Brücke" data-testid="os-dock">
    <div className="bridge__body" data-testid="dock"><div className="bridge__rim" aria-hidden="true" />
      <div className="bridge__station-wing bridge__station-wing--left">{controls.slice(0,midpoint).map(renderControl)}</div>
      <div className="bridge__heart" data-mood={mood} data-attention={attention>0?'true':undefined}>
        <span className="bridge__beam" aria-hidden="true" />
        <button type="button" className="bridge__mora" aria-pressed={moraOpen} aria-label="MÔRA öffnen" onClick={onMora} data-testid="dock-mora"><PixelMora size={phone?76:112} mood={mood} /></button>
        <div id={DOCK_ASK_SLOT} className="bridge__ask"><button type="button" onClick={onMora} data-testid="dock-ask-open">Frag MÔRA …</button></div>
      </div>
      <div className="bridge__station-wing bridge__station-wing--right">{controls.slice(midpoint).map(renderControl)}</div>
      <section className="bridge__day" aria-label="Tagesverlauf"><svg viewBox="0 0 1000 80" preserveAspectRatio="none" aria-hidden="true"><path d="M 12 74 Q 500 -20 988 74" /></svg><span className="bridge__day-start">00 Uhr</span><span className="bridge__day-end">24 Uhr</span>
        {!loading && (loadError || !snapshot || !available(snapshot.calendar) || !available(snapshot.tasks)) ? <span className="bridge__source-state">Tagesdaten teilweise nicht verfügbar</span> : null}
        {timed.map(({light,minute})=>{const x=4+minute/1440*92; const y=34+Math.pow((x-50)/46,2)*58.5;return <button key={`${light.kind}:${light.id}`} type="button" className="bridge__day-dot" style={{left:`${x}%`,top:`${y}%`}} onClick={()=>openLight(light)} aria-label={`${hour(minute)} ${light.kind}: ${light.label}`}><span className="bridge__tooltip">{hour(minute)} · {light.label}</span></button>;})}
        <span className="bridge__now" style={{left:`${4+now/1440*92}%`,top:`${34+Math.pow(((4+now/1440*92)-50)/46,2)*58.5}%`}} title={`Jetzt ${hour(now)}`} aria-label={`Jetzt ${hour(now)}`} />
      </section>
    </div></nav>;
}

