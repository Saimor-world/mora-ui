'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { buildSuggestions, type SuggestionBlueprint } from '@/lib/mora/suggestions';
import { useMoraAwareness, type MoraEvent } from '@/lib/mora/listener';
import { useSessionStore } from '@/store/session';
import { showToast } from '@/lib/toast';
import usePrefersReducedMotion from '@/lib/hooks/usePrefersReducedMotion';

interface SuggestionsPanelProps {
  testEvent?: MoraEvent;
}

export default function SuggestionsPanel({ testEvent }: SuggestionsPanelProps) {
  const router = useRouter();
  const prefersReducedMotion = usePrefersReducedMotion();
  const awareness = useMoraAwareness();
  const lastEvent = testEvent ?? awareness.lastEvent;
  const {
    dismissedSuggestionIds,
    setSuggestionDismissed,
    suggestionsCollapsed,
    setSuggestionsCollapsed,
    addFavorite,
  } = useSessionStore((state) => ({
    dismissedSuggestionIds: state.dismissedSuggestionIds,
    setSuggestionDismissed: state.setSuggestionDismissed,
    suggestionsCollapsed: state.suggestionsCollapsed,
    setSuggestionsCollapsed: state.setSuggestionsCollapsed,
    addFavorite: state.addFavorite,
  }));

  const [items, setItems] = useState<SuggestionBlueprint[]>([]);

  useEffect(() => {
    if (!lastEvent) return;
    const generated = buildSuggestions(lastEvent);
    if (generated.length === 0) return;
    setItems((prev) => {
      const merged = [...generated, ...prev];
      const unique = merged.filter(
        (suggestion, index, arr) =>
          arr.findIndex((candidate) => candidate.id === suggestion.id) === index
      );
      return unique.filter((suggestion) => !dismissedSuggestionIds.includes(suggestion.id)).slice(0, 3);
    });
  }, [lastEvent, dismissedSuggestionIds]);

  const visibleItems = useMemo(() => items.slice(0, 3), [items]);

  const handleDismiss = (id: string) => {
    setSuggestionDismissed(id);
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const performAction = async (suggestion: SuggestionBlueprint) => {
    switch (suggestion.action.type) {
      case 'navigate':
        router.push(suggestion.action.href);
        break;
      case 'filter': {
        const params = new URLSearchParams();
        if (suggestion.action.orb) params.set('orb', suggestion.action.orb);
        if (suggestion.action.tag) params.set('tag', suggestion.action.tag);
        const target = suggestion.action.href ?? '/folder';
        router.push(params.toString() ? `${target}?${params.toString()}` : target);
        break;
      }
      case 'favorite':
        addFavorite({
          id: suggestion.action.objectId,
          title: suggestion.action.title,
          path: suggestion.action.path,
          tags: suggestion.action.tags,
        });
        showToast({ message: 'Favorit gespeichert (local)', variant: 'info' });
        break;
      case 'copy':
        try {
          await navigator.clipboard.writeText(suggestion.action.text);
          showToast({ message: 'Pfad kopiert', variant: 'info' });
        } catch {
          showToast({ message: 'Kopieren fehlgeschlagen', variant: 'error' });
        }
        break;
      case 'info':
        showToast({ message: suggestion.action.message, variant: 'info' });
        break;
      default:
        break;
    }

    handleDismiss(suggestion.id);
  };

  if (visibleItems.length === 0 && !testEvent) {
    return null;
  }

  const motionClass = prefersReducedMotion ? 'duration-200' : 'duration-500';

  return (
    <aside
      className={`fixed bottom-6 right-4 z-40 w-72 text-sm`}
      aria-live="polite"
    >
      <div className="bg-card/90 border border-border rounded-3xl shadow-2xl overflow-hidden mora-depth-md">
        <button
          type="button"
          onClick={() => setSuggestionsCollapsed(!suggestionsCollapsed)}
          className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
          aria-expanded={!suggestionsCollapsed}
        >
          <span>Vorschläge</span>
          <span>{suggestionsCollapsed ? '＋' : '－'}</span>
        </button>
        {!suggestionsCollapsed && (
          <div className={`space-y-3 px-4 pb-4 transition-all ${motionClass}`}>
            {visibleItems.length === 0 ? (
              <p className="text-muted-foreground text-xs">Keine Vorschläge – starte eine Aktion.</p>
            ) : (
              visibleItems.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="border border-border/60 rounded-2xl p-3 bg-background/70 backdrop-blur-sm shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 font-medium">
                      <span>{suggestion.icon}</span>
                      <span>{suggestion.title}</span>
                    </div>
                    <button
                      type="button"
                      aria-label="Vorschlag ausblenden"
                      onClick={() => handleDismiss(suggestion.id)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      ×
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{suggestion.description}</p>
                  <button
                    type="button"
                    onClick={() => performAction(suggestion)}
                    className="w-full px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold mora-transition"
                  >
                    {suggestion.cta}
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
