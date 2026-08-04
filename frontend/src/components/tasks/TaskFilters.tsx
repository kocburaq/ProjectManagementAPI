import { RotateCcw, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_ORDER,
  TASK_STATUS_LABELS,
  TASK_STATUS_ORDER,
} from '@/types/enums';
import type { Project, User } from '@/types/models';

export const FILTER_ALL = 'all';

export interface TaskFiltersValue {
  search: string;
  projectId: string;
  status: string;
  priority: string;
  assigneeId: string;
  dueBefore: string;
  onlyOverdue: boolean;
}

export const EMPTY_TASK_FILTERS: TaskFiltersValue = {
  search: '',
  projectId: FILTER_ALL,
  status: FILTER_ALL,
  priority: FILTER_ALL,
  assigneeId: FILTER_ALL,
  dueBefore: '',
  onlyOverdue: false,
};

export interface TaskFiltersProps {
  value: TaskFiltersValue;
  onChange: (value: TaskFiltersValue) => void;
  projects: Project[];
  /** `GET /api/users` yetkisi olmayan rollerde boş gelir; o durumda atanan filtresi gizlenir. */
  users: User[];
  hideProjectFilter?: boolean;
}

/**
 * Görev filtreleri.
 *
 * Proje / durum / öncelik / atanan / tarih filtreleri SUNUCU tarafında uygulanır
 * (`TaskQueryParameters`). "Sadece gecikenler" ve metin araması ise sunucuda
 * karşılığı olmadığı için istemci tarafında, yüklü sayfa üzerinde çalışır ve
 * bu durum kullanıcıya belirtilir.
 */
export function TaskFilters({
  value,
  onChange,
  projects,
  users,
  hideProjectFilter = false,
}: TaskFiltersProps) {
  function update(patch: Partial<TaskFiltersValue>) {
    onChange({ ...value, ...patch });
  }

  const hasFilters =
    value.search !== '' ||
    value.projectId !== FILTER_ALL ||
    value.status !== FILTER_ALL ||
    value.priority !== FILTER_ALL ||
    value.assigneeId !== FILTER_ALL ||
    value.dueBefore !== '' ||
    value.onlyOverdue;

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={value.search}
            onChange={(event) => update({ search: event.target.value })}
            placeholder="Bu sayfadaki görev başlıklarında ara…"
            className="pl-9"
            aria-label="Görev ara"
          />
        </div>

        {hasFilters ? (
          <Button variant="ghost" size="sm" onClick={() => onChange(EMPTY_TASK_FILTERS)}>
            <RotateCcw aria-hidden="true" />
            Filtreleri sıfırla
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {hideProjectFilter ? null : (
          <Select value={value.projectId} onValueChange={(next) => update({ projectId: next })}>
            <SelectTrigger aria-label="Projeye göre filtrele">
              <SelectValue placeholder="Proje" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FILTER_ALL}>Tüm projeler</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={String(project.id)}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={value.status} onValueChange={(next) => update({ status: next })}>
          <SelectTrigger aria-label="Duruma göre filtrele">
            <SelectValue placeholder="Durum" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={FILTER_ALL}>Tüm durumlar</SelectItem>
            {TASK_STATUS_ORDER.map((status) => (
              <SelectItem key={status} value={String(status)}>
                {TASK_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={value.priority} onValueChange={(next) => update({ priority: next })}>
          <SelectTrigger aria-label="Önceliğe göre filtrele">
            <SelectValue placeholder="Öncelik" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={FILTER_ALL}>Tüm öncelikler</SelectItem>
            {TASK_PRIORITY_ORDER.map((priority) => (
              <SelectItem key={priority} value={String(priority)}>
                {TASK_PRIORITY_LABELS[priority]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {users.length > 0 ? (
          <Select value={value.assigneeId} onValueChange={(next) => update({ assigneeId: next })}>
            <SelectTrigger aria-label="Atanan kişiye göre filtrele">
              <SelectValue placeholder="Atanan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FILTER_ALL}>Tüm kullanıcılar</SelectItem>
              {users.map((person) => (
                <SelectItem key={person.id} value={String(person.id)}>
                  {person.firstName} {person.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        <div className="flex items-center gap-2">
          <label className="flex-1 text-xs text-muted-foreground" htmlFor="due-before">
            Teslim tarihi şundan önce
          </label>
          <Input
            id="due-before"
            type="date"
            value={value.dueBefore}
            onChange={(event) => update({ dueBefore: event.target.value })}
            className="w-40"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Switch
          id="only-overdue"
          checked={value.onlyOverdue}
          onCheckedChange={(checked) => update({ onlyOverdue: checked })}
        />
        <label htmlFor="only-overdue" className="text-sm text-foreground">
          Yalnızca geciken görevler
        </label>
      </div>
    </div>
  );
}
