/**
 * Create Space Dialog
 *
 * Beautiful form for creating new spaces
 * Supports name, icon, description, branding
 */

'use client';

import { useState } from 'react';
import { useSpaceStore } from '@/store/spaces';
import { SPACE_ICONS } from '@/lib/spaces/types';
import type { CreateSpaceInput } from '@/lib/spaces/types';
import { showToast } from '@/lib/toast';

interface CreateSpaceDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function CreateSpaceDialog({ open, onClose }: CreateSpaceDialogProps) {
  const { createSpace } = useSpaceStore();
  const [formData, setFormData] = useState<CreateSpaceInput>({
    name: '',
    description: '',
    icon: '🏢',
  });
  const [showIconPicker, setShowIconPicker] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showToast({ message: 'Bitte gib einen Namen ein', variant: 'error' });
      return;
    }

    const space = createSpace(formData);

    showToast({
      message: `Space "${space.name}" erstellt! 🌱`,
      variant: 'success',
    });

    // Reset & close
    setFormData({
      name: '',
      description: '',
      icon: '🏢',
    });
    onClose();
  };

  const handleIconSelect = (icon: string) => {
    setFormData({ ...formData, icon });
    setShowIconPicker(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="max-w-2xl w-full bg-gradient-to-br from-card/95 via-card/90 to-card/85 rounded-3xl border border-emerald-500/20 shadow-[0_20px_80px_0_rgba(16,185,129,0.3)] animate-in zoom-in duration-300">
        {/* Header */}
        <div className="p-8 border-b border-border/20">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold flex items-center gap-3">
                <span className="text-3xl">{formData.icon}</span>
                <span>Neuen Space erstellen</span>
              </h2>
              <p className="text-sm text-muted-foreground mt-2">
                Ein Space ist ein isoliertes Myzelium mit eigenen Quellen
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground mora-transition"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {/* Icon Picker */}
          <div>
            <label className="block text-sm font-medium mb-2">Icon</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowIconPicker(!showIconPicker)}
                className="w-full px-4 py-3 rounded-2xl border border-border/40 bg-background/60 hover:bg-background/80 mora-transition text-left flex items-center gap-3"
              >
                <span className="text-3xl">{formData.icon}</span>
                <span className="text-sm text-muted-foreground">
                  Klicke um Icon zu wählen
                </span>
              </button>

              {showIconPicker && (
                <div className="absolute top-full mt-2 w-full max-h-64 overflow-y-auto rounded-2xl border border-border/40 bg-card/95 backdrop-blur-xl p-4 shadow-xl z-10 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="grid grid-cols-8 gap-2">
                    {SPACE_ICONS.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => handleIconSelect(icon)}
                        className={`
                          p-3 rounded-xl text-2xl hover:bg-emerald-500/20 mora-transition
                          ${formData.icon === icon ? 'bg-emerald-500/30 ring-2 ring-emerald-500/50' : ''}
                        `}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="z.B. Acme Corp, Personal, Projekt X"
              className="w-full px-4 py-3 rounded-2xl border border-border/40 bg-background/60 focus:bg-background/80 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 outline-none mora-transition placeholder:text-muted-foreground/50"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Beschreibung <span className="text-xs text-muted-foreground">(optional)</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Was enthält dieser Space?"
              rows={3}
              className="w-full px-4 py-3 rounded-2xl border border-border/40 bg-background/60 focus:bg-background/80 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 outline-none mora-transition resize-none placeholder:text-muted-foreground/50"
            />
          </div>

          {/* Info Box */}
          <div className="rounded-2xl border border-blue-500/20 bg-blue-950/20 p-4">
            <div className="flex gap-3">
              <span className="text-xl">💡</span>
              <div className="flex-1 text-sm text-blue-200/80">
                <p className="font-medium mb-1">Nach dem Erstellen:</p>
                <p>
                  Du kannst Datenquellen (Filesystem, Notion, GitHub) zum Space hinzufügen.
                  Jeder Space ist komplett isoliert.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-full border border-border/40 bg-background/40 hover:bg-background/60 text-muted-foreground hover:text-foreground mora-transition"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={!formData.name.trim()}
              className="flex-1 px-6 py-3 rounded-full bg-gradient-to-r from-emerald-500/90 via-emerald-600/80 to-emerald-500/90 text-emerald-50 font-semibold shadow-[0_4px_20px_0_rgba(16,185,129,0.4)] hover:shadow-[0_6px_30px_0_rgba(16,185,129,0.6)] hover:scale-105 mora-transition disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
            >
              🌱 Space erstellen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
