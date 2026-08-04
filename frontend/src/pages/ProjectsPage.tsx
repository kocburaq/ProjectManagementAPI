import { FolderKanban, Info, LayoutGrid, Plus, RotateCcw, Search, Table2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Paginator } from '@/components/common/Paginator';
import { CardGridSkeleton, TableSkeleton } from '@/components/common/Skeletons';
import { PageHeader } from '@/components/layout/PageHeader';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { ProjectFormDialog } from '@/components/projects/ProjectFormDialog';
import { ProjectTable } from '@/components/projects/ProjectTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useArchiveProject, useDeleteProject } from '@/hooks/mutations/useProjectMutations';
import { useProjects, useProjectStatsList } from '@/hooks/queries/useProjects';
import { useAuth } from '@/hooks/useAuth';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_ORDER, ProjectStatus } from '@/types/enums';
import type { Project, ProjectQuery, ProjectTaskStats } from '@/types/models';
import { canCreateProject, canManageProject } from '@/utils/permissions';

type ViewMode = 'grid' | 'table';
type SortOption = 'createdAt-desc' | 'name-asc' | 'name-desc' | 'startDate-asc' | 'startDate-desc' | 'status-asc';

const ALL = 'all';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'createdAt-desc', label: 'En yeni' },
  { value: 'name-asc', label: 'Ada göre (A-Z)' },
  { value: 'name-desc', label: 'Ada göre (Z-A)' },
  { value: 'startDate-asc', label: 'Başlangıç (eskiden yeniye)' },
  { value: 'startDate-desc', label: 'Başlangıç (yeniden eskiye)' },
  { value: 'status-asc', label: 'Duruma göre' },
];

/** Sıralama seçimini backend'in beklediği `sortBy` + `sortDirection` ikilisine çevirir. */
function toSortParams(option: SortOption): Pick<ProjectQuery, 'sortBy' | 'sortDirection'> {
  switch (option) {
    case 'name-asc':
      return { sortBy: 'name', sortDirection: 'asc' };
    case 'name-desc':
      return { sortBy: 'name', sortDirection: 'desc' };
    case 'startDate-asc':
      return { sortBy: 'startDate', sortDirection: 'asc' };
    case 'startDate-desc':
      return { sortBy: 'startDate', sortDirection: 'desc' };
    case 'status-asc':
      return { sortBy: 'status', sortDirection: 'asc' };
    default:
      // Backend varsayılanı CreatedAt; yönü desc vererek "en yeni" elde edilir.
      return { sortDirection: 'desc' };
  }
}

export function ProjectsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [status, setStatus] = useState<string>(ALL);
  const [sort, setSort] = useState<SortOption>('createdAt-desc');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 250);

  // Görünüm tercihi kalıcı: kullanıcı tabloyu seçtiyse bir dahaki girişte de tablo açılır.
  const [view, setView] = useLocalStorage<ViewMode>('pm.projects.view', 'grid');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Project | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  const archiveProject = useArchiveProject();
  const deleteProject = useDeleteProject();

  // Panel kartlarından gelen derin bağlantı: /projects?status=2
  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam) {
      setStatus(statusParam);
      setPage(1);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const query: ProjectQuery = {
    page,
    pageSize,
    status: status === ALL ? undefined : (Number(status) as ProjectStatus),
    ...toSortParams(sort),
  };

  const projectsQuery = useProjects(query);
  const projects = projectsQuery.data?.items ?? [];

  /*
   * ARAMA HAKKINDA: `GET /api/projects` metin araması desteklemiyor
   * (FRONTEND_API_GAPS.md #4). Bu yüzden arama, sunucudan gelen GEÇERLİ SAYFA
   * üzerinde çalışır ve kullanıcı bu konuda uyarılır.
   */
  const visibleProjects = useMemo(() => {
    const term = debouncedSearch.trim().toLocaleLowerCase('tr-TR');
    if (term === '') return projects;
    return projects.filter((project) => project.name.toLocaleLowerCase('tr-TR').includes(term));
  }, [projects, debouncedSearch]);

  // Kart/tablo ilerleme yüzdeleri için sayım sorguları.
  const statsResults = useProjectStatsList(visibleProjects.map((project) => project.id));
  const statsByProject = useMemo(() => {
    const map = new Map<number, ProjectTaskStats>();
    for (const result of statsResults) {
      if (result.data) map.set(result.data.projectId, result.data);
    }
    return map;
  }, [statsResults]);

  const hasFilters = status !== ALL || search.trim() !== '' || sort !== 'createdAt-desc';

  function resetFilters() {
    setStatus(ALL);
    setSort('createdAt-desc');
    setSearch('');
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projeler"
        description="Ekibinizin yürüttüğü tüm projeler ve ilerleme durumları."
        breadcrumbs={[{ label: 'Panel', to: '/dashboard' }, { label: 'Projeler' }]}
        actions={
          canCreateProject(user) ? (
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus aria-hidden="true" />
              Yeni proje
            </Button>
          ) : null
        }
      />

      {/* Filtreler */}
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Bu sayfadaki projelerde ara…"
            className="pl-9"
            aria-label="Proje ara"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-44" aria-label="Duruma göre filtrele">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tüm durumlar</SelectItem>
              {PROJECT_STATUS_ORDER.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {PROJECT_STATUS_LABELS[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={sort}
            onValueChange={(value) => {
              setSort(value as SortOption);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-52" aria-label="Sıralama">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasFilters ? (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              <RotateCcw aria-hidden="true" />
              Sıfırla
            </Button>
          ) : null}

          {/* Görünüm değiştirici */}
          <div
            className="ml-auto flex items-center rounded-md border border-border p-0.5"
            role="group"
            aria-label="Görünüm"
          >
            <Button
              variant={view === 'grid' ? 'secondary' : 'ghost'}
              size="icon-sm"
              onClick={() => setView('grid')}
              aria-label="Kart görünümü"
              aria-pressed={view === 'grid'}
            >
              <LayoutGrid aria-hidden="true" />
            </Button>
            <Button
              variant={view === 'table' ? 'secondary' : 'ghost'}
              size="icon-sm"
              onClick={() => setView('table')}
              aria-label="Tablo görünümü"
              aria-pressed={view === 'table'}
            >
              <Table2 aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>

      {debouncedSearch.trim() !== '' ? (
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
          API metin araması desteklemediği için arama yalnızca görüntülenen sayfadaki{' '}
          {projects.length} proje üzerinde çalışır. Daha geniş arama için filtre ve sıralamayı kullanın.
        </p>
      ) : null}

      {/* İçerik */}
      {projectsQuery.isLoading ? (
        view === 'grid' ? (
          <CardGridSkeleton />
        ) : (
          <TableSkeleton columns={7} />
        )
      ) : projectsQuery.isError ? (
        <ErrorState error={projectsQuery.error} onRetry={() => void projectsQuery.refetch()} />
      ) : visibleProjects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title={hasFilters ? 'Eşleşen proje bulunamadı' : 'Henüz proje yok'}
          description={
            hasFilters
              ? 'Filtreleri değiştirmeyi ya da sıfırlamayı deneyin.'
              : canCreateProject(user)
                ? 'İlk projenizi oluşturarak başlayın.'
                : 'Bir projeye eklendiğinizde burada görünecek.'
          }
          action={
            hasFilters ? (
              <Button variant="outline" size="sm" onClick={resetFilters}>
                Filtreleri sıfırla
              </Button>
            ) : canCreateProject(user) ? (
              <Button
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus aria-hidden="true" />
                Yeni proje
              </Button>
            ) : null
          }
        />
      ) : view === 'grid' ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                stats={statsByProject.get(project.id)}
                statsLoading={!statsByProject.has(project.id)}
                canManage={canManageProject(user, project)}
                onEdit={(target) => {
                  setEditing(target);
                  setFormOpen(true);
                }}
                onArchive={setArchiveTarget}
                onDelete={setDeleteTarget}
              />
            ))}
          </div>

          {projectsQuery.data ? (
            <div className="rounded-lg border border-border bg-card">
              <Paginator
                page={projectsQuery.data.page}
                pageSize={projectsQuery.data.pageSize}
                totalCount={projectsQuery.data.totalCount}
                totalPages={projectsQuery.data.totalPages}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
                pageSizeOptions={[12, 24, 48]}
              />
            </div>
          ) : null}
        </>
      ) : (
        <div className="rounded-lg border border-border bg-card">
          <ProjectTable
            projects={visibleProjects}
            statsByProject={statsByProject}
            canManage={(project) => canManageProject(user, project)}
            onEdit={(target) => {
              setEditing(target);
              setFormOpen(true);
            }}
            onArchive={setArchiveTarget}
            onDelete={setDeleteTarget}
          />
          {projectsQuery.data ? (
            <Paginator
              page={projectsQuery.data.page}
              pageSize={projectsQuery.data.pageSize}
              totalCount={projectsQuery.data.totalCount}
              totalPages={projectsQuery.data.totalPages}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
              pageSizeOptions={[12, 24, 48]}
            />
          ) : null}
        </div>
      )}

      {/* Diyaloglar */}
      <ProjectFormDialog open={formOpen} onOpenChange={setFormOpen} project={editing} />

      <ConfirmDialog
        open={archiveTarget !== null}
        onOpenChange={(open) => (open ? undefined : setArchiveTarget(null))}
        title="Proje arşivlensin mi?"
        description={
          <>
            <strong>{archiveTarget?.name}</strong> arşivlenecek. Arşivlenen projeler listede
            kalmaya devam eder, ancak arşiv rozetiyle işaretlenir.
          </>
        }
        confirmLabel="Arşivle"
        loading={archiveProject.isPending}
        onConfirm={() => {
          if (!archiveTarget) return;
          archiveProject.mutate(archiveTarget.id, { onSettled: () => setArchiveTarget(null) });
        }}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => (open ? undefined : setDeleteTarget(null))}
        title="Proje silinsin mi?"
        description={
          <>
            <strong>{deleteTarget?.name}</strong> ve altındaki tüm görevler silinecek. Bu işlem
            arayüzden geri alınamaz.
          </>
        }
        confirmLabel="Sil"
        destructive
        loading={deleteProject.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteProject.mutate(deleteTarget.id, { onSettled: () => setDeleteTarget(null) });
        }}
      />
    </div>
  );
}
