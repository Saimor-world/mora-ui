import { Mic } from 'lucide-react';
export function MicButton({ onClick, label = 'Mit MÔRA sprechen' }: { onClick?: () => void; label?: string }) {
  return <button type="button" className="hm-mic" aria-label={label} onClick={onClick} data-testid="home-mic"><Mic size={26} strokeWidth={1.75} /></button>;
}
