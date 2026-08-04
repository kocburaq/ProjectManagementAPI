import { Menu } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';

import { GlobalSearch } from './GlobalSearch';
import { NotificationsMenu } from './NotificationsMenu';
import { Sidebar } from './Sidebar';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

/**
 * Uygulama kabuğu: sol sidebar + üst bar + içerik.
 *
 * Masaüstünde sidebar sabit; `lg` altında çekmece (Sheet) olarak açılır.
 * Rota değiştiğinde çekmece otomatik kapanır.
 */
export function AppLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex min-h-dvh bg-background">
      {/* Klavye kullanıcıları için içeriğe atlama bağlantısı */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground"
      >
        İçeriğe geç
      </a>

      {/* Masaüstü sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-sidebar-border lg:block">
        <div className="fixed inset-y-0 left-0 w-60">
          <Sidebar />
        </div>
      </aside>

      {/* Mobil çekmece */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="p-0">
          <SheetTitle className="sr-only">Gezinme menüsü</SheetTitle>
          <SheetDescription className="sr-only">
            Uygulama bölümleri arasında geçiş yapın.
          </SheetDescription>
          <Sidebar onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Üst bar */}
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/85 px-4 backdrop-blur">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Menüyü aç"
          >
            <Menu aria-hidden="true" />
          </Button>

          <div className="flex-1">
            <GlobalSearch />
          </div>

          <NotificationsMenu />
          <ThemeToggle />
          <UserMenu />
        </header>

        <main id="main-content" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1400px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
