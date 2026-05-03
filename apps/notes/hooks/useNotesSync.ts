import { useState, useRef, useCallback, useEffect } from 'react';
import { fetchPersonalHomeNote, savePersonalHomeNote } from '@/lib/api/coreClient';

type LoadState = 'loading' | 'ready' | 'no-server';
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const AUTOSAVE_DELAY_MS = 1500;

export function useNotesSync() {
  const [content, setContent] = useState('');
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const lastSavedRef = useRef('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPersonalHomeNote().then((note) => {
      if (cancelled) return;
      if (note === null || note === undefined) {
        setLoadState('no-server');
      } else {
        const text = typeof note === 'string' ? note : (note as any).content ?? '';
        setContent(text);
        lastSavedRef.current = text;
        setLoadState('ready');
      }
    });
    return () => { cancelled = true; };
  }, []);

  const persist = useCallback(async (text: string) => {
    if (text === lastSavedRef.current) return;
    setSaveState('saving');
    const result = await savePersonalHomeNote(text);
    if (result) {
      lastSavedRef.current = text;
      setSaveState('saved');
      setTimeout(() => setSaveState(s => s === 'saved' ? 'idle' : s), 2000);
    } else {
      setSaveState('error');
    }
  }, []);

  // Debounced auto-save on content change
  const handleChange = useCallback((text: string) => {
    setContent(text);
    if (loadState !== 'ready') return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { void persist(text); }, AUTOSAVE_DELAY_MS);
  }, [loadState, persist]);

  // Immediate save on blur (catches any pending debounce)
  const handleBlur = useCallback(() => {
    if (loadState !== 'ready') return;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    void persist(content);
  }, [content, loadState, persist]);

  // Clean up debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return { content, setContent: handleChange, loadState, saveState, handleBlur };
}
