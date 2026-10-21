'use client';
import React from 'react';
import { StateView } from '@/components/os-kit';

interface State { error: Error | null }

/** Isolates a feature: one broken surface never takes the shell down. */
export class FeatureBoundary extends React.Component<{ featureId: string; children: React.ReactNode }, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error): State { return { error }; }
  componentDidUpdate(prev: { featureId: string }) {
    if (prev.featureId !== this.props.featureId && this.state.error) this.setState({ error: null });
  }
  render() {
    if (this.state.error) {
      return <StateView kind="error" title="Dieser Bereich konnte nicht geladen werden" copy="Die übrigen Bereiche funktionieren weiter." detail={this.state.error.message} action={{ label: 'Neu laden', onClick: () => this.setState({ error: null }) }} />;
    }
    return this.props.children;
  }
}
