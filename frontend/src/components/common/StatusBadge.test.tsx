import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ProjectStatus, TaskPriority, TaskStatus } from '@/types/enums';

import { OverdueBadge, PriorityBadge, ProjectStatusBadge, TaskStatusBadge } from './StatusBadge';

describe('TaskStatusBadge', () => {
  it('backend enum değerini Türkçe etikete çevirir', () => {
    render(<TaskStatusBadge status={TaskStatus.InProgress} />);
    expect(screen.getByText('Devam Ediyor')).toBeInTheDocument();
  });

  it('her durum için metin gösterir (anlam yalnızca renge bağlı değil)', () => {
    const { rerender } = render(<TaskStatusBadge status={TaskStatus.Todo} />);
    expect(screen.getByText('Yapılacak')).toBeInTheDocument();

    rerender(<TaskStatusBadge status={TaskStatus.InReview} />);
    expect(screen.getByText('İncelemede')).toBeInTheDocument();

    rerender(<TaskStatusBadge status={TaskStatus.Done} />);
    expect(screen.getByText('Tamamlandı')).toBeInTheDocument();
  });
});

describe('ProjectStatusBadge', () => {
  it('proje durumunu etiketler', () => {
    render(<ProjectStatusBadge status={ProjectStatus.OnHold} />);
    expect(screen.getByText('Beklemede')).toBeInTheDocument();
  });
});

describe('PriorityBadge', () => {
  it('öncelik etiketini gösterir', () => {
    render(<PriorityBadge priority={TaskPriority.Critical} />);
    expect(screen.getByText('Kritik')).toBeInTheDocument();
  });
});

describe('OverdueBadge', () => {
  it('gecikme metnini gösterir', () => {
    render(<OverdueBadge label="3 gün gecikti" />);
    expect(screen.getByText('3 gün gecikti')).toBeInTheDocument();
  });
});
