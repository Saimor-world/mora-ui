/**
 * MeineDateienPane — adapter smoke tests
 *
 * MeineDateienPane is now a thin AppLoader adapter (Private Orbit app).
 * The content logic lives inside apps/meine-dateien/index.tsx.
 * These tests verify the adapter renders without crashing and delegates
 * to AppLoader with the correct appId.
 */

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockAppLoader = jest.fn((_props: any) => <div data-testid="app-loader-mock" />);
jest.mock('@/lib/apps/AppLoader', () => ({
    AppLoader: (props: any) => mockAppLoader(props),
}));

import { MeineDateienPane } from '@/components/panes/MeineDateienPane';

describe('MeineDateienPane adapter', () => {
    beforeEach(() => {
        mockAppLoader.mockClear();
    });

    it('renders without crashing', () => {
        const { container } = render(<MeineDateienPane />);
        expect(container).toBeTruthy();
    });

    it('passes appId="meine-dateien" to AppLoader', () => {
        render(<MeineDateienPane />);
        expect(mockAppLoader).toHaveBeenCalledWith(
            expect.objectContaining({ appId: 'meine-dateien' })
        );
    });

    it('accepts custom id prop', () => {
        render(<MeineDateienPane id="custom-id" />);
        expect(mockAppLoader).toHaveBeenCalledWith(
            expect.objectContaining({ paneId: 'custom-id' })
        );
    });
});
