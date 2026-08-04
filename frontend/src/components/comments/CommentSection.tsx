import { zodResolver } from '@hookform/resolvers/zod';
import { MessageSquare, Pencil, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { ListSkeleton } from '@/components/common/Skeletons';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import {
  useCreateComment,
  useDeleteComment,
  useUpdateComment,
} from '@/hooks/mutations/useCommentMutations';
import { useTaskComments } from '@/hooks/queries/useComments';
import { useAuth } from '@/hooks/useAuth';
import { commentFormSchema, type CommentFormValues } from '@/schemas/comment';
import type { Comment } from '@/types/models';
import { formatDateTime, formatRelative } from '@/utils/date';
import { canModifyComment } from '@/utils/permissions';

export interface CommentSectionProps {
  taskId: number;
  /** Kullanıcı bu görevde yorum yazabiliyor mu? (Viewer rolü yazamaz.) */
  canComment: boolean;
}

/**
 * Görev yorumları.
 *
 * Backend yorumlarda tam CRUD sunuyor:
 *   GET/POST /api/tasks/{taskId}/comments, PUT/DELETE /api/comments/{id}
 * Düzenle/Sil butonları yalnızca yorumun sahibine ve Admin'e gösterilir
 * (`CommentService.EnsureCanModify` ile aynı kural).
 */
export function CommentSection({ taskId, canComment }: CommentSectionProps) {
  const { user } = useAuth();
  const commentsQuery = useTaskComments(taskId);

  const createComment = useCreateComment(taskId);
  const updateComment = useUpdateComment(taskId);
  const deleteComment = useDeleteComment(taskId);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Comment | null>(null);

  const form = useForm<CommentFormValues>({
    resolver: zodResolver(commentFormSchema),
    defaultValues: { content: '' },
  });

  async function onSubmit(values: CommentFormValues) {
    await createComment.mutateAsync(values.content);
    form.reset({ content: '' });
  }

  const comments = commentsQuery.data?.items ?? [];

  return (
    <section className="space-y-4" aria-label="Yorumlar">
      {canComment ? (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2" noValidate>
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Yorum yazın…"
                      aria-label="Yeni yorum"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end">
              <Button type="submit" size="sm" loading={form.formState.isSubmitting}>
                Yorum ekle
              </Button>
            </div>
          </form>
        </Form>
      ) : (
        <p className="rounded-md border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
          Bu görevde yorum yazma yetkiniz yok. (Projede "İzleyici" rolündeki üyeler salt okunurdur.)
        </p>
      )}

      {commentsQuery.isLoading ? (
        <ListSkeleton rows={3} />
      ) : commentsQuery.isError ? (
        <ErrorState error={commentsQuery.error} onRetry={() => void commentsQuery.refetch()} bare />
      ) : comments.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="Henüz yorum yok"
          description="İlk yorumu ekleyerek tartışmayı başlatın."
          bare
          className="py-8"
        />
      ) : (
        <ul className="space-y-4">
          {comments.map((comment) => {
            const editable = canModifyComment(user, comment);
            const isEditing = editingId === comment.id;

            return (
              <li key={comment.id} className="flex gap-3">
                <Avatar name={comment.userName} seed={comment.userId} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-sm font-medium text-foreground">{comment.userName}</span>
                    <time
                      className="text-xs text-muted-foreground"
                      dateTime={comment.createdAt}
                      title={formatDateTime(comment.createdAt)}
                    >
                      {formatRelative(comment.createdAt)}
                    </time>
                    {comment.updatedAt ? (
                      <span className="text-xs text-muted-foreground">(düzenlendi)</span>
                    ) : null}
                  </div>

                  {isEditing ? (
                    <div className="mt-2 space-y-2">
                      <Textarea
                        rows={3}
                        value={editValue}
                        onChange={(event) => setEditValue(event.target.value)}
                        aria-label="Yorumu düzenle"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          loading={updateComment.isPending}
                          disabled={editValue.trim() === ''}
                          onClick={() => {
                            updateComment.mutate(
                              { commentId: comment.id, content: editValue.trim() },
                              { onSuccess: () => setEditingId(null) },
                            );
                          }}
                        >
                          Kaydet
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                          <X aria-hidden="true" />
                          Vazgeç
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground">
                      {comment.content}
                    </p>
                  )}

                  {editable && !isEditing ? (
                    <div className="mt-1.5 flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-muted-foreground"
                        onClick={() => {
                          setEditingId(comment.id);
                          setEditValue(comment.content);
                        }}
                      >
                        <Pencil aria-hidden="true" />
                        Düzenle
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-danger"
                        onClick={() => setDeleteTarget(comment)}
                      >
                        <Trash2 aria-hidden="true" />
                        Sil
                      </Button>
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => (open ? undefined : setDeleteTarget(null))}
        title="Yorum silinsin mi?"
        description="Bu yorum kaldırılacak. İşlem arayüzden geri alınamaz."
        confirmLabel="Sil"
        destructive
        loading={deleteComment.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteComment.mutate(deleteTarget.id, { onSettled: () => setDeleteTarget(null) });
        }}
      />
    </section>
  );
}
