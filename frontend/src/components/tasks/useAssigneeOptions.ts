import { useMemo } from 'react';

import { useProject, useProjectMembers } from '@/hooks/queries/useProjects';

export interface AssigneeOption {
  userId: number;
  name: string;
  hint?: string;
}

/**
 * Bir göreve atanabilecek kullanıcılar.
 *
 * Backend kuralı (`TaskService.EnsureActiveMemberAsync`): atanan kişi projenin
 * AKTİF ÜYESİ ya da PROJE SAHİBİ olmalıdır. Bu yüzden liste tüm kullanıcılardan
 * değil, projenin üyelerinden + sahibinden üretilir; aksi halde kullanıcı geçersiz
 * bir seçim yapıp 400 hatası alırdı.
 */
export function useAssigneeOptions(projectId: number | undefined) {
  const projectQuery = useProject(projectId);
  const membersQuery = useProjectMembers(projectId);

  const options = useMemo<AssigneeOption[]>(() => {
    const result: AssigneeOption[] = [];

    if (projectQuery.data) {
      result.push({
        userId: projectQuery.data.ownerId,
        name: projectQuery.data.ownerName,
        hint: 'Proje sahibi',
      });
    }

    for (const member of membersQuery.data?.items ?? []) {
      if (!member.isActive) continue;
      if (result.some((option) => option.userId === member.userId)) continue;
      result.push({ userId: member.userId, name: member.userName });
    }

    return result;
  }, [projectQuery.data, membersQuery.data]);

  return {
    options,
    /** Seçili proje — "teslim tarihi başlangıçtan önce olamaz" kuralı için gerekli. */
    project: projectQuery.data,
    isLoading: projectQuery.isLoading || membersQuery.isLoading,
    isError: projectQuery.isError || membersQuery.isError,
  };
}
