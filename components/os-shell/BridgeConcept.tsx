'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { useScopedToday } from '@/lib/os/useScopedToday';
import { openLegacyApp } from '@/lib/os-prototype/legacyApps';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';
import { DOCK_ASK_SLOT } from '@/lib/mora/hubMood';
import { PixelMoraMark } from '@/components/world/PixelMora';
import type { SpiritMood } from '@/components/world/MoraSpirit';
import type { TodaySnapshot } from '@/lib/api/todayClient';
import type { FeatureManifest } from '@/features/types';
import { Bell, CalendarDays, Grid2X2, Search, SlidersHorizontal } from 'lucide-react';
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
function berlinNow():number {
  const parts = new Intl.DateTimeFormat('de-DE',{timeZone:'Europe/Berlin',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
  return Number(parts.find(x=>x.type==='hour')?.value ?? 0)*60+Number(parts.find(x=>x.type==='minute')?.value ?? 0);
}

/** Position auf dem flachen Tagesbogen (6–22 Uhr) in Prozent. */
const arcX = (minute:number) => 3 + (Math.min(DAY_END, Math.max(DAY_START, minute)) - DAY_START) / (DAY_END - DAY_START) * 94;
const arcY = (x:number) => 100 - (1 - Math.pow((x - 50) / 50, 2)) * 70;

const DOCK_ORDER = ['search','home','today','post','calendar','knowledge','universe'];
const DOCK_TAIL = ['notifications','control','settings','more'];

type Props={items:FeatureManifest[]; activeId:string; onNavigate:(id:string)=>void; onMora:()=>void; onMore:()=>void; onNotifications:()=>void; onSearch:()=>void; onControl?:()=>void; mood:SpiritMood; moraOpen:boolean; attention:number; phone:boolean; showLegacy?:boolean};

function StationCard({station, onOpen}:{station:Station; onOpen:()=>void}) {
  const ring = station.progress;
  return <button type="button" className="bridge__station" data-tone={station.tone} data-station={station.id} onClick={onOpen} aria-label={`${station.label}: ${station.value}, ${station.detail}`}>
    <small>{station.label}</small>
    <span className="bridge__station-row">
      {ring !== undefined ? <svg className="bridge__ring" viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15" /><circle cx="18" cy="18" r="15" className="bridge__ring-fill" strokeDasharray={`${Math.max(2, ring * 94.2)} 94.2`} /></svg> : null}
      {station.id === 'nightwatch' && station.tone === 'calm' ? <svg className="bridge__pulse" viewBox="0 0 60 18" aria-hidden="true"><path d="M0 10 H18 L22 4 L27 15 L31 7 L34 10 H60" /></svg> : null}
      <strong>{station.value}</strong>
    </span>
    <em>{station.detail}</em>
  </button>;
}

export function BridgeConcept({items,activeId,onNavigate,onMora,onMore,onNotifications,onSearch,onControl,mood,moraOpen,attention,phone,showLegacy}:Props) {
  const { snapshot }=useScopedToday({backgroundRefresh:true});
  const { data: briefing } = useDailyBriefing();
  const briefingUnread = briefing?.metrics?.unread_mails ?? null;
  const [now,setNow]=useState(berlinNow);
  useEffect(()=>{const timer=setInterval(()=>setNow(berlinNow()),60000);return()=>clearInterval(timer);},[]);
  const marks=useMemo(()=>dayMarks(snapshot, now),[snapshot, now]);
  const cards=useMemo(()=>stations(snapshot, briefingUnread),[snapshot, briefingUnread]);
  const line=useMemo(()=>moraLine(snapshot, now, briefingUnread),[snapshot, now, briefingUnread]);
  const mail=mailCounts(snapshot, briefingUnread);
  const incidents = snapshot?.nightwatch?.open_incidents ?? 0;
  const openNightwatch=()=>useOsShellStore.getState().setNightwatchOpen(true);

  type App={id:string;name:string;icon:FeatureManifest['icon'];action:()=>void;badge?:number|null;alert?:boolean};
  const byId=new Map<string,App>();
  byId.set('search',{id:'search',name:'Suche',icon:Search,action:onSearch});
  for (const item of items) if (item.id !== 'mora' && !byId.has(item.id)) byId.set(item.id,{id:item.id,name:item.title,icon:item.icon,action:()=>onNavigate(item.id)});
  byId.set('calendar',{id:'calendar',name:'Kalender',icon:CalendarDays,action:()=>openLegacyApp('calendar')});
  byId.set('notifications',{id:'notifications',name:'Mitteilungen',icon:Bell,action:incidents>0 && attention===0 ? openNightwatch : onNotifications,badge:attention+incidents,alert:incidents>0});
  if (onControl) byId.set('control',{id:'control',name:'Control Center',icon:SlidersHorizontal,action:onControl});
  byId.set('more',{id:'more',name:'Mehr',icon:Grid2X2,action:onMore});
  const post=byId.get('post'); if (post) post.badge=mail.unread;
  const today=byId.get('today'); if (today && snapshot?.tasks?.complete) today.badge=snapshot.tasks.counts.open;
  const middle=[...byId.keys()].filter(id=>!DOCK_ORDER.includes(id)&&!DOCK_TAIL.includes(id));
  const apps=[...DOCK_ORDER,...middle,...DOCK_TAIL].map(id=>byId.get(id)).filter((a):a is App=>!!a);

  const openStation=(id:Station['id'])=>{ if(id==='post'||id==='today') onNavigate(id); else if(id==='team') openLegacyApp('calendar'); else openNightwatch(); };
  const nowX=arcX(now);
  const left=cards.slice(0,2), right=cards.slice(2);

  return <nav className="os-dock bridge" data-variant="c" aria-label="Hauptnavigation" data-testid="os-dock">
    <div className="bridge__body" data-testid="dock">
      <span className="bridge__glass" aria-hidden="true" />
      <section className="bridge__day" aria-label="Tagesverlauf 6 bis 22 Uhr">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M3 100 Q50 -40 97 100" /><path className="bridge__day-past" d="M3 100 Q50 -40 97 100" style={{strokeDasharray:`${(nowX-3)/94*120} 400`}} /></svg>
        <span className="bridge__day-edge bridge__day-edge--start">6 Uhr</span><span className="bridge__day-edge bridge__day-edge--end">22 Uhr</span>
        {marks.map((m,i)=>{const x=arcX(m.minute);return <button key={m.id} type="button" className="bridge__mark" data-problem={m.problem?'true':undefined} data-past={m.minute<now?'true':undefined} data-low={i%2===1?'true':undefined} style={{left:`${x}%`,top:`${arcY(x)}%`}} onClick={()=>openLegacyApp('calendar')} aria-label={`${m.time} ${m.label}`}>
          <span className="bridge__mark-label"><b>{m.time}</b> {m.label}</span>
        </button>;})}
        {now>=DAY_START && now<=DAY_END ? <span className="bridge__now" style={{left:`${nowX}%`,top:`${arcY(nowX)}%`}} aria-label={`Jetzt ${hhmm(now)}`}><span>jetzt</span></span> : null}
      </section>

      <div className="bridge__stations bridge__stations--left">{left.map(s=><StationCard key={s.id} station={s} onOpen={()=>openStation(s.id)} />)}</div>
      <div className="bridge__heart" data-mood={mood} data-attention={attention>0?'true':undefined}>
        <button type="button" className="bridge__mora" aria-pressed={moraOpen} aria-label="MÔRA" onClick={onMora} data-testid="dock-mora"><PixelMoraMark size={phone?36:48} active={mood!=="idle"} /></button>
        <p className="bridge__voice" aria-live="polite">{line}</p>
        <div id={DOCK_ASK_SLOT} className="bridge__ask"><button type="button" onClick={onMora} data-testid="dock-ask-open">Frag MÔRA …</button></div>
      </div>
      <div className="bridge__stations bridge__stations--right">{right.map(s=><StationCard key={s.id} station={s} onOpen={()=>openStation(s.id)} />)}</div>

      <div className="bridge__dock" role="toolbar" aria-label="Apps">
        {apps.map(app=>{const Icon=app.icon;const badge=typeof app.badge==='number'&&app.badge>0?app.badge:null;return <button type="button" key={app.id} className="bridge__app" data-feature={app.id} data-active={app.id===activeId?'true':undefined} onClick={app.action} aria-label={badge?`${app.name} (${badge})`:app.name} title={app.name}>
          <span className="bridge__app-icon"><Icon size={phone?18:22} strokeWidth={1.6} />{badge?<span className="bridge__badge" data-alert={app.alert?'true':undefined}>{badge>99?'99+':badge}</span>:null}</span>
          <span className="bridge__app-name">{app.name}</span>
        </button>;})}
      </div>
      {showLegacy ? <Link href="/home?classic=1" className="bridge__legacy" data-testid="legacy-shell-link">Klassische Oberfläche</Link> : null}
    </div></nav>;
}
