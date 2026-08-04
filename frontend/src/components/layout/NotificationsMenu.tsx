import { Bell } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/**
 * Bildirim menüsü.
 *
 * DURUM: Backend'de bildirim ucu YOK (ne liste, ne okundu işaretleme, ne de
 * push/SSE altyapısı — bkz. FRONTEND_API_GAPS.md #10). Bu yüzden burada sahte
 * bildirim ÜRETİLMİYOR ve okunmamış sayısı rozeti gösterilmiyor; menü yalnızca
 * özelliğin neden boş olduğunu açıklıyor.
 */
export function NotificationsMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Bildirimler">
          <Bell aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Bildirimler</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="px-2 py-3 text-xs leading-relaxed text-muted-foreground">
          <p className="font-medium text-foreground">Henüz bildirim altyapısı yok.</p>
          <p className="mt-1">
            API'de bildirim uçları bulunmadığı için bu alan boş. Görev geçmişi
            değişiklikleri görev detayındaki <span className="font-medium">Geçmiş</span> bölümünden
            takip edilebilir.
          </p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
