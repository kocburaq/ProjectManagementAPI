import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, AxiosHeaders } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/testUtils';

import { LoginPage } from './LoginPage';

/* `useAuth`'ı taklit ediyoruz: bu test formun doğrulama ve hata gösterimini sınar,
   AuthProvider'ın oturum yükleme akışını değil. */
const login = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    login,
    register: vi.fn(),
    logout: vi.fn(),
    user: null,
    status: 'unauthenticated' as const,
    isAuthenticated: false,
    sessionNotice: null,
    clearSessionNotice: vi.fn(),
    updateCurrentUser: vi.fn(),
  }),
}));

function axiosError(status: number, data: unknown): AxiosError {
  const config = { headers: new AxiosHeaders() };
  const error = new AxiosError('failed', 'ERR_BAD_REQUEST', config);
  error.response = { status, statusText: '', data, headers: {}, config } as AxiosError['response'];
  return error;
}

describe('LoginPage', () => {
  beforeEach(() => {
    login.mockReset();
  });

  it('boş form gönderildiğinde doğrulama hatalarını gösterir ve istek atmaz', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />, { route: '/login' });

    await user.click(screen.getByRole('button', { name: 'Giriş yap' }));

    expect(await screen.findByText('E-posta zorunludur.')).toBeInTheDocument();
    expect(screen.getByText('Şifre zorunludur.')).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it('geçersiz e-posta biçimini reddeder', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />, { route: '/login' });

    await user.type(screen.getByPlaceholderText('ornek@sirket.com'),'gecersiz');
    await user.type(screen.getByPlaceholderText('••••••••'),'Manager123!');
    await user.click(screen.getByRole('button', { name: 'Giriş yap' }));

    expect(await screen.findByText('Geçerli bir e-posta adresi girin.')).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it('geçerli formu gönderir', async () => {
    const user = userEvent.setup();
    login.mockResolvedValue({});
    renderWithProviders(<LoginPage />, { route: '/login' });

    await user.type(screen.getByPlaceholderText('ornek@sirket.com'),'pm@heweso.com');
    await user.type(screen.getByPlaceholderText('••••••••'),'Manager123!');
    await user.click(screen.getByRole('button', { name: 'Giriş yap' }));

    await waitFor(() =>
      expect(login).toHaveBeenCalledWith({ email: 'pm@heweso.com', password: 'Manager123!' }),
    );
  });

  it('API 401 hatasını kullanıcıya gösterir', async () => {
    const user = userEvent.setup();
    login.mockRejectedValue(
      axiosError(401, { Message: 'Invalid email or password.', StatusCode: 401 }),
    );
    renderWithProviders(<LoginPage />, { route: '/login' });

    await user.type(screen.getByPlaceholderText('ornek@sirket.com'),'pm@heweso.com');
    await user.type(screen.getByPlaceholderText('••••••••'),'yanlis');
    await user.click(screen.getByRole('button', { name: 'Giriş yap' }));

    expect(await screen.findByText('Invalid email or password.')).toBeInTheDocument();
  });

  it('eşzamanlı oturum çakışmasını (409) ayrı bir uyarı olarak gösterir', async () => {
    const user = userEvent.setup();
    login.mockRejectedValue(
      axiosError(409, {
        Message: 'Bu hesap şu anda başka bir cihazda/tarayıcıda açık.',
        StatusCode: 409,
        Code: 'SESSION_ALREADY_ACTIVE',
      }),
    );
    renderWithProviders(<LoginPage />, { route: '/login' });

    await user.type(screen.getByPlaceholderText('ornek@sirket.com'),'pm@heweso.com');
    await user.type(screen.getByPlaceholderText('••••••••'),'Manager123!');
    await user.click(screen.getByRole('button', { name: 'Giriş yap' }));

    expect(await screen.findByText('Bu hesap başka bir yerde açık')).toBeInTheDocument();
  });
});
