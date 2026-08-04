import { CornerDownLeft, FolderKanban, Info, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ProjectStatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAllProjects } from '@/hooks/queries/useProjects';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

import { getVisibleNavGroups } from './navigation';

/**
 * Global arama.
 *
 * ÖNEMLİ SINIR: Backend'de metin araması yapan bir uç YOK — `GET /api/projects` ve
 * `GET /api/tasks` yalnızca alan bazlı filtreler kabul ediyor (FRONTEND_API_GAPS.md #4).
 * Bu yüzden arama, erişilebilir projeler listesi (sayfalanarak çekilir) ve uygulama
 * sayfaları üzerinde ÇALIŞIR; görev başlıklarında sunucu tarafı arama yapılamaz.
 * Bu durum kullanıcıya panelin altında açıkça yazılır.
 */
export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  // Panel açılana kadar proje listesi çekilmez.
  const { data: projects, isLoading } = useAllProjects(open);

  // Cmd/Ctrl + K kısayolu.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const normalizedTerm = term.trim().toLocaleLowerCase('tr-TR');

  const projectResults = useMemo(() => {
    if (!projects) return [];
    if (normalizedTerm.length === 0) return projects.slice(0, 5);

    return projects
      .filter((project) => project.name.toLocaleLowerCase('tr-TR').includes(normalizedTerm))
      .slice(0, 8);
  }, [projects, normalizedTerm]);

  const pageResults = useMemo(() => {
    const items = getVisibleNavGroups(user).flatMap((group) => group.items);
    if (normalizedTerm.length === 0) return [];
    return items.filter((item) => item.label.toLocaleLowerCase('tr-TR').includes(normalizedTerm));
  }, [user, normalizedTerm]);

  function go(path: string) {
    setOpen(false);
    setTerm('');
    navigate(path);
  }

  return (
    <>
      <Button
        variant="outline"
        className={cn(
          'h-9 w-9 justify-center px-0 text-muted-foreground',
          'md:w-64 md:justify-start md:px-3',
        )}
        onClick={() => setOpen(true)}
        aria-label="Ara"
      >
        <Search aria-hidden="true" />
        <span className="hidden md:inline">Proje veya sayfa ara…</span>
        <kbd className="ml-auto hidden rounded border border-border px-1.5 py-0.5 text-[10px] md:inline">
          ⌘K
        </kbd>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl p-0" hideClose>
          <DialogTitle className="sr-only">Arama</DialogTitle>
          <DialogDescription className="sr-only">
            Projeler ve uygulama sayfaları arasında arama yapın.
          </DialogDescription>

          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <Input
              autoFocus
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Proje adı veya sayfa ara…"
              className="h-8 border-0 bg-transparent p-0 shadow-none focus-visible:outline-none"
              aria-label="Arama terimi"
            />
          </div>

          <div className="max-h-80 overflow-y-auto scrollbar-thin p-2">
            {isLoading ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">Yükleniyor…</p>
            ) : null}

            {!isLoading && projectResults.length === 0 && pageResults.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                Sonuç bulunamadı.
              </p>
            ) : null}

            {projectResults.length > 0 ? (
              <div className="mb-2">
                <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {normalizedTerm.length === 0 ? 'Projeler' : 'Eşleşen projeler'}
                </p>
                <ul>
                  {projectResults.map((project) => (
                    <li key={project.id}>
                      <button
                        type="button"
                        onClick={() => go(`/projects/${project.id}`)}
                        className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-accent"
                      >
                        <FolderKanban className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate">{project.name}</span>
                        <ProjectStatusBadge status={project.status} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {pageResults.length > 0 ? (
              <div>
                <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Sayfalar
                </p>
                <ul>
                  {pageResults.map((page) => {
                    const Icon = page.icon;
                    return (
                      <li key={page.to}>
                        <button
                          type="button"
                          onClick={() => go(page.to)}
                          className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-accent"
                        >
                          <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                          <span className="flex-1">{page.label}</span>
                          <CornerDownLeft className="size-3 text-muted-foreground" aria-hidden="true" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </div>

          <p className="flex items-start gap-2 border-t border-border px-4 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
            <span>
              API'de metin araması yapan bir uç bulunmadığı için arama, erişebildiğiniz projeler ve
              uygulama sayfaları üzerinde çalışır. Görev araması için Görevler sayfasındaki filtreleri
              kullanın.
            </span>
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
