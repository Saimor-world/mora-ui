import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DockNowPlaying } from '@/components/mora/Dock';
import { PendingItem, QuickMemoryInputInline } from '@/components/os/MemorySidebar';

jest.mock('framer-motion', () => {
    const React = require('react');
    const passthrough = (tag: string) =>
        React.forwardRef(
            (
                { children, initial, animate, exit, transition, whileHover, whileTap, layoutId, ...props }: any,
                ref: React.Ref<any>
            ) => React.createElement(tag, { ref, ...props }, children)
        );

    return {
        motion: {
            div: passthrough('div'),
            button: passthrough('button'),
            span: passthrough('span'),
        },
        AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    };
});

jest.mock('@/lib/api/coreClient', () => ({
    searchMemory: jest.fn().mockResolvedValue([]),
    learnInsight: jest.fn().mockResolvedValue(null),
    reconcileMemory: jest.fn().mockResolvedValue(null),
    getCachePerformance: jest.fn().mockResolvedValue(null),
    getCriticalFlowPerformance: jest.fn().mockResolvedValue(null),
    getApiVersionPerformance: jest.fn().mockResolvedValue(null),
}));

describe('operator control trust contract', () => {
    it('gives every Dock audio action a distinct name and prevents form submission', () => {
        const onSubmit = jest.fn((event: React.FormEvent) => event.preventDefault());
        const onOpen = jest.fn();
        const onToggle = jest.fn();
        const onNext = jest.fn();

        render(
            <form onSubmit={onSubmit}>
                <DockNowPlaying
                    isStandardMode={false}
                    isDeckOpen={false}
                    trackName="Quiet Rain"
                    trackCount={3}
                    isPlaying
                    onOpen={onOpen}
                    onToggle={onToggle}
                    onNext={onNext}
                />
            </form>
        );

        const settings = screen.getByRole('button', { name: 'Audio-Einstellungen \u00f6ffnen' });
        const track = screen.getByRole('button', { name: 'Audiotrack Quiet Rain \u00f6ffnen' });
        const pause = screen.getByRole('button', { name: 'Musik pausieren' });
        const next = screen.getByRole('button', { name: 'N\u00e4chsten Audiotrack w\u00e4hlen' });

        [settings, track, pause, next].forEach((button) => {
            expect(button).toHaveAttribute('type', 'button');
        });
        expect(pause).toHaveAttribute('aria-pressed', 'true');

        fireEvent.click(settings);
        fireEvent.click(track);
        fireEvent.click(pause);
        fireEvent.click(next);

        expect(onOpen).toHaveBeenCalledTimes(2);
        expect(onToggle).toHaveBeenCalledTimes(1);
        expect(onNext).toHaveBeenCalledTimes(1);
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it('names pending-memory decisions with their affected item', () => {
        const onSubmit = jest.fn((event: React.FormEvent) => event.preventDefault());
        const onApprove = jest.fn();
        const onReject = jest.fn();

        render(
            <form onSubmit={onSubmit}>
                <PendingItem
                    item={{ summary: 'Budget-Freigabe', category: 'fact' }}
                    onApprove={onApprove}
                    onReject={onReject}
                />
            </form>
        );

        const approve = screen.getByRole('button', { name: 'Erinnerung freigeben: Budget-Freigabe' });
        const reject = screen.getByRole('button', { name: 'Erinnerung ablehnen: Budget-Freigabe' });

        expect(approve).toHaveAttribute('type', 'button');
        expect(reject).toHaveAttribute('type', 'button');

        fireEvent.click(approve);
        fireEvent.click(reject);

        expect(onApprove).toHaveBeenCalledTimes(1);
        expect(onReject).toHaveBeenCalledTimes(1);
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it('exposes a named, form-safe quick-memory action', () => {
        render(
            <form>
                <QuickMemoryInputInline companyId="company-1" />
            </form>
        );

        expect(screen.getByRole('button', { name: 'Erinnerung speichern' })).toHaveAttribute('type', 'button');
    });

    it('keeps every MemorySidebar button explicitly form-safe', () => {
        const source = readFileSync(
            join(process.cwd(), 'components', 'os', 'MemorySidebar.tsx'),
            'utf8'
        );
        const buttonTags = source.match(/<(?:motion\.)?button\b[^>]*>/g) ?? [];

        expect(buttonTags.length).toBeGreaterThan(10);
        buttonTags.forEach((buttonTag) => {
            expect(buttonTag).toContain('type="button"');
        });
        expect(source).not.toMatch(/<button[^>]*>\s*\+\{pendingItems\.length - 3\} weitere/);
    });
});
