import { describe, expect, it } from 'vitest';

import { ProjectStatus, TaskPriority } from '@/types/enums';

import { loginSchema, registerSchema } from './auth';
import { projectFormSchema } from './project';
import { buildTaskFormSchema, taskFormSchema } from './task';
import { timeLogFormSchema } from './timeLog';

describe('loginSchema', () => {
  it('geçerli girdiyi kabul eder', () => {
    expect(loginSchema.safeParse({ email: 'pm@heweso.com', password: 'Manager123!' }).success).toBe(
      true,
    );
  });

  it('geçersiz e-posta ve boş şifreyi reddeder', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: '' });

    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.issues.map((issue) => issue.path[0]);
      expect(fields).toContain('email');
      expect(fields).toContain('password');
    }
  });
});

describe('registerSchema', () => {
  const valid = {
    firstName: 'Ali',
    lastName: 'Demir',
    email: 'ali@heweso.com',
    department: 'Engineering',
    password: 'gizli123',
    confirmPassword: 'gizli123',
  };

  it('geçerli kaydı kabul eder', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it('backend kuralı olan 6 karakter alt sınırını uygular', () => {
    const result = registerSchema.safeParse({ ...valid, password: '12345', confirmPassword: '12345' });
    expect(result.success).toBe(false);
  });

  it('şifre tekrarı uyuşmazsa hatayı confirmPassword alanına yazar', () => {
    const result = registerSchema.safeParse({ ...valid, confirmPassword: 'baska' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['confirmPassword']);
    }
  });

  it('50 karakteri aşan adı reddeder (FluentValidation ile aynı sınır)', () => {
    expect(registerSchema.safeParse({ ...valid, firstName: 'a'.repeat(51) }).success).toBe(false);
  });
});

describe('projectFormSchema', () => {
  const valid = {
    name: 'Yeni proje',
    description: '',
    startDate: '2026-08-01',
    endDate: '2026-09-01',
    status: String(ProjectStatus.Active),
  };

  it('geçerli projeyi kabul eder', () => {
    expect(projectFormSchema.safeParse(valid).success).toBe(true);
  });

  it('bitiş tarihi boş bırakılabilir', () => {
    expect(projectFormSchema.safeParse({ ...valid, endDate: '' }).success).toBe(true);
  });

  it('bitiş tarihi başlangıçtan önce olamaz', () => {
    const result = projectFormSchema.safeParse({ ...valid, endDate: '2026-07-01' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['endDate']);
    }
  });

  it('boş proje adını ve 200 karakter üstünü reddeder', () => {
    expect(projectFormSchema.safeParse({ ...valid, name: '' }).success).toBe(false);
    expect(projectFormSchema.safeParse({ ...valid, name: 'a'.repeat(201) }).success).toBe(false);
  });

  it('geçersiz durum değerini reddeder', () => {
    expect(projectFormSchema.safeParse({ ...valid, status: '99' }).success).toBe(false);
  });
});

describe('taskFormSchema', () => {
  const valid = {
    title: 'Görev başlığı',
    description: '',
    projectId: '1',
    assignedToUserId: 'none',
    priority: String(TaskPriority.High),
    dueDate: '2026-08-20',
    estimatedHours: '8',
  };

  it('geçerli görevi kabul eder', () => {
    expect(taskFormSchema.safeParse(valid).success).toBe(true);
  });

  it('başlık zorunludur ve 200 karakteri aşamaz', () => {
    expect(taskFormSchema.safeParse({ ...valid, title: '' }).success).toBe(false);
    expect(taskFormSchema.safeParse({ ...valid, title: 'a'.repeat(201) }).success).toBe(false);
  });

  it('proje seçilmeden görev oluşturulamaz', () => {
    expect(taskFormSchema.safeParse({ ...valid, projectId: '' }).success).toBe(false);
  });

  it('negatif tahmini süreyi reddeder, boş bırakılmasına izin verir', () => {
    expect(taskFormSchema.safeParse({ ...valid, estimatedHours: '-2' }).success).toBe(false);
    expect(taskFormSchema.safeParse({ ...valid, estimatedHours: '' }).success).toBe(true);
  });

  it('teslim tarihi projenin başlangıcından önce olamaz', () => {
    const schema = buildTaskFormSchema('2026-08-15');

    expect(schema.safeParse({ ...valid, dueDate: '2026-08-10' }).success).toBe(false);
    expect(schema.safeParse({ ...valid, dueDate: '2026-08-20' }).success).toBe(true);
  });
});

describe('timeLogFormSchema', () => {
  const valid = { hours: '2.5', workDate: '2026-08-04', description: '' };

  it('geçerli kaydı kabul eder', () => {
    expect(timeLogFormSchema.safeParse(valid).success).toBe(true);
  });

  it('sıfır ve negatif süreyi reddeder (backend: Hours > 0)', () => {
    expect(timeLogFormSchema.safeParse({ ...valid, hours: '0' }).success).toBe(false);
    expect(timeLogFormSchema.safeParse({ ...valid, hours: '-1' }).success).toBe(false);
    expect(timeLogFormSchema.safeParse({ ...valid, hours: '' }).success).toBe(false);
  });

  it('500 karakteri aşan açıklamayı reddeder', () => {
    expect(timeLogFormSchema.safeParse({ ...valid, description: 'a'.repeat(501) }).success).toBe(
      false,
    );
  });

  it('çalışma günü zorunludur', () => {
    expect(timeLogFormSchema.safeParse({ ...valid, workDate: '' }).success).toBe(false);
  });
});
