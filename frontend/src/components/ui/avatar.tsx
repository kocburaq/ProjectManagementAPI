import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';
import { getAvatarColor, getInitials } from '@/utils/format';

const avatarVariants = cva(
  'inline-flex shrink-0 items-center justify-center rounded-full font-medium select-none',
  {
    variants: {
      size: {
        xs: 'size-6 text-[10px]',
        sm: 'size-7 text-xs',
        md: 'size-9 text-sm',
        lg: 'size-12 text-base',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

export interface AvatarProps extends VariantProps<typeof avatarVariants> {
  /** Görünen tam ad; baş harfler bundan üretilir. */
  name: string | null | undefined;
  className?: string;
  /** Rengin kararlı olması için kullanılacak anahtar (genelde kullanıcı id'si). */
  seed?: string | number;
}

/**
 * Baş harf avatarı.
 *
 * Backend kullanıcı görseli/avatar URL'i TUTMUYOR, bu yüzden resim yüklemesi yok;
 * baş harfler ve kararlı bir renk kullanılır (uydurma bir profil fotoğrafı gösterilmez).
 */
export function Avatar({ name, size, className, seed }: AvatarProps) {
  const initials = getInitials(name);

  return (
    <span
      className={cn(avatarVariants({ size }), getAvatarColor(seed ?? name), className)}
      title={name ?? undefined}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

/** Üst üste binen avatar yığını (proje kartlarında ekip gösterimi). */
export function AvatarStack({
  people,
  max = 4,
  size = 'sm',
}: {
  people: { id: number; name: string }[];
  max?: number;
  size?: AvatarProps['size'];
}) {
  const visible = people.slice(0, max);
  const overflow = people.length - visible.length;

  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {visible.map((person) => (
          <Avatar
            key={person.id}
            name={person.name}
            seed={person.id}
            size={size}
            className="ring-2 ring-card"
          />
        ))}
      </div>
      {overflow > 0 ? (
        <span className="ml-2 text-xs text-muted-foreground">+{overflow}</span>
      ) : null}
      <span className="sr-only">
        {people.length > 0 ? `${people.length} ekip üyesi: ${people.map((p) => p.name).join(', ')}` : 'Ekip üyesi yok'}
      </span>
    </div>
  );
}
