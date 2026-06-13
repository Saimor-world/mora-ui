import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WebsiteEntryTokenLogin } from '@/components/entry/WebsiteEntryTokenLogin';
import { coreGet, corePost } from '@/lib/api/coreClient';

jest.mock('next/navigation', () => ({
    useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/lib/api/coreClient', () => ({
    coreGet: jest.fn(),
    corePost: jest.fn(),
}));

jest.mock('sonner', () => ({
    toast: { success: jest.fn(), error: jest.fn() },
}));

beforeEach(() => {
    jest.clearAllMocks();
    (coreGet as jest.Mock).mockResolvedValue({ email: 'owner@nextchaptergermany.de' });
    (corePost as jest.Mock).mockImplementation(async (path: string) => {
        if (path === '/v3/auth/logout') return { success: true };
        if (path === '/v3/entry/website-preview') return { success: true };
        return null;
    });
});

it('does not replace a real HQ session until the user confirms', async () => {
    render(
        <WebsiteEntryTokenLogin
            token="signed-preview.token"
            redirectOnSuccess={false}
        />,
    );

    expect(await screen.findByText(/owner@nextchaptergermany.de/i)).toBeInTheDocument();
    expect(corePost).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /Demo trotzdem öffnen/i }));

    await waitFor(() => {
        expect(corePost).toHaveBeenCalledWith('/v3/auth/logout', {}, expect.any(Object));
        expect(corePost).toHaveBeenCalledWith(
            '/v3/entry/website-preview',
            { token: 'signed-preview.token' },
            { skipAuth: true },
        );
    });
});
