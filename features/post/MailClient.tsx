'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ExternalLink, Inbox, Sparkles } from 'lucide-react';
import { Button, Text } from '@/components/os-kit';
import { openLegacyApp } from '@/lib/os-prototype/legacyApps';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';
import type { PostMessage } from './data/usePost';
import { mailTime, senderAddress, senderName, unreadCount, visibleMail, type MailFilter, plainText } from './mailView';

function askMora(m: PostMessage) {
  const st = useOsShellStore.getState();
  st.setMoraDraft(`Fasse diese Mail zusammen und schlage eine Antwort vor: „${m.subject || ''}“ von ${senderName(m)}`);
  st.setMoraOpen(true);
}

/** Inbox list + reading pane. Only fields CORE delivers (/v3/mail/messages); nothing invented. */
export function MailClient({ items }: { items: PostMessage[] }) {
  const [filter, setFilter] = useState<MailFilter>('all');
  const [openId, setOpenId] = useState<string | null>(() => {
    const id = useOsShellStore.getState().postOpenId;
    if (id) useOsShellStore.getState().setPostOpenId(null);
    return id;
  });
  const list = useMemo(() => visibleMail(items, filter), [items, filter]);
  const unread = unreadCount(items);
  const open = items.find((m) => m.id === openId) ?? null;
  // Desktop: die erste ungelesene (sonst neueste) Mail gleich lesen statt leerer Fläche. Phone bleibt bei der Liste.
  useEffect(() => {
    if (openId || !list.length || typeof window === 'undefined' || !window.matchMedia?.('(min-width: 900px)').matches) return;
    setOpenId((list.find((m) => !m.read) ?? list[0]).id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.length]);

  return (
    <div className={`os-mail${open ? ' os-mail--reading' : ''}`} data-testid="post-mail">
      <div className="os-mail__list">
        <div className="os-mail__filters" role="tablist" aria-label="Filter">
          <button type="button" role="tab" aria-selected={filter === 'all'} onClick={() => setFilter('all')}>Alle <span>{items.length}</span></button>
          <button type="button" role="tab" aria-selected={filter === 'unread'} onClick={() => setFilter('unread')}>Ungelesen <span>{unread}</span></button>
        </div>
        {list.length === 0 ? <Text variant="meta" className="p-3">Keine ungelesenen Nachrichten.</Text> : null}
        <ul className="os-mail__rows">
          {list.slice(0, 30).map((m) => {
            const isUnread = m.read === false;
            return (
              <li key={m.id}>
                <button type="button" className={`os-mail__row${isUnread ? ' is-unread' : ''}${m.id === openId ? ' is-open' : ''}`} onClick={() => setOpenId(m.id)} data-testid="post-mail-row" aria-label={`${isUnread ? 'Ungelesen: ' : ''}${m.subject || '(ohne Betreff)'} von ${senderName(m)}`}>
                  <span className="os-mail__dot" aria-hidden />
                  <span className="os-mail__avatar" aria-hidden>{senderName(m).charAt(0).toUpperCase()}</span>
                  <span className="os-mail__main">
                    <span className="os-mail__top"><b className="os-mail__from">{senderName(m)}</b><time>{mailTime(m.date)}</time></span>
                    <span className="os-mail__subject">{plainText(m.subject) || '(ohne Betreff)'}</span>
                    {m.snippet ? <span className="os-mail__snippet">{plainText(m.snippet)}</span> : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <article className="os-mail__pane" aria-live="polite" data-testid="post-mail-pane">
        {open ? (
          <>
            <button type="button" className="os-mail__back" onClick={() => setOpenId(null)}><ArrowLeft size={14} aria-hidden /> Posteingang</button>
            <h3 className="os-mail__pane-subject">{plainText(open.subject) || '(ohne Betreff)'}</h3>
            <div className="os-mail__pane-meta">
              <span className="os-mail__avatar" aria-hidden>{senderName(open).charAt(0).toUpperCase()}</span>
              <span><b>{senderName(open)}</b><br /><small>{senderAddress(open)}{open.date ? ` · ${new Date(open.date).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}` : ''}</small></span>
            </div>
            <p className="os-mail__pane-body">{plainText(open.body_text) || plainText(open.snippet) || 'Hier steht nur die Vorschau. Die ganze Nachricht liegt im Postfach.'}</p>
            <div className="os-mail__actions">
              <Button size="sm" onClick={() => askMora(open)}><Sparkles size={14} aria-hidden /> Antwort mit MÔRA</Button>
              <Button size="sm" variant="ghost" onClick={() => openLegacyApp('mail')}><ExternalLink size={14} aria-hidden /> Im Postfach öffnen</Button>
            </div>
            <Text variant="meta" className="mt-3">MÔRA entwirft, gesendet wird nur von dir.</Text>
          </>
        ) : (
          <div className="os-mail__pane-empty"><Inbox size={22} aria-hidden className="os-mail__pane-empty-icon" /><Text tone="default">{list.length ? 'Nichts geöffnet.' : 'Hier ist gerade nichts.'}</Text><Text variant="meta">{unread ? `${unread} ungelesen` : 'Alles gelesen.'}</Text></div>
        )}
      </article>
    </div>
  );
}
