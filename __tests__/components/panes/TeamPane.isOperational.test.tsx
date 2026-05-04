/**
 * TeamPane — adapter smoke tests
 *
 * TeamPane is now a thin AppLoader adapter. The isOperational logic lives
 * inside apps/team/index.tsx. These tests verify the adapter renders without
 * crashing and passes the correct appId to AppLoader.
 */

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock AppLoader — capture props to verify adapter passes correct appId
const mockAppLoader = jest.fn(() => <div data-testid="app-loader-mock" />);
jest.mock('@/lib/apps/AppLoader', () => ({
    AppLoader: (props: any) => mockAppLoader(props),
}));

import { TeamPane } from '@/components/panes/TeamPane';

describe('TeamPane adapter', () => {
    beforeEach(() => {
        mockAppLoader.mockClear();
    });

    it('renders without crashing', () => {
        const { container } = render(<TeamPane id="team-test" />);
        expect(container).toBeTruthy();
    });

    it('passes appId="team" to AppLoader', () => {
        render(<TeamPane id="team-test" />);
        expect(mockAppLoader).toHaveBeenCalledWith(
            expect.objectContaining({ appId: 'team', paneId: 'team-test' })
        );
    });

    it('passes data through to AppLoader', () => {
        const data = { context: 'test' };
        render(<TeamPane id="team-test" data={data} />);
        expect(mockAppLoader).toHaveBeenCalledWith(
            expect.objectContaining({ initialData: data })
        );
    });
});
