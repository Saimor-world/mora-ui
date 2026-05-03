'use client';

/**
 * FramedMessage — switch/case renderer for typed MoraFrames.
 *
 * Replaces the chat's free-text bubble when mora.dialogue.v1 is on AND
 * the message arrived as a typed frame. The chat passes a stable
 * onConfirm/onCancel/onRetry/onPromote/onDraftPlan handler set; this
 * component dispatches to the right card per frame.kind.
 *
 * Pure switch — no state. State (e.g. confirmation pending) lives in
 * the chat's message store.
 */
import React from 'react';
import {
  isThoughtFrame,
  isPreviewFrame,
  isProgressFrame,
  isResultFrame,
  isCapabilityGapFrame,
  type MoraFrame,
} from '@/lib/types/moraFrame';
import { PreviewCard } from './PreviewCard';
import { ConfirmCard } from './ConfirmCard';
import { ProgressFrame as ProgressFrameCard } from './ProgressFrame';
import { ResultCard } from './ResultCard';
import { ErrorCard } from './ErrorCard';
import { CapabilityGapCard } from './CapabilityGapCard';

interface Props {
  frame: MoraFrame;
  /** When true (write/destructive/secret risk + still pending), shows ConfirmCard below the PreviewCard. */
  awaitingConfirm?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
  onRetry?: () => void;
  onPromoteToMemory?: () => void;
  onDraftPlan?: () => void;
}

export function FramedMessage({
  frame,
  awaitingConfirm,
  onConfirm,
  onCancel,
  onRetry,
  onPromoteToMemory,
  onDraftPlan,
}: Props) {
  if (isThoughtFrame(frame)) {
    // Thought = Mora's prose. Render as a plain bubble; chat owns
    // markdown if needed. Keep it lean here.
    return (
      <div className="text-sm text-white/85 leading-relaxed whitespace-pre-wrap">
        {frame.text}
      </div>
    );
  }

  if (isPreviewFrame(frame)) {
    return (
      <div className="space-y-2">
        <PreviewCard preview={frame.preview} toolLabel={frame.tool} />
        {awaitingConfirm && onConfirm && onCancel && (
          <ConfirmCard
            riskLevel={frame.risk_level}
            affectedSummary={frame.preview.intent}
            onConfirm={onConfirm}
            onCancel={onCancel}
          />
        )}
      </div>
    );
  }

  if (isProgressFrame(frame)) {
    return <ProgressFrameCard phase={frame.phase} pct={frame.pct ?? null} />;
  }

  if (isResultFrame(frame)) {
    return frame.result.ok
      ? <ResultCard result={frame.result} onPromoteToMemory={onPromoteToMemory} />
      : <ErrorCard result={frame.result} onRetry={onRetry} />;
  }

  if (isCapabilityGapFrame(frame)) {
    return (
      <CapabilityGapCard
        intent={frame.intent}
        nearest={frame.nearest}
        onDraftPlan={onDraftPlan}
      />
    );
  }

  // Forward-compat: an unknown kind shouldn't crash the chat.
  return null;
}
