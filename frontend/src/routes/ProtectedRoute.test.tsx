import { render, screen } from '@testing-library/react';
import type { ContextType, ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { AuthContext } from '@/contexts/AuthContext';
import { UserRole } from '@/types/enums';
import type { User } from '@/types/models';

import { ProtectedRoute } from './ProtectedRoute';

type AuthValue = NonNullable<ContextType<typeof AuthContext>>;

const testUser: User = {
  id: 3,
  firstName: 'Ali',
  lastName: 'Demir',
  email: 'dev1@heweso.com',
  role: UserRole.TeamMember,
  department: 'Engineering',
  isActive: true,
  createdAt: '2026-08-04T06:47:02.857127',
  updatedAt: null,
};

function buildAuthValue(overrides: Partial<AuthValue>): AuthValue {
  return {
    user: null,
    status: 'unauthenticated',
    isAuthenticated: false,
    sessionNotice: null,
    clearSessionNotice: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    updateCurrentUser: vi.fn(),
    ...overrides,
  } as AuthValue;
}

function renderRoutes(auth: AuthValue, children: ReactNode, initialPath = '/dashboard') {
  return render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/login" element={<p>Giriş ekranı</p>} />
          <Route path="/unauthorized" element={<p>Yetkisiz sayfa</p>} />
          {children}
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('ProtectedRoute', () => {
  it('oturum durumu çözülürken yükleniyor gösterir', () => {
    renderRoutes(
      buildAuthValue({ status: 'loading' }),
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<p>Panel içeriği</p>} />
      </Route>,
    );

    expect(screen.getByText('Oturum bilgisi kontrol ediliyor')).toBeInTheDocument();
    expect(screen.queryByText('Panel içeriği')).not.toBeInTheDocument();
  });

  it('oturum yoksa login sayfasına yönlendirir', () => {
    renderRoutes(
      buildAuthValue({ status: 'unauthenticated' }),
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<p>Panel içeriği</p>} />
      </Route>,
    );

    expect(screen.getByText('Giriş ekranı')).toBeInTheDocument();
    expect(screen.queryByText('Panel içeriği')).not.toBeInTheDocument();
  });

  it('oturum varsa korunan içeriği gösterir', () => {
    renderRoutes(
      buildAuthValue({ status: 'authenticated', user: testUser, isAuthenticated: true }),
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<p>Panel içeriği</p>} />
      </Route>,
    );

    expect(screen.getByText('Panel içeriği')).toBeInTheDocument();
  });

  it('rol yetmiyorsa yetkisiz sayfasına yönlendirir', () => {
    // GET /api/users yalnızca Admin ve ProjectManager'a açık; TeamMember Ekip sayfasını göremez.
    renderRoutes(
      buildAuthValue({ status: 'authenticated', user: testUser, isAuthenticated: true }),
      <Route element={<ProtectedRoute allowedRoles={[UserRole.Admin, UserRole.ProjectManager]} />}>
        <Route path="/team" element={<p>Ekip içeriği</p>} />
      </Route>,
      '/team',
    );

    expect(screen.getByText('Yetkisiz sayfa')).toBeInTheDocument();
    expect(screen.queryByText('Ekip içeriği')).not.toBeInTheDocument();
  });

  it('izin verilen rolde içeriği gösterir', () => {
    renderRoutes(
      buildAuthValue({
        status: 'authenticated',
        user: { ...testUser, role: UserRole.ProjectManager },
        isAuthenticated: true,
      }),
      <Route element={<ProtectedRoute allowedRoles={[UserRole.Admin, UserRole.ProjectManager]} />}>
        <Route path="/team" element={<p>Ekip içeriği</p>} />
      </Route>,
      '/team',
    );

    expect(screen.getByText('Ekip içeriği')).toBeInTheDocument();
  });
});
