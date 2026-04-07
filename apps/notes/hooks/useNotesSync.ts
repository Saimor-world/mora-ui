import { useState, useRef, useCallback, useEffect } from 'react';
import { fetchPersonalHomeNote, savePersonalHomeNote } from '@/lib/api/coreClient';

type LoadState = 'loading' | 'ready' | 'no-server';
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export function useNotesSync() {
  const [content, setContent] = useState('');
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const lastSavedRef = useRef('');

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

  const handleBlur = useCallback(async () => {
    if (loadState !== 'ready') return;
    if (content === lastSavedRef.current) return;

    setSaveState('saving');
    const result = await savePersonalHomeNote(content);
    if (result) {
      lastSavedRef.current = content;
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2000);
    } else {
      setSaveState('error');
    }
  }, [content, loadState]);

  return { content, setContent, loadState, saveState, handleBlur };
}
