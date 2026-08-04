import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it } from 'vitest';

import { normalizeApiError, toFormFieldName } from './errors';

/** Gerçek bir Axios hata nesnesi üretir. */
function axiosErrorWithResponse(status: number, data: unknown): AxiosError {
  const config = { headers: new AxiosHeaders() };
  const error = new AxiosError('İstek başarısız', 'ERR_BAD_REQUEST', config);

  error.response = {
    status,
    statusText: '',
    data,
    headers: {},
    config,
  } as AxiosError['response'];

  return error;
}

describe('normalizeApiError', () => {
  it('middleware’in PascalCase gövdesini çözer', () => {
    // Program.cs/ExceptionHandlingMiddleware, JsonSerializer'ı varsayılan ayarlarla
    // çağırdığı için alanlar PascalCase geliyor.
    const error = axiosErrorWithResponse(409, {
      Message: 'Bu hesap şu anda başka bir cihazda açık.',
      StatusCode: 409,
      Errors: null,
      Code: 'SESSION_ALREADY_ACTIVE',
    });

    const result = normalizeApiError(error);

    expect(result.status).toBe(409);
    expect(result.message).toBe('Bu hesap şu anda başka bir cihazda açık.');
    expect(result.code).toBe('SESSION_ALREADY_ACTIVE');
    expect(result.isNetworkError).toBe(false);
  });

  it('FluentValidation’ın camelCase ProblemDetails gövdesini çözer', () => {
    const error = axiosErrorWithResponse(400, {
      title: 'One or more validation errors occurred.',
      status: 400,
      errors: {
        Email: ["'Email' geçerli bir e-posta adresi değil."],
        Password: ["'Password' boş olmamalı."],
      },
    });

    const result = normalizeApiError(error);

    expect(result.status).toBe(400);
    // Genel başlık yerine ilk alan hatası gösterilir.
    expect(result.message).toBe("'Email' geçerli bir e-posta adresi değil.");
    expect(result.fieldErrors?.Password).toEqual(["'Password' boş olmamalı."]);
  });

  it('yanıt gelmediğinde ağ hatası olarak işaretler', () => {
    const error = new AxiosError('Network Error', 'ERR_NETWORK');

    const result = normalizeApiError(error);

    expect(result.isNetworkError).toBe(true);
    expect(result.status).toBe(0);
    expect(result.message).toContain('Sunucuya ulaşılamıyor');
  });

  it('gövde boşsa duruma göre varsayılan mesaj üretir', () => {
    expect(normalizeApiError(axiosErrorWithResponse(403, null)).message).toBe(
      'Bu işlem için yetkiniz yok.',
    );
    expect(normalizeApiError(axiosErrorWithResponse(404, null)).message).toBe('Kayıt bulunamadı.');
  });

  it('Axios olmayan hataları da ele alır', () => {
    expect(normalizeApiError(new Error('bir şeyler ters gitti')).message).toBe(
      'bir şeyler ters gitti',
    );
    expect(normalizeApiError('düz metin').message).toBe('Beklenmeyen bir hata oluştu.');
  });
});

describe('toFormFieldName', () => {
  it('PascalCase alan adını camelCase’e çevirir', () => {
    expect(toFormFieldName('Email')).toBe('email');
    expect(toFormFieldName('FirstName')).toBe('firstName');
    expect(toFormFieldName('Address.City')).toBe('address.city');
  });
});
