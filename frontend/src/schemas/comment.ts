import { z } from 'zod';

/**
 * Yorum form şeması.
 * Backend karşılığı `Validators/CommentValidators.cs`: `Content` → NotEmpty.
 * (Uzunluk sınırı backend'de tanımlı olmadığı için burada da konulmadı.)
 */
export const commentFormSchema = z.object({
  content: z.string().trim().min(1, 'Yorum boş olamaz.'),
});

export type CommentFormValues = z.infer<typeof commentFormSchema>;

export const COMMENT_FORM_FIELDS = ['content'] as const;
