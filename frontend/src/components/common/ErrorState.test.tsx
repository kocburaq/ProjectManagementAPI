import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it, vi } from 'vitest';

import { ErrorState } from './ErrorState';

function axiosError(status: number, data: unknown): AxiosError {
  const config = { headers: new AxiosHeaders() };
  const error = new AxiosError('failed', 'ERR_BAD_REQUEST', config);
  error.response = { status, statusText: '', data, headers: {}, config } as AxiosError['response'];
  return error;
}

describe('ErrorState', () => {
  it('backend hata mesajını gösterir', () => {
    render(<ErrorState error={axiosError(500, { Message: 'Sunucu hatası.', StatusCode: 500 })} />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Veriler yüklenemedi')).toBeInTheDocument();
    expect(screen.getByText('Sunucu hatası.')).toBeInTheDocument();
  });

  it('yetki hatasını ayrı başlıkla gösterir', () => {
    render(<ErrorState error={axiosError(403, { Message: 'Yetkiniz yok.', StatusCode: 403 })} />);

    expect(screen.getByText('Bu içeriği görme yetkiniz yok')).toBeInTheDocument();
  });

  it('ağ hatasında yönlendirici mesaj verir', () => {
    render(<ErrorState error={new AxiosError('Network Error', 'ERR_NETWORK')} />);

    expect(screen.getByText('Sunucuya ulaşılamadı')).toBeInTheDocument();
    expect(screen.getByText(/Backend çalışıyor mu/)).toBeInTheDocument();
  });

  it('tekrar dene butonu çağrılır', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    render(<ErrorState error={axiosError(500, null)} onRetry={onRetry} />);
    await user.click(screen.getByRole('button', { name: /Tekrar dene/ }));

    expect(onRetry).toHaveBeenCalledOnce();
  });
});
