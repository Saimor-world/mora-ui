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
import { Bell, CalendarDays, Grid2X2, MessageCircle, Search, Sparkles } from 'lucide-react';
import { DAY_END, DAY_START, dayMarks, hhmm, mailCounts, moraLine, shiftCoverage, stageCard, stations, type Station } from '@/lib/mora/bridgeData';
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
const dayFrac=(minute:number)=>(Math.min(DAY_END,Math.max(DAY_START,minute))-DAY_START)/(DAY_END-DAY_START);
/** Punkt auf der vorderen Hälfte des Tagesrings (links 6 Uhr → vorne → rechts 22 Uhr), in % der Ringbox. */
const ringPoint=(minute:number)=>{const a=Math.PI*(1-dayFrac(minute));return {x:50+50*Math.cos(a),y:50+50*Math.sin(a)};};

/** Ein Instrument: dieselbe Komponente an beiden Wänden. */
const Gauge=({station:g}:{station:Station})=>{const r=13,c=2*Math.PI*r;const frac=g.id==='today'?g.progress??0:1;
  return <span className="bridge__gauge" aria-hidden="true"><svg viewBox="0 0 32 32"><circle cx="16" cy="16" r={r} className="bridge__gauge-track" />{g.id==='nightwatch'?<polyline className="bridge__pulse" points="6,16 11,16 13,11 16,22 19,13 21,16 26,16" />:<circle cx="16" cy="16" r={r} className="bridge__gauge-fill" strokeDasharray={`${frac*c} ${c}`} transform="rotate(-90 16 16)" />}</svg></span>;};
type Instrument={id:string; label:string; value:string; detail:string; tone:Station['tone']; station?:Station; icon?:React.ReactNode; action:()=>void};
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
  const shifts=useMemo(()=>shiftCoverage(snapshot),[snapshot]);
  const [dismissed,setDismissed]=useState<string|null>(null);
  useEffect(()=>{try{setDismissed(sessionStorage.getItem(DISMISS_KEY));}catch{/* privat */}},[]);
  const [asking,setAsking]=useState(false);
  // Aktiv: MÔRA hat etwas Dringendes (bis „Später“) oder du sprichst mit ihr.
  const active=!!card && (moraOpen || asking || (card.urgent && dismissed!==card.id));
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
    return <button type="button" key={control.id} className="bridge__app" data-feature={control.id} data-tip={tip} data-active={control.id===activeId?'true':undefined} onClick={control.action} aria-label={tip} aria-current={control.id===activeId?'page':undefined}><span className="bridge__app-icon"><Icon size={20} strokeWidth={1.5} /></span>{typeof count==='number' && count>0 ? <b className="bridge__badge" data-alert={control.id==='notifications' && incidents>0 ? 'true' : undefined}>{count>99?'99+':count}</b> : null}</button>;
  };
  const [post,today,team,night]=gauges;
  const needs=post && mail.unread!==null ? {id:'needs',label:'Braucht dich',value:mail.needsYou?`${mail.needsYou} ${mail.needsYou===1?'braucht':'brauchen'} dich`:'Niemand wartet',detail:mail.needsYou?'Antwort nötig':'Alles beantwortet',tone:(mail.needsYou?'amber':'calm') as Station['tone'],icon:<MessageCircle size={16} strokeWidth={1.75} />,action:()=>onNavigate('post')} : null;
  const left:Instrument[]=[
    ...(post?[{id:'post',label:'Post',value:post.value==='Offline'?'Offline':`${post.value} ungelesen`,detail:post.value==='Offline'?post.detail:'Posteingang',tone:'calm' as const,icon:<span className="bridge__num">{post.value==='Offline'?'–':post.value}</span>,action:()=>onNavigate('post')}]:[]),
    ...(needs?[needs]:[]),
  ];
  const right:Instrument[]=[today,team,night].filter((g):g is Station=>!!g).map(g=>({id:g.id,label:g.label,value:g.id==='today'&&g.value!=='Offline'?`${g.value} offen`:g.value,detail:g.detail,tone:g.tone,station:g,action:g.id==='today'?()=>onNavigate('today'):g.id==='team'?()=>openLegacyApp('calendar'):openNightwatch}));
  const instrument=(i:Instrument)=><button key={i.id} type="button" className="bridge__inst" data-station={i.id} data-tone={i.tone} onClick={i.action} title={`${i.label}: ${i.value} · ${i.detail}`}>
    <span className="bridge__inst-dial">{i.station?<Gauge station={i.station} />:i.icon}</span>
    <span className="bridge__inst-text"><small>{i.label}</small><strong>{i.value}</strong></span>
    <span className="bridge__inst-detail">{i.detail}</span></button>;
  // Tagesring: höchstens 4 echte Termine, Probleme zuerst, nicht direkt vor MÔRA.
  const ring=marks.map(m=>({...m,...ringPoint(m.minute)})).filter(m=>Math.abs(m.x-50)>=14)
    .sort((a,b)=>Number(b.problem)-Number(a.problem))
    .reduce<(typeof marks[number]&{x:number;y:number})[]>((kept,m)=>kept.length<4 && kept.every(k=>Math.hypot(k.x-m.x,(k.y-m.y)*.3)>=18) ? [...kept,m] : kept,[])
    .sort((a,b)=>a.x-b.x);
  const nowPt=now>=DAY_START && now<=DAY_END ? ringPoint(now) : null;
  return <nav className="os-dock bridge" data-variant="c" aria-label="Hauptnavigation" data-testid="os-dock">
    <div className="bridge__body bridge__room" data-testid="dock" data-active={active?'true':undefined}>
      <section className="bridge__wall bridge__wall--left" aria-label="Kommunikation"><h2 className="bridge__zone">Kommunikation</h2>{left.map(instrument)}</section>
      <section className="bridge__wall bridge__wall--right" aria-label="Betrieb"><h2 className="bridge__zone">Betrieb</h2>{right.map(instrument)}</section>
      <div className="bridge__stage" data-mood={mood} data-attention={attention>0?'true':undefined}>
        <span className="bridge__grid" aria-hidden="true" />
        <span className="bridge__aura" aria-hidden="true"><i /><i /><i /><i /></span>
        <section className="bridge__ring" aria-label="Tagesring 6 bis 22 Uhr" aria-hidden={active?'true':undefined}>
          {ring.map(m=><button key={m.id} type="button" tabIndex={active?-1:0} className="bridge__mark" data-problem={m.problem?'true':undefined} data-past={m.minute<now?'true':undefined} data-side={m.x<50?'start':'end'} style={{left:`${m.x}%`,top:`${m.y}%`}} onClick={()=>openLegacyApp('calendar')} aria-label={`${m.time} ${m.label}`}><span className="bridge__mark-label"><b>{m.time}</b><span>{m.label}</span></span></button>)}
          {nowPt ? <span className="bridge__now" style={{left:`${nowPt.x}%`,top:`${nowPt.y}%`}} title={`Jetzt ${hhmm(now)}`} /> : null}
        </section>
        {active && card ? <article className="bridge__holo bridge__holo--card" data-kind={card.kind} data-urgent={card.urgent?'true':undefined} aria-live="polite">
          <small>{card.eyebrow}</small><strong>{card.title}</strong><p>{card.detail}</p>
          <div className="bridge__holo-actions"><button type="button" data-primary="true" onClick={()=>openTarget(card.primary.target)}>{card.primary.label}</button>{card.urgent?<button type="button" onClick={later}>Später</button>:null}</div>
        </article> : null}
        {active && card?.kind==='shift' && shifts.length ? <button type="button" className="bridge__holo bridge__holo--viz" onClick={()=>openLegacyApp('calendar')} aria-label="Besetzung heute im Kalender öffnen">
          <small>Besetzung heute</small>
          <span className="bridge__shifts">{shifts.map(s=><span key={s.id} className="bridge__shift" data-absent={s.absent?'true':undefined}><em>{s.name}</em><span><i style={{left:`${dayFrac(s.start)*100}%`,width:`${(dayFrac(s.end)-dayFrac(s.start))*100}%`}} /></span></span>)}</span>
          <span className="bridge__shift-axis" aria-hidden="true"><span>6</span><span>14</span><span>22</span></span>
        </button> : null}
        <button ref={moraRef} type="button" className="bridge__mora" data-flying={flight?'true':undefined} style={flight?{transform:`translate(${flight.x}px, ${flight.y}px) scale(.7)`}:undefined} aria-pressed={moraOpen} aria-label="MÔRA" aria-description={line} title={line} onClick={onMora} data-testid="dock-mora"><span data-testid="mora-mark"><PixelMora size={phone?72:96} mood={mood} /></span></button>
        <div id={DOCK_ASK_SLOT} className="bridge__ask" onFocus={()=>setAsking(true)} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node|null))setAsking(false);}}><button type="button" onClick={onMora} data-testid="dock-ask-open"><Search size={15} strokeWidth={1.75} aria-hidden="true" /><span>{active||!card?'Frag MÔRA …':line}</span><kbd>M</kbd></button></div>
      </div>
      <div className="bridge__pill" role="toolbar" aria-label="Apps">{controls.map(renderControl)}</div>
      {showLegacy ? <Link href="/home?classic=1" className="bridge__legacy" data-testid="legacy-shell-link">Klassische Oberfläche</Link> : null}
    </div></nav>;
}
