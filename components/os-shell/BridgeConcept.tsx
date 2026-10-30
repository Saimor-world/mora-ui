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
import { getFeature } from '@/features/registry';
import { AlarmClock, Bell, CalendarClock, CalendarDays, ChevronRight, Grid2X2, Keyboard, RefreshCw, Search, Sparkles, SunMoon, Timer } from 'lucide-react';
import { SCENES, sceneFor, type SceneId } from '@/lib/os-prototype/scene';
import { DAY_END, DAY_START, dayMarks, hhmm, instrumentLines, mailCounts, moraLine, stageCard, stations, untilText, type InstrumentLine, type Station } from '@/lib/mora/bridgeData';
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

/** Ring eines Instruments: Anteil aus echten Zahlen (gelesen, erledigt, Tag vergangen), Nachtwache als Puls. */
const Ring=({frac,pulse}:{frac:number;pulse?:boolean})=>{const r=13,c=2*Math.PI*r;
  return <span className="bridge__ring" aria-hidden="true"><svg viewBox="0 0 32 32"><circle cx="16" cy="16" r={r} className="bridge__ring-track" />{pulse?<polyline className="bridge__pulse" points="6,16 11,16 13,11 16,22 19,13 21,16 26,16" />:<circle cx="16" cy="16" r={r} className="bridge__ring-fill" strokeDasharray={`${Math.max(0,Math.min(1,frac))*c} ${c}`} transform="rotate(-90 16 16)" />}</svg></span>;};
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
type Widget={id:string;label:string;value:string;tone:'calm'|'amber'|'red';icon:typeof CalendarClock;sub?:string;target:'calendar'|'today'|'control'};
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
    {id:'phase',label:'Zeit-Theme',value:scene?scene.label:'…',sub:scene?scene.range:undefined,tone:'calm',icon:SunMoon,target:'control'},
  ];
}
const clean=(t?:string|null)=>(t??'').replace(/\[(fiktiv)\]|\((fiktiv)\)/gi,'').trim();
/** Zweite Zeile je Kachel: nur echte Snapshot-Inhalte, sonst leer. */
export function tileSub(id:string, snapshot:TodaySnapshot|null):string{
  if(!snapshot)return '';
  const tasks=available(snapshot.tasks)?snapshot.tasks:null; const cal=available(snapshot.calendar)?snapshot.calendar:null;
  switch(id){
    case 'post':{if(!available(snapshot.mail))return '';const m=snapshot.mail.items.find(i=>!i.read)??snapshot.mail.items[0];return clean(m?.subject);}
    case 'today':{if(!tasks)return '';const t=tasks.due_today[0]??tasks.items.find(i=>i.status!=='done');return t?clean(t.title):'';}
    case 'overdue':return tasks?.overdue[0]?clean(tasks.overdue[0].title):'';
    case 'next':return cal?.next_event?.location?clean(cal.next_event.location):'';
    case 'events':{if(!cal)return '';const n=cal.next_event?.id;const after=cal.events.filter(e=>e.date===snapshot.date&&e.id!==n&&(!cal.next_event?.time||(e.time??'')>cal.next_event.time));return after[0]?`Danach ${after[0].time?after[0].time+' ':''}${clean(after[0].title)}`:'';}
    case 'nightwatch':{if(!available(snapshot.nightwatch))return '';const at=snapshot.nightwatch.last_synced_at??snapshot.nightwatch.as_of;const d=at?new Date(at):null;return d&&!isNaN(d.getTime())?`Letzter Check ${d.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit',timeZone:snapshot.timezone||undefined})}`:'';}
    default:return '';
  }
}
/** Ein Instrument im Dock: Kopf (Wert), bis zu drei echte Einträge, zwei echte Aktionen. */
type Instrument={id:'post'|'today'|'team'|'next';col:'outer'|'inner';label:string;value:string;detail:string;tone:Station['tone'];frac:number;lines:InstrumentLine[];empty:string;offline:boolean;open:()=>void;openLabel:string;ask:string};
type Props={items:FeatureManifest[]; activeId:string; onNavigate:(id:string)=>void; onMora:()=>void; onAsk?:(text:string)=>void; onMore:()=>void; onNotifications:()=>void; onSearch:()=>void; onControl?:()=>void; mood:SpiritMood; moraOpen:boolean; attention:number; phone:boolean; showLegacy:boolean };
const DISMISS_KEY='mora.bridge.dismissed';
const PHONE_APPS=4;
export function BridgeConcept({items,activeId,onNavigate,onMora,onAsk,onMore,onNotifications,onSearch,onControl,mood,moraOpen,attention,phone,showLegacy}:Props) {
  const { snapshot, refresh, refreshing }=useScopedToday({backgroundRefresh:true});
  const { data: briefing } = useDailyBriefing();
  const briefingUnread = briefing?.metrics?.unread_mails ?? null;
  const mail = mailCounts(snapshot, briefingUnread);
  const nightwatchReady = available(snapshot?.nightwatch);
  const incidents = nightwatchReady ? snapshot?.nightwatch.open_incidents ?? 0 : 0;
  const [now,setNow]=useState(berlinNow);
  useEffect(()=>{const timer=setInterval(()=>setNow(berlinNow()),30000);return()=>clearInterval(timer);},[]);
  const marks=useMemo(()=>dayMarks(snapshot, now, 8),[snapshot, now]);
  const line=useMemo(()=>moraLine(snapshot, now, briefingUnread),[snapshot, now, briefingUnread]);
  const gauges=useMemo(()=>stations(snapshot, briefingUnread),[snapshot, briefingUnread]);
  const card=useMemo(()=>stageCard(snapshot, now, briefingUnread),[snapshot, now, briefingUnread]);
  const [dismissed,setDismissed]=useState<string|null>(null);
  useEffect(()=>{try{setDismissed(sessionStorage.getItem(DISMISS_KEY));}catch{/* privat */}},[]);
  const [asking,setAsking]=useState(false);
  const shownCard=card && !(card.urgent && dismissed===card.id) ? card : null;
  // Aktiv: etwas Dringendes (bis „Später“) oder Frag MÔRA ist offen/fokussiert.
  const active=moraOpen || asking || !!shownCard?.urgent;
  const phaseOverride=useOsShellStore(s=>s.phaseOverride);
  const focusUntil=useOsShellStore(s=>s.focusUntil);
  const [phase,setPhase]=useState<SceneId|null>(null);
  useEffect(()=>{const p=phaseOverride??sceneFor(new Date()).id;setPhase(p);document.documentElement.dataset.phase=p;},[phaseOverride,now]);
  const scene=phase?SCENES.find(x=>x.id===phase)??null:null;
  const waterRef=useRef<HTMLDivElement>(null);
  const orbs=useOrbReflections(waterRef);
  const target=useMoraPresence(s=>s.target);
  const moraRef=useRef<HTMLButtonElement>(null);
  const [flight,setFlight]=useState<{x:number;y:number}|null>(null);
  useLayoutEffect(()=>{
    if(target.kind==='dock'){setFlight(null);return;}
    let flying=false, moved=0;
    const measure=()=>{const el=moraRef.current;if(!el)return;const prev=el.style.transform;el.style.transform='none';const home=el.getBoundingClientRect();el.style.transform=prev;const next=flightOffset(home,document.querySelector(target.selector)?.getBoundingClientRect()??null);flying=!!next;moved=Date.now();setFlight(next);};
    // Das Ziel kann sich nach dem Abflug noch setzen (Layout, Schrift). Nachmessen ohne den Flug zu stören:
    // Translate verschiebt die Mitte genau um den Versatz, also Heimat = aktuelle Mitte − Versatz. Korrigiert wird nur bei echter Abweichung.
    const settle=window.setInterval(()=>{const el=moraRef.current;const goal=document.querySelector(target.selector)?.getBoundingClientRect();if(!el||!goal||goal.width===0)return;
      // Noch nicht abgeflogen (Ziel war beim ersten Messen noch nicht da): jetzt starten.
      if(!flying){measure();return;}
      if(Date.now()-moved<1100)return; // noch im Flug (0,9 s)
      setFlight(f=>{if(!f)return f;const r=el.getBoundingClientRect();const hx=r.left+r.width/2-f.x,hy=r.top+r.height/2-f.y;
        const nx=Math.round(goal.left+goal.width/2-hx),ny=Math.round(goal.top+goal.height/2-hy);if(Math.abs(nx-f.x)<3&&Math.abs(ny-f.y)<3)return f;moved=Date.now();return {x:nx,y:ny};});},400);
    const raf=requestAnimationFrame(measure);window.addEventListener('resize',measure);
    return()=>{cancelAnimationFrame(raf);window.clearInterval(settle);window.removeEventListener('resize',measure);};
  },[target]);
  // Im Gespräch fliegt MÔRA in die Mitte über dem See und wird größer, sonst (Flug zu einem Planeten) kleiner.
  const flightScale=target.kind==='anchor'&&target.reason==='stage'?(phone?1.1:1.3):.7;
  const openNightwatch=()=>useOsShellStore.getState().setNightwatchOpen(true);
  const openTarget=(t:'calendar'|'post'|'nightwatch')=>t==='calendar'?openLegacyApp('calendar'):t==='post'?onNavigate('post'):openNightwatch();
  const later=()=>{if(!card)return;setDismissed(card.id);setAsking(false);try{sessionStorage.setItem(DISMISS_KEY,card.id);}catch{/* privat */}};
  const ask=(text:string)=>onAsk?onAsk(text):onMora();
  const controls = [
    {id:'search',name:'Suche',icon:Search,action:onSearch},
    ...items.map(item=>({id:item.id,name:item.title,icon:item.icon,action:()=>onNavigate(item.id)})).slice(0,phone?PHONE_APPS:undefined),
    ...(phone?[]:[{id:'calendar',name:'Kalender',icon:CalendarDays,action:()=>openLegacyApp('calendar')}]),
    {id:'notifications',name:'Mitteilungen',icon:Bell,action:incidents>0 && attention===0 ? openNightwatch : onNotifications},
    ...(onControl && !phone ? [{id:'control',name:'Kontrollzentrum',icon:Sparkles,action:onControl}] : []),
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

  const [post,today,team]=gauges;
  const tasks=snapshot&&available(snapshot.tasks)?snapshot.tasks:null;
  const cal=snapshot&&available(snapshot.calendar)?snapshot.calendar:null;
  const nextMark=marks.find(m=>m.minute>=now)??null;
  const until=untilText(snapshot,now);
  const readFrac=mail.unread!==null&&snapshot?.mail.items.length?1-Math.min(1,mail.unread/Math.max(snapshot.mail.items.length,mail.unread)):mail.unread===0?1:0;
  const instruments:Instrument[]=[
    {id:'post',col:'outer',label:'Post',value:post.value,detail:post.detail,tone:post.tone,frac:readFrac,lines:instrumentLines(snapshot,'post',now),empty:'Keine Mails im Eingang.',offline:mail.unread===null,open:()=>onNavigate('post'),openLabel:'Postfach',ask:'Was ist in meinem Postfach wichtig?'},
    {id:'today',col:'inner',label:'Heute',value:today.value,detail:today.detail,tone:today.tone,frac:today.progress??0,lines:instrumentLines(snapshot,'today',now),empty:'Keine offenen Aufgaben.',offline:!tasks,open:()=>onNavigate('today'),openLabel:'Aufgaben',ask:'Was ist heute wichtig?'},
    {id:'team',col:'inner',label:'Team',value:team.value,detail:team.detail,tone:team.tone,frac:team.tone==='calm'?1:.5,lines:instrumentLines(snapshot,'team',now),empty:'Heute keine Schichten im Plan.',offline:!cal,open:()=>openLegacyApp('calendar'),openLabel:'Schichtplan',ask:'Wer arbeitet heute?'},
    {id:'next',col:'outer',label:'Als Nächstes',value:!cal?'Offline':nextMark?nextMark.time:'Frei',detail:!cal?'Kalender nicht verbunden':nextMark?`${nextMark.label}${until?` · ${until}`:''}`:'Heute kein Termin mehr',tone:nextMark?.problem?'amber':'calm',frac:(now-DAY_START)/(DAY_END-DAY_START),lines:instrumentLines(snapshot,'next',now).slice(1),empty:nextMark?'Danach ist der Tag frei.':'Der Rest des Tages ist frei.',offline:!cal,open:()=>openLegacyApp('calendar'),openLabel:'Kalender',ask:'Was steht heute an?'},
  ];
  const instrument=(g:Instrument)=><article key={g.id} className="bridge__inst" data-station={g.id} data-col={g.col} data-tone={g.tone} data-offline={g.offline?'true':undefined}>
    <button type="button" className="bridge__comp" data-station={g.id} onClick={g.offline?()=>onNavigate('settings'):g.open} aria-label={`${g.label}: ${g.value} · ${g.detail}`} title={`${g.label}: ${g.value} · ${g.detail}`}>
      <Ring frac={g.frac} />
      <span className="bridge__comp-text"><small>{g.label}</small><strong>{g.value}</strong><em>{g.detail}</em></span>
      <ChevronRight className="bridge__chev" size={16} strokeWidth={1.75} aria-hidden="true" />
    </button>
    {g.offline ? <p className="bridge__inst-empty">Diese Quelle ist noch nicht angedockt. In den Einstellungen verbindest du sie.</p>
      : g.lines.length ? <ul className="bridge__inst-list">{g.lines.map(l=><li key={l.id} data-tone={l.tone}><b>{l.lead}</b><span>{l.text}</span></li>)}</ul>
        : <p className="bridge__inst-empty">{g.empty}</p>}
    <div className="bridge__inst-actions">
      {g.offline ? <button type="button" onClick={()=>onNavigate('settings')}>Quelle verbinden</button> : <button type="button" onClick={g.open}>{g.openLabel}</button>}
      <button type="button" data-ask="true" onClick={()=>ask(g.ask)}>MÔRA fragen</button>
    </div>
  </article>;
  const suggestions=(getFeature(activeId)?.mora.suggestions ?? getFeature('home')?.mora.suggestions ?? []).slice(0,3);
  const asOf=snapshot?.generated_at?new Date(snapshot.generated_at):null;
  const stand=asOf&&!isNaN(asOf.getTime())?asOf.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit',timeZone:snapshot?.timezone||'Europe/Berlin'}):null;
  const dateText=new Intl.DateTimeFormat('de-DE',{weekday:'short',day:'numeric',month:'short',timeZone:'Europe/Berlin'}).format(new Date());
  const focusLeft=focusUntil?Math.max(0,Math.ceil((focusUntil-Date.now())/60000)):0;
  const toggleFocus=()=>{const st=useOsShellStore.getState();st.setFocusUntil(st.focusUntil?null:Date.now()+25*60_000);};
  const nightwatch=gauges[3];
  // Tagesbogen: höchstens 4 Beschriftungen, keine im MÔRA-Bereich und keine direkt an „Jetzt“.
  const nowX=dayX(now);
  const arc=marks.map(m=>({...m,x:dayX(m.minute)})).filter(m=>Math.abs(m.x-50)>=11 && Math.abs(m.x-nowX)>=6)
    .reduce<(typeof marks[number]&{x:number})[]>((kept,m)=>kept.length<4 && kept.every(k=>Math.abs(k.x-m.x)>=16) ? [...kept,m] : kept,[])
    .sort((a,b)=>a.x-b.x);
  return <nav className="os-dock bridge" data-variant="c" aria-label="Hauptnavigation" data-testid="os-dock">
    <div className="bridge__body" data-testid="dock" data-active={active?'true':undefined} data-stage={moraOpen?'true':undefined}>
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
      <span className="bridge__plate" aria-hidden="true" />
      <section className="bridge__day" aria-label="Tagesverlauf 6 bis 22 Uhr">
        {arc.map(m=><button key={m.id} type="button" className="bridge__mark" data-problem={m.problem?'true':undefined} data-past={m.minute<now?'true':undefined} data-edge={m.x<16?'start':m.x>84?'end':undefined} style={{left:`${m.x}%`,top:`${hullY(m.x*14.4)/3}%`}} onClick={()=>openLegacyApp('calendar')} aria-label={`${m.time} ${m.label}`}><span className="bridge__mark-label"><b>{m.time}</b> {m.label}</span></button>)}
        {now>=DAY_START && now<=DAY_END ? <span className="bridge__now" style={{left:`${nowX}%`,top:`${hullY(nowX*14.4)/3}%`}} aria-label={`Jetzt ${hhmm(now)}`} title={`Jetzt ${hhmm(now)}`}><i>{hhmm(now)}</i></span> : null}
      </section>
      <section className="bridge__deck" aria-label="Lage">
        {instrument(instruments[0])}{instrument(instruments[1])}
        <div className="bridge__heart" data-mood={mood} data-attention={attention>0?'true':undefined}>
          <span className="bridge__beam" aria-hidden="true" />
          <span className="bridge__aura" aria-hidden="true"><i /><i /><i /><i /></span>
          <button ref={moraRef} type="button" className="bridge__mora" data-flying={flight?'true':undefined} style={flight?{transform:`translate(${flight.x}px, ${flight.y}px) scale(${flightScale})`}:undefined} aria-pressed={moraOpen} aria-label="MÔRA" onClick={onMora} data-testid="dock-mora"><span data-testid="mora-mark"><PixelMora size={phone?76:104} mood={mood} /></span></button>
          <div className="bridge__field" data-field="mora" data-kind={shownCard?.kind} data-urgent={shownCard?.urgent?'true':undefined}>
            <small className="bridge__field-eyebrow">{shownCard?.eyebrow ?? `MÔRA${scene?` · ${scene.label}`:''}`}</small>
            <p className="bridge__voice" aria-live="polite">{shownCard ? shownCard.title : line}</p>
            {shownCard ? <div className="bridge__field-card"><span>{shownCard.detail}</span><button type="button" data-primary="true" onClick={()=>openTarget(shownCard.primary.target)}>{shownCard.primary.label}</button>{shownCard.urgent?<button type="button" onClick={later}>Später</button>:null}</div> : null}
            <div id={DOCK_ASK_SLOT} className="bridge__ask" onFocus={()=>setAsking(true)} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node|null))setAsking(false);}}><button type="button" onClick={onMora} data-testid="dock-ask-open"><Search size={15} strokeWidth={1.75} aria-hidden="true" /><span>Frag MÔRA …</span><kbd>M</kbd></button></div>
            {suggestions.length ? <div className="bridge__chips" aria-label="Vorschläge">{suggestions.map(s=><button key={s} type="button" onClick={()=>ask(s)}>{s}</button>)}</div> : null}
          </div>
        </div>
        {instrument(instruments[2])}{instrument(instruments[3])}
      </section>
      <div className="bridge__status" data-side="left">
        <span className="bridge__clock"><b>{hhmm(now)}</b><small>{dateText}</small><small>{stand?`Stand ${stand}`:'Noch kein Stand'}</small></span>
        <button type="button" className="bridge__chip" data-quiet="true" onClick={()=>{void refresh();}} disabled={refreshing} aria-label="Lage neu laden" title={stand?`Stand ${stand} · neu laden`:'Lage laden'}><RefreshCw size={14} strokeWidth={1.75} aria-hidden="true" data-spin={refreshing?'true':undefined} /></button>
        {scene ? <button type="button" className="bridge__chip" onClick={onControl??onMore} title={`Zeit-Theme ${scene.label} · ${scene.range} – Farbwelt und Themes im Kontrollzentrum`}><SunMoon size={14} strokeWidth={1.75} aria-hidden="true" /><span>{scene.label}</span></button> : null}
      </div>
      <div className="bridge__pill" role="toolbar" aria-label="Apps">{controls.map(renderControl)}</div>
      <div className="bridge__status" data-side="right">
        {nightwatchReady ? <button type="button" className="bridge__chip" data-tone={nightwatch.tone} onClick={openNightwatch} title={`Nachtwache: ${nightwatch.value}${tileSub('nightwatch',snapshot)?` · ${tileSub('nightwatch',snapshot)}`:''}`} aria-label={`Nachtwache: ${nightwatch.value}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/nightwatch/eule.png" alt="" width={13} height={16} /><span>{nightwatch.value}</span></button> : null}
        <button type="button" className="bridge__chip" data-on={focusUntil?'true':undefined} onClick={toggleFocus} aria-pressed={!!focusUntil} title="Fokus: 25 Minuten ohne Unterbrechung (⌘⇧F)"><Timer size={14} strokeWidth={1.75} aria-hidden="true" /><span>{focusUntil?`Fokus · noch ${focusLeft} min`:'Fokus 25 min'}</span></button>
        <button type="button" className="bridge__chip" data-quiet="true" onClick={()=>useOsShellStore.getState().setShortcutsOpen(true)} aria-label="Tastenkürzel" title="Tastenkürzel (?)"><Keyboard size={14} strokeWidth={1.75} aria-hidden="true" /></button>
        {showLegacy ? <Link href="/home?classic=1" className="bridge__legacy" data-testid="legacy-shell-link">Klassisch</Link> : null}
      </div>
    </div></nav>;
}
