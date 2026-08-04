import { Monitor, Moon, Server, Sun } from 'lucide-react';

import { SectionCard } from '@/components/common/SectionCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { env } from '@/config/env';
import { useAuth } from '@/hooks/useAuth';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useTheme } from '@/hooks/useTheme';
import type { ThemeMode } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { USER_ROLE_LABELS } from '@/types/enums';

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: typeof Sun; description: string }[] = [
  { value: 'light', label: 'Açık', icon: Sun, description: 'Varsayılan görünüm' },
  { value: 'dark', label: 'Koyu', icon: Moon, description: 'Düşük ışık için' },
  { value: 'system', label: 'Sistem', icon: Monitor, description: 'İşletim sistemini takip eder' },
];

/**
 * Ayarlar.
 *
 * Backend'de kullanıcı tercihi saklayan bir uç YOK; bu yüzden buradaki tercihler
 * (tema, varsayılan liste görünümü) yalnızca tarayıcıda `localStorage` içinde
 * tutulur. Bu durum sayfada açıkça belirtilmiştir — sunucuya kaydediliyormuş
 * izlenimi verilmez.
 */
export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const [projectView, setProjectView] = useLocalStorage<'grid' | 'table'>('pm.projects.view', 'grid');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ayarlar"
        description="Arayüz tercihleri ve bağlantı bilgileri."
        breadcrumbs={[{ label: 'Panel', to: '/dashboard' }, { label: 'Ayarlar' }]}
      />

      <Alert variant="info">
        Aşağıdaki tercihler yalnızca bu tarayıcıda saklanır. API'de kullanıcı tercihi saklayan bir uç
        bulunmadığı için ayarlar başka bir cihazda geçerli olmaz.
      </Alert>

      <SectionCard title="Görünüm" description="Uygulamanın renk teması.">
        <div
          className="grid grid-cols-1 gap-3 sm:grid-cols-3"
          role="radiogroup"
          aria-label="Tema seçimi"
        >
          {THEME_OPTIONS.map((option) => {
            const Icon = option.icon;
            const selected = theme === option.value;

            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setTheme(option.value)}
                className={cn(
                  'flex flex-col items-start gap-1 rounded-md border p-3 text-left transition-colors',
                  selected
                    ? 'border-primary bg-primary-subtle'
                    : 'border-border bg-card hover:bg-accent',
                )}
              >
                <span
                  className={cn(
                    'flex items-center gap-2 text-sm font-medium',
                    selected ? 'text-primary' : 'text-foreground',
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {option.label}
                </span>
                <span className="text-xs text-muted-foreground">{option.description}</span>
              </button>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard title="Liste tercihleri" description="Projeler sayfasının varsayılan görünümü.">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={projectView === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setProjectView('grid')}
            aria-pressed={projectView === 'grid'}
          >
            Kart görünümü
          </Button>
          <Button
            variant={projectView === 'table' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setProjectView('table')}
            aria-pressed={projectView === 'table'}
          >
            Tablo görünümü
          </Button>
        </div>
      </SectionCard>

      <SectionCard title="Bağlantı" icon={Server} description="Arayüzün bağlandığı API.">
        <dl className="space-y-3 text-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <dt className="text-muted-foreground">API adresi</dt>
            <dd>
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{env.apiBaseUrl}</code>
            </dd>
          </div>
          <Separator />
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <dt className="text-muted-foreground">Kimlik doğrulama</dt>
            <dd className="text-foreground">JWT Bearer (Authorization header)</dd>
          </div>
          <Separator />
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <dt className="text-muted-foreground">Oturum kuralı</dt>
            <dd className="max-w-md text-right text-foreground">
              Bir hesap aynı anda tek yerde açık olabilir. Başka bir cihazdan giriş yapıldığında
              mevcut oturum sonlandırılır.
            </dd>
          </div>
          {user ? (
            <>
              <Separator />
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <dt className="text-muted-foreground">Oturum sahibi</dt>
                <dd className="text-foreground">
                  {user.email} · {USER_ROLE_LABELS[user.role]}
                </dd>
              </div>
            </>
          ) : null}
        </dl>

        <p className="mt-4 text-xs text-muted-foreground">
          API adresi <code className="rounded bg-muted px-1">VITE_API_BASE_URL</code> ortam
          değişkeninden okunur; kod içinde sabit yazılmaz.
        </p>
      </SectionCard>
    </div>
  );
}
