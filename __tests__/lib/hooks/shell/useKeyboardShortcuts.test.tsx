import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useKeyboardShortcuts } from '@/lib/hooks/shell/useKeyboardShortcuts';
import { getSpotlightShortcutKeys, isSpotlightShortcut } from '@/lib/hooks/usePlatformModifier';

function setPlatform(platform: string) {
    Object.defineProperty(window.navigator, 'platform', {
        value: platform,
        configurable: true,
    });
}

function ShortcutHarness(props: {
    onToggleSpotlight?: () => void;
    onOpenAmbient?: () => void;
}) {
    useKeyboardShortcuts({
        onToggleSpotlight: props.onToggleSpotlight ?? jest.fn(),
        onOpenAmbient: props.onOpenAmbient,
    });

    return <input aria-label="field" />;
}

describe('useKeyboardShortcuts', () => {
    afterEach(() => {
        cleanup();
        jest.clearAllMocks();
    });

    it('advertises Strg+K on Windows and accepts Strg+K plus Alt+K for Spotlight', () => {
        setPlatform('Win32');
        expect(getSpotlightShortcutKeys()).toEqual(['Strg', 'K']);
        expect(isSpotlightShortcut(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))).toBe(true);
        expect(isSpotlightShortcut(new KeyboardEvent('keydown', { key: 'k', altKey: true }))).toBe(true);
    });

    it('opens Spotlight with Ctrl+K from the shell shortcut listener', () => {
        setPlatform('Win32');
        const onToggleSpotlight = jest.fn();
        render(<ShortcutHarness onToggleSpotlight={onToggleSpotlight} />);

        fireEvent.keyDown(window, { key: 'k', ctrlKey: true });

        expect(onToggleSpotlight).toHaveBeenCalledTimes(1);
    });

    it('opens voice with Ctrl+A or Alt+A outside text inputs only', () => {
        setPlatform('Win32');
        const onOpenAmbient = jest.fn();
        const { getByLabelText } = render(<ShortcutHarness onOpenAmbient={onOpenAmbient} />);

        fireEvent.keyDown(window, { key: 'a', ctrlKey: true });
        fireEvent.keyDown(window, { key: 'a', altKey: true, code: 'KeyA' });
        fireEvent.keyDown(getByLabelText('field'), { key: 'a', ctrlKey: true });

        expect(onOpenAmbient).toHaveBeenCalledTimes(2);
    });
});
