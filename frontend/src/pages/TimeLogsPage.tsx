import { Clock, Info, Plus, RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';

import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Paginator } from '@/components/common/Paginator';
import { TableSkeleton } from '@/components/common/Skeletons';
import { PageHeader } from '@/components/layout/PageHeader';
import { TimeLogFormDialog } from '@/components/time-logs/TimeLogFormDialog';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableWrapper,
} from '@/components/ui/table';
import { useAllProjects } from '@/hooks/queries/useProjects';
import { useAllTasks } from '@/hooks/queries/useTasks';
import { useTimeLogAggregate, useTimeLogs } from '@/hooks/queries/useTimeLogs';
import { useUserDirectory } from '@/hooks/queries/useUsers';
import { useAuth } from '@/hooks/useAuth';
import { sumHours } from '@/services/timeLogService';
import type { Project, Task, TimeLogQuery } from '@/types/models';
import { currentWeekRange, dateInputToApi, formatDate } from '@/utils/date';
import { formatHours } from '@/utils/format';

const ALL = 'all';

/**
 * Zaman kayıtları.
 *
 * Uçlar: `GET /api/time-logs` (taskId / userId / from / to filtreleriyle) ve
 * `POST /api/tasks/{taskId}/time-logs`.
 *
 * SINIRLAR (FRONTEND_API_GAPS.md #3, #8):
 * - Güncelleme ve silme ucu YOK → satırlarda işlem menüsü yok.
 * - Başlangıç/bitiş saati alanı YOK → model ondalıklı saat + iş günü tutar,
 *   bu yüzden çalışan bir "başlat/durdur" sayacı da yok.
 * - Proje bazlı filtre YOK → proje filtresi, projenin görev id'leri üzerinden
 *   istemcide uygulanır ve bu durum kullanıcıya belirtilir.
 * - Toplam süre ucu YOK → toplamlar indirilen kayıtlardan hesaplanır.
 */
export function TimeLogsPage() {
  const { user } = useAuth();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [userId, setUserId] = useState<string>(ALL);
  const [projectId, setProjectId] = useState<string>(ALL);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const projectsQuery = useAllProjects();
  const usersQuery = useUserDirectory(user);

  const query: TimeLogQuery = useMemo(
    () => ({
      page,
      pageSize,
      userId: userId === ALL ? undefined : Number(userId),
      from: dateInputToApi(from) ?? undefined,
      to: dateInputToApi(to) ?? undefined,
    }),
    [page, pageSize, userId, from, to],
  );

  const logsQuery = useTimeLogs(query);

  // Proje filtresi için o projenin görev id'leri gerekir.
  const selectedProjectId = projectId === ALL ? undefined : Number(projectId);
  const projectTasksQuery = useAllTasks(
    { projectId: selectedProjectId },
    Boolean(selectedProjectId),
  );

  // Görev adlarını gösterebilmek için erişilebilir görevler.
  const allTasksQuery = useAllTasks({});
  const tasksById = useMemo(() => {
    const map = new Map<number, Task>();
    for (const task of allTasksQuery.data?.items ?? []) map.set(task.id, task);
    return map;
  }, [allTasksQuery.data]);

  const projectsById = useMemo(() => {
    const map = new Map<number, Project>();
    for (const project of projectsQuery.data ?? []) map.set(project.id, project);
    return map;
  }, [projectsQuery.data]);

  const rows = useMemo(() => {
    const items = logsQuery.data?.items ?? [];
    if (!selectedProjectId) return items;

    const taskIds = new Set((projectTasksQuery.data?.items ?? []).map((task) => task.id));
    return items.filter((log) => taskIds.has(log.taskId));
  }, [logsQuery.data, selectedProjectId, projectTasksQuery.data]);

  /* --------------------------- Toplamlar (özet) --------------------------- */

  const todayIso = new Date().toISOString().slice(0, 10);
  const week = useMemo(() => currentWeekRange(), []);

  const todayLogsQuery = useTimeLogAggregate({
    from: `${todayIso}T00:00:00.000Z`,
    to: `${todayIso}T23:59:59.999Z`,
    userId: userId === ALL ? undefined : Number(userId),
  });

  const weekLogsQuery = useTimeLogAggregate({
    from: week.from,
    to: week.to,
    userId: userId === ALL ? undefined : Number(userId),
  });

  const projectTotals = useMemo(() => {
    const totals = new Map<number, number>();

    for (const log of weekLogsQuery.data?.items ?? []) {
      const task = tasksById.get(log.taskId);
      if (!task) continue;
      totals.set(task.projectId, (totals.get(task.projectId) ?? 0) + Number(log.hours));
    }

    return [...totals.entries()]
      .map(([id, hours]) => ({ project: projectsById.get(id), hours }))
      .filter((entry) => entry.project)
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 4);
  }, [weekLogsQuery.data, tasksById, projectsById]);

  const hasFilters = userId !== ALL || projectId !== ALL || from !== '' || to !== '';

  function resetFilters() {
    setUserId(ALL);
    setProjectId(ALL);
    setFrom('');
    setTo('');
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Zaman Kayıtları"
        description="Görevlere harcanan sürelerin kaydı."
        breadcrumbs={[{ label: 'Panel', to: '/dashboard' }, { label: 'Zaman Kayıtları' }]}
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus aria-hidden="true" />
            Zaman kaydı ekle
          </Button>
        }
      />

      {/* Özet */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Bugün</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
              {formatHours(sumHours(todayLogsQuery.data?.items ?? []))}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {todayLogsQuery.data?.items.length ?? 0} kayıt
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Bu hafta</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
              {formatHours(sumHours(weekLogsQuery.data?.items ?? []))}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {weekLogsQuery.data?.items.length ?? 0} kayıt
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Bu hafta · proje bazında</p>
            {projectTotals.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Kayıt yok</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {projectTotals.map((entry) => (
                  <li key={entry.project?.id} className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm text-foreground">{entry.project?.name}</span>
                    <span className="shrink-0 text-xs font-medium text-muted-foreground">
                      {formatHours(entry.hours)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filtreler */}
      <div className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2 xl:grid-cols-5">
        <Select
          value={projectId}
          onValueChange={(value) => {
            setProjectId(value);
            setPage(1);
          }}
        >
          <SelectTrigger aria-label="Projeye göre filtrele">
            <SelectValue placeholder="Proje" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tüm projeler</SelectItem>
            {(projectsQuery.data ?? []).map((project) => (
              <SelectItem key={project.id} value={String(project.id)}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {usersQuery.data && usersQuery.data.length > 0 ? (
          <Select
            value={userId}
            onValueChange={(value) => {
              setUserId(value);
              setPage(1);
            }}
          >
            <SelectTrigger aria-label="Kullanıcıya göre filtrele">
              <SelectValue placeholder="Kullanıcı" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tüm kullanıcılar</SelectItem>
              {usersQuery.data.map((person) => (
                <SelectItem key={person.id} value={String(person.id)}>
                  {person.firstName} {person.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        <div>
          <label className="mb-1 block text-xs text-muted-foreground" htmlFor="from-date">
            Başlangıç
          </label>
          <Input
            id="from-date"
            type="date"
            value={from}
            onChange={(event) => {
              setFrom(event.target.value);
              setPage(1);
            }}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-muted-foreground" htmlFor="to-date">
            Bitiş
          </label>
          <Input
            id="to-date"
            type="date"
            value={to}
            onChange={(event) => {
              setTo(event.target.value);
              setPage(1);
            }}
          />
        </div>

        {hasFilters ? (
          <div className="flex items-end">
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              <RotateCcw aria-hidden="true" />
              Sıfırla
            </Button>
          </div>
        ) : null}
      </div>

      {selectedProjectId ? (
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
          API zaman kayıtlarında proje filtresi sunmadığı için proje süzmesi, görüntülenen sayfadaki
          kayıtlar üzerinde uygulanır. Tarih ve kullanıcı filtreleri sunucu tarafında çalışır.
        </p>
      ) : null}

      {/* Tablo */}
      {logsQuery.isLoading ? (
        <TableSkeleton columns={6} />
      ) : logsQuery.isError ? (
        <ErrorState error={logsQuery.error} onRetry={() => void logsQuery.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="Zaman kaydı bulunamadı"
          description="Filtreleri değiştirin ya da yeni bir kayıt ekleyin."
          action={
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus aria-hidden="true" />
              Zaman kaydı ekle
            </Button>
          }
        />
      ) : (
        <div className="rounded-lg border border-border bg-card">
          <TableWrapper>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Kullanıcı</TableHead>
                  <TableHead>Proje</TableHead>
                  <TableHead>Görev</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Açıklama</TableHead>
                  <TableHead className="text-right">Süre</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((log) => {
                  const task = tasksById.get(log.taskId);
                  const project = task ? projectsById.get(task.projectId) : undefined;

                  return (
                    <TableRow key={log.id}>
                      <TableCell>
                        <span className="flex items-center gap-2">
                          <Avatar name={log.userName} seed={log.userId} size="xs" />
                          <span className="truncate text-sm">{log.userName}</span>
                        </span>
                      </TableCell>
                      <TableCell className="max-w-40 truncate text-sm text-muted-foreground">
                        {project?.name ?? '—'}
                      </TableCell>
                      <TableCell className="max-w-56 truncate text-sm">
                        {task?.title ?? `#${log.taskId}`}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatDate(log.workDate)}
                      </TableCell>
                      <TableCell className="max-w-64 truncate text-sm text-muted-foreground">
                        {log.description ?? '—'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right text-sm font-medium">
                        {formatHours(log.hours)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableWrapper>

          <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
            <span className="text-xs text-muted-foreground">Bu sayfadaki toplam</span>
            <span className="text-sm font-semibold text-foreground">{formatHours(sumHours(rows))}</span>
          </div>

          {logsQuery.data ? (
            <Paginator
              page={logsQuery.data.page}
              pageSize={logsQuery.data.pageSize}
              totalCount={logsQuery.data.totalCount}
              totalPages={logsQuery.data.totalPages}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          ) : null}
        </div>
      )}

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
        API'de zaman kaydı güncelleme/silme ucu bulunmuyor; bu nedenle kayıtlar eklendikten sonra
        değiştirilemez ve arayüzde düzenle/sil butonu gösterilmez. Ayrıntı için{' '}
        <code className="rounded bg-muted px-1">FRONTEND_API_GAPS.md</code>.
      </p>

      <TimeLogFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
