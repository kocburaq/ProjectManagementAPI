import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

import { normalizeApiError, toFormFieldName } from './errors';

/**
 * Backend doğrulama hatalarını ilgili form alanlarının altına yazar.
 *
 * FluentValidation alan adlarını PascalCase döndürür (`"Email"`), form alanları ise
 * camelCase'tir (`email`) — eşleştirme `toFormFieldName` ile yapılır. Formda karşılığı
 * olmayan hatalar `root` altına düşer, böylece hiçbir mesaj kaybolmaz.
 *
 * @returns Kullanıcıya toast ile gösterilecek genel mesaj; alan bazlı hata varsa `null`.
 */
export function applyApiFieldErrors<TFieldValues extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<TFieldValues>,
  knownFields: readonly string[],
): string | null {
  const normalized = normalizeApiError(error);
  const fieldErrors = normalized.fieldErrors;

  if (!fieldErrors || Object.keys(fieldErrors).length === 0) {
    return normalized.message;
  }

  const unmatched: string[] = [];
  let matchedAny = false;

  for (const [apiField, messages] of Object.entries(fieldErrors)) {
    const message = messages?.[0];
    if (!message) continue;

    const formField = toFormFieldName(apiField);

    if (knownFields.includes(formField)) {
      // Alan adı çalışma zamanında belirlendiği için `Path<T>` şablon tipine
      // doğrudan daraltılamaz; eşleşme `knownFields` ile zaten doğrulanıyor.
      setError(formField as unknown as Path<TFieldValues>, { type: 'server', message });
      matchedAny = true;
    } else {
      unmatched.push(message);
    }
  }

  if (unmatched.length > 0) {
    setError('root.serverError' as unknown as Path<TFieldValues>, {
      type: 'server',
      message: unmatched.join(' '),
    });
  }

  // Alanlara dağıtılabildiyse ayrıca toast göstermeye gerek yok.
  return matchedAny || unmatched.length > 0 ? null : normalized.message;
}
