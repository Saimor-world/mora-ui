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
function minuteOfDay(date:string, today:string):number|null {
  const match = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})/.exec(date);
  if (!match || match[1] !== today) return null;
  const h=Number(match[2]), m=Number(match[3]); return h<24 && m<60 ? h*60+m : null;
}
function berlinNow():number {
  const parts = new Intl.DateTimeFormat('de-DE',{timeZone:'Europe/Berlin',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
  return Number(parts.find(x=>x.type==='hour')?.value ?? 0)*60+Number(parts.find(x=>x.type==='minute')?.value ?? 0);
}
type Props={items:FeatureManifest[]; activeId:string; onNavigate:(id:string)=>void; onMora:()=>void; onMore:()=>void; onNotifications:()=>void; onSearch:()=>void; onControl?:()=>void; mood:SpiritMood; moraOpen:boolean; attention:number; phone:boolean; showLegacy:boolean };
export function BridgeConcept({items,activeId,onNavigate,onMora,onMore,onNotifications,onSearch,onControl,mood,moraOpen,attention,phone,showLegacy}:Props) {
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
    return <button type="button" key={control.id} className="bridge__dock-item" data-feature={control.id} data-active={control.id===activeId?'true':undefined} onClick={control.action} title={status ? `${control.name} · ${status}` : control.name} aria-label={control.name} aria-current={control.id===activeId?'page':undefined}><span className="bridge__dock-icon"><Icon size={19} strokeWidth={1.5} />{typeof count==='number' && count>0 ? <b className="bridge__badge">{count}</b> : null}</span><span>{control.name}</span>{status ? <small className="bridge__dock-status">{status}</small> : null}</button>;
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
        <button type="button" className="bridge__mora" aria-pressed={moraOpen} aria-label="MÔRA" onClick={onMora} data-testid="dock-mora"><span data-testid="mora-mark"><PixelMora size={phone?76:112} mood={mood} /></span></button>
        <div id={DOCK_ASK_SLOT} className="bridge__ask"><button type="button" onClick={onMora} data-testid="dock-ask-open">Frag MÔRA …</button></div>
      </div>
      <div className="bridge__station-wing bridge__station-wing--right">{controls.slice(midpoint).map(renderControl)}</div>
      {showLegacy ? <Link href="/home?classic=1" className="bridge__legacy" data-testid="legacy-shell-link">Klassische Oberfläche</Link> : null}
      <section className="bridge__day" aria-label="Tagesverlauf"><svg viewBox="0 0 1000 80" preserveAspectRatio="none" aria-hidden="true"><path d="M 12 74 Q 500 -20 988 74" /></svg><span className="bridge__day-start">00 Uhr</span><span className="bridge__day-end">24 Uhr</span>
        {!loading && (loadError || !snapshot || !available(snapshot.calendar) || !available(snapshot.tasks)) ? <span className="bridge__source-state">Tagesdaten teilweise nicht verfügbar</span> : null}
        {timed.map(({light,minute})=>{const x=4+minute/1440*92; const y=34+Math.pow((x-50)/46,2)*58.5;return <button key={`${light.kind}:${light.id}`} type="button" className="bridge__day-dot" style={{left:`${x}%`,top:`${y}%`}} onClick={()=>openLight(light)} aria-label={`${hour(minute)} ${light.kind}: ${light.label}`}><span className="bridge__tooltip">{hour(minute)} · {light.label}</span></button>;})}
        <span className="bridge__now" style={{left:`${4+now/1440*92}%`,top:`${34+Math.pow(((4+now/1440*92)-50)/46,2)*58.5}%`}} title={`Jetzt ${hour(now)}`} aria-label={`Jetzt ${hour(now)}`} />
      </section>
    </div></nav>;
}

