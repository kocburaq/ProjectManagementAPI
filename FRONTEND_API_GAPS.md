# Frontend için Eksik API Uçları

Bu dosya, `frontend/` altındaki React arayüzünü geliştirirken **backend'de karşılığı
bulunmayan** işlemleri listeler. Amaç bir istek listesi sunmak değil; arayüzde neyin
neden yapılamadığını ve hangi alanların hangi geçici çözümle doldurulduğunu kayıt altına
almaktır.

**Uygulanan kural:** Backend'de bulunmayan hiçbir uç varmış gibi çağrılmadı, hiçbir ekran
sahte veriyle doldurulmadı. Karşılığı olmayan işlemlerin butonları arayüzde **hiç
render edilmiyor**; kısmi/istemci tarafı hesaplanan alanlarda ise kullanıcıya ekranda
uyarı gösteriliyor.

Backend'de **hiçbir değişiklik yapılmadı** — mevcut uçlar frontend'in çalışması için yeterliydi.

---

## Özet tablo

| # | Eksik özellik | Şu anki durum |
|---|---|---|
| 1 | Refresh token | Token süresi dolunca kullanıcı login'e düşer |
| 2 | `GET /api/auth/me` | Kullanıcı login yanıtından `localStorage`'a yazılır |
| 3 | Zaman kaydı güncelleme/silme + timer | Butonlar hiç gösterilmiyor |
| 4 | Metin araması (`search`) | Arama yalnızca yüklü sayfada, uyarı ile |
| 5 | İstatistik/özet uçları | `totalCount` üzerinden sayım yapılıyor |
| 6 | Görev DTO'sunda yorum sayısı | Sayaç yerine "yorumları aç" butonu |
| 7 | Proje/global aktivite akışı | Görev geçmişleri birleştiriliyor, kapsam yazılı |
| 8 | Zaman kaydında proje filtresi ve toplam | İstemcide süzülüp toplanıyor, uyarı ile |
| 9 | Kullanıcı oluşturma / silme | Arayüzde bu işlemler yok |
| 10 | Bildirimler | Menü boş, nedeni yazılı, rozet yok |
| 11 | Görevde başlangıç tarihi | Alan gösterilmiyor |
| 12 | Kullanıcı bazlı istatistik | Erişilebilir kayıtlardan hesaplanıyor, uyarı ile |
| 13 | Kendi profilini güncelleme / şifre değiştirme | Admin dışında form salt okunur |
| 14 | "Geciken görev" birleşik filtresi | 3 sayım isteği / istemci süzmesi |

---

## 1. Refresh token

**Eksik özellik:** Access token'ın ömrü dolduğunda oturumu sessizce yenilemek.

**Gerekli endpoint:** `/api/auth/refresh`
**Önerilen HTTP metodu:** `POST`

**Önerilen request modeli**
```csharp
public class RefreshTokenRequestDto
{
    public string RefreshToken { get; set; } = string.Empty;
}
```

**Önerilen response modeli** — mevcut `AuthResponseDto` ile aynı, ek olarak:
```csharp
public class AuthResponseDto
{
    public string AccessToken { get; set; }
    public string RefreshToken { get; set; }   // YENİ
    public DateTime ExpiresAt { get; set; }
    public UserResponseDto User { get; set; }
}
```

**Frontend'de nerede kullanılacağı:** `src/api/client.ts` yanıt interceptor'ı. 401 alındığında
istek kuyruğa alınıp token yenilenir ve istek tekrarlanır.

**Şu anki davranış:** Token süresi dolduğunda kullanıcı bilgilendirici bir mesajla login
ekranına düşürülür (`src/contexts/AuthContext.tsx`). `Jwt:AccessTokenMinutes` varsayılan
60 dakika olduğu için pratikte sorun yaratmıyor.

---

## 2. Oturum sahibini döndüren uç (`/api/auth/me`)

**Eksik özellik:** Elde yalnızca token varken kullanıcı bilgisini (id, ad, rol) doğrulayarak almak.

**Gerekli endpoint:** `/api/auth/me`
**Önerilen HTTP metodu:** `GET`

**Önerilen request modeli:** yok (yalnızca `Authorization` header'ı).

**Önerilen response modeli:** mevcut `UserResponseDto`.

**Frontend'de nerede kullanılacağı:** `src/contexts/AuthContext.tsx` → `bootstrap()`.

**Şu anki davranış:** Kullanıcı nesnesi login/register yanıtından alınıp `localStorage`'a
yazılıyor; sayfa yenilendiğinde geri okunuyor ve token'ın hâlâ geçerli olduğu
`GET /api/projects?page=1&pageSize=1` çağrısıyla doğrulanıyor (her rolün erişebildiği en
ucuz korumalı uç). Bu, "kullanıcı bilgisi bayatlarsa" riski taşıyor: bir yönetici
kullanıcının rolünü değiştirirse arayüz, kullanıcı yeniden giriş yapana kadar eski rolü
gösterir (gerçek yetki kontrolü yine backend'de olduğu için güvenlik açığı değil).

---

## 3. Zaman kaydı güncelleme / silme (ve başlat–durdur sayacı)

**Eksik özellik:** Girilen bir zaman kaydını düzeltmek veya silmek; çalışan bir timer.

**Gerekli endpoint'ler:**
- `/api/time-logs/{id}` — `PUT`
- `/api/time-logs/{id}` — `DELETE`

**Önerilen request modeli (PUT)**
```csharp
public class UpdateTaskTimeLogDto
{
    public decimal Hours { get; set; }        // > 0
    public string? Description { get; set; }  // max 500
    public DateTime WorkDate { get; set; }
}
```

**Önerilen response modeli:** mevcut `TaskTimeLogResponseDto` (DELETE için `204 No Content`).

**Yetki önerisi:** kaydı giren kullanıcı, proje sahibi veya Admin.

**Frontend'de nerede kullanılacağı:**
- `src/pages/TimeLogsPage.tsx` — tablo satırlarındaki işlem menüsü
- `src/components/time-logs/TaskTimeLogSection.tsx` — görev detayındaki kayıt listesi

**Şu anki davranış:** Düzenle/sil butonları **hiç render edilmiyor**; her iki ekranda da
"API'de güncelleme/silme ucu bulunmuyor" notu görünüyor.

**Timer notu:** `TaskTimeLog` entity'si `Hours` (decimal) + `WorkDate` tutuyor; başlangıç ve
bitiş zamanı alanı yok. Bu yüzden çalışan bir "başlat/durdur" sayacı **yapılmadı** — sahte
bir timer göstermek yerine manuel süre girişi kullanıldı. Timer isteniyorsa entity'ye
`StartedAt`/`EndedAt` alanları ve `POST /api/tasks/{taskId}/time-logs/start` ile
`POST /api/time-logs/{id}/stop` uçları gerekir.

---

## 4. Metin araması

**Eksik özellik:** Proje adı ve görev başlığında sunucu tarafı arama.

**Gerekli endpoint'ler:** mevcut listeleme uçlarına parametre eklenmesi
- `GET /api/projects?search=...`
- `GET /api/tasks?search=...`

**Önerilen request modeli:** `ProjectQueryParameters` ve `TaskQueryParameters` içine
```csharp
public string? Search { get; set; }   // Name/Title (+ Description) üzerinde Contains
```

**Önerilen response modeli:** değişiklik yok (`PagedResult<T>`).

**Frontend'de nerede kullanılacağı:**
- `src/components/layout/GlobalSearch.tsx` (⌘K paleti)
- `src/pages/ProjectsPage.tsx` arama kutusu
- `src/components/tasks/TaskFilters.tsx` arama kutusu

**Şu anki davranış:** Arama yalnızca **görüntülenen sayfadaki** kayıtlar üzerinde çalışıyor
ve her üç ekranda da kullanıcıya bunun neden böyle olduğu yazılı olarak bildiriliyor.
Global arama, projeleri sayfalayarak topluyor (küçük veri kümesi için kabul edilebilir);
görevlerde bu yapılmıyor çünkü ölçeklenmez.

---

## 5. Panel / rapor istatistik uçları

**Eksik özellik:** Sayaçların ve proje ilerlemesinin tek istekte alınması.

**Gerekli endpoint'ler:**
- `/api/stats/workspace` — `GET`
- `/api/projects/{id}/stats` — `GET`
- ya da daha ucuzu: `ProjectResponseDto` içine `TaskCount` / `CompletedTaskCount` alanları

**Önerilen response modelleri**
```csharp
public class WorkspaceStatsDto
{
    public int TotalProjects { get; set; }
    public int ActiveProjects { get; set; }
    public int TotalTasks { get; set; }
    public int TodoTasks { get; set; }
    public int InProgressTasks { get; set; }
    public int InReviewTasks { get; set; }
    public int CompletedTasks { get; set; }
    public int OverdueTasks { get; set; }        // DueDate < now && Status != Done
    public decimal HoursLoggedThisWeek { get; set; }
}

public class ProjectStatsDto
{
    public int ProjectId { get; set; }
    public int TotalTasks { get; set; }
    public int CompletedTasks { get; set; }
    public decimal TotalHours { get; set; }
}
```

**Frontend'de nerede kullanılacağı:** `src/services/statsService.ts`,
`src/pages/DashboardPage.tsx`, `src/components/projects/ProjectCard.tsx`,
`src/pages/ProjectDetailPage.tsx`.

**Şu anki davranış — performans notu:** Tüm kayıtları indirip saymak yerine, listeleme
uçlarına `pageSize=1` gönderilip yalnızca `totalCount` okunuyor. Yani panel sayaçları için
**tek bir görev kaydı bile indirilmiyor**; maliyet birkaç `COUNT` sorgusu kadar. Buna
rağmen bu bir geçici çözüm: panel açılışında ~10 istek, proje listesinde kart başına 2
istek atılıyor. Yukarıdaki uçlar eklenirse bu 1-2 isteğe iner.

**Ölçeklenmediği için yapılmayanlar:** "Haftalık tamamlanan görev" ve "proje/kullanıcı
bazında harcanan süre" grafikleri, kayıtların indirilmesini gerektirdiği için sayfa
sınırıyla (en fazla 5×100 kayıt) çalışıyor; sınıra ulaşıldığında ekranda "kısmi veri"
uyarısı gösteriliyor. Doğru çözüm sunucu tarafı gruplama uçlarıdır:
`GET /api/reports/tasks-completed?from=&to=&groupBy=day`,
`GET /api/reports/hours?groupBy=project|user&from=&to=`.

---

## 6. Görev DTO'sunda yorum sayısı

**Eksik özellik:** Görev listesinde/kanban kartında yorum sayısını göstermek.

**Gerekli endpoint:** yeni uç gerekmiyor; `TaskResponseDto` içine alan eklenmesi yeterli.

**Önerilen response modeli**
```csharp
public class TaskResponseDto
{
    // ...mevcut alanlar
    public int CommentCount { get; set; }   // YENİ
}
```

**Frontend'de nerede kullanılacağı:** `src/components/tasks/TaskTable.tsx` ("Yorumlar"
sütunu) ve `src/components/tasks/KanbanCard.tsx`.

**Şu anki davranış:** Sahte bir sayaç göstermek yerine, tabloda görev detayının yorumlar
sekmesini açan bir buton var. Görev başına ayrı bir `GET .../comments` isteği atmak
(N+1) bilinçli olarak tercih edilmedi.

---

## 7. Proje / çalışma alanı aktivite akışı

**Eksik özellik:** "Son aktiviteler" akışı.

**Gerekli endpoint'ler:**
- `/api/projects/{id}/activity` — `GET`
- `/api/activity` — `GET` (çalışma alanı geneli, panel için)

**Önerilen response modeli**
```csharp
public class ActivityResponseDto
{
    public int Id { get; set; }
    public string EntityType { get; set; }   // "Task" | "Project" | "Comment" | "TimeLog"
    public int EntityId { get; set; }
    public string EntityTitle { get; set; }
    public int ProjectId { get; set; }
    public int ActorUserId { get; set; }
    public string ActorUserName { get; set; }
    public string Action { get; set; }       // "Created" | "StatusChanged" | "Commented" ...
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
    public DateTime CreatedAt { get; set; }
}
```
Dönüş `PagedResult<ActivityResponseDto>` olmalı.

**Frontend'de nerede kullanılacağı:** `src/components/projects/ProjectActivity.tsx`
(proje detayı → Aktivite sekmesi) ve panelde "Son aktiviteler" kartı.

**Şu anki davranış:** Backend'de aktiviteye en yakın kaynak `GET /api/tasks/{taskId}/histories`
— yani **görev bazında**. Proje aktivitesi, projenin en son güncellenen 12 görevinin
geçmişleri birleştirilerek üretiliyor ve bu kapsam sınırı ekranda yazılı olarak
belirtiliyor. Panelde "Son aktiviteler" kartı **hiç eklenmedi**, çünkü çalışma alanı
genelinde bunu üretmek makul sayıda istekle mümkün değil.

Not: `TaskHistory` yalnızca durum / atanan kişi / öncelik değişimlerini kaydediyor;
görev oluşturma, yorum ve zaman kaydı olayları geçmişe düşmüyor.

---

## 8. Zaman kayıtlarında proje filtresi ve toplam süre

**Eksik özellik:** Zaman kayıtlarını projeye göre süzmek ve toplam süreyi sunucudan almak.

**Gerekli endpoint:** mevcut `GET /api/time-logs` üzerine parametre + özet
- `GET /api/time-logs?projectId=...`
- `GET /api/time-logs/summary?from=&to=&groupBy=project|user|day`

**Önerilen request modeli:** `TaskTimeLogQueryParameters` içine
```csharp
public int? ProjectId { get; set; }
```

**Önerilen response modeli (summary)**
```csharp
public class TimeLogSummaryDto
{
    public string GroupKey { get; set; }     // proje adı / kullanıcı adı / gün
    public int GroupId { get; set; }
    public decimal TotalHours { get; set; }
    public int EntryCount { get; set; }
}
```

**Frontend'de nerede kullanılacağı:** `src/pages/TimeLogsPage.tsx` (proje filtresi,
günlük/haftalık/proje toplamları) ve `src/pages/ReportsPage.tsx`.

**Şu anki davranış:** Proje filtresi, projenin görev id'leri üzerinden istemcide
uygulanıyor; toplamlar indirilen kayıtlardan hesaplanıyor. Her iki durum da ekranda
belirtiliyor.

---

## 9. Kullanıcı oluşturma ve silme

**Eksik özellik:** Yöneticinin panelden kullanıcı açması / kaldırması.

**Gerekli endpoint'ler:**
- `/api/users` — `POST` (Admin)
- `/api/users/{id}` — `DELETE` (Admin, soft delete)

**Önerilen request modeli (POST)**
```csharp
public class CreateUserDto
{
    public string FirstName { get; set; }
    public string LastName { get; set; }
    public string Email { get; set; }
    public string Password { get; set; }
    public string? Department { get; set; }
    public UserRole Role { get; set; }
}
```

**Önerilen response modeli:** `UserResponseDto` (DELETE için `204 No Content`).

**Frontend'de nerede kullanılacağı:** `src/pages/TeamPage.tsx`.

**Şu anki davranış:** Ekip sayfasında "Kullanıcı ekle" / "Sil" butonu **yok**; sayfanın
üstünde yeni kullanıcıların yalnızca kayıt ekranından oluşabildiği bilgisi veriliyor.
Mevcut `PUT /api/users/{id}` ile rol değiştirme ve hesabı pasifleştirme çalışıyor (Admin).

---

## 10. Bildirimler

**Eksik özellik:** Bildirim listesi, okundu işaretleme, canlı bildirim.

**Gerekli endpoint'ler:**
- `/api/notifications` — `GET` (`PagedResult<NotificationDto>`)
- `/api/notifications/{id}/read` — `PATCH`
- `/api/notifications/read-all` — `POST`
- canlı akış için SignalR hub'ı ya da SSE

**Önerilen response modeli**
```csharp
public class NotificationDto
{
    public int Id { get; set; }
    public string Type { get; set; }        // "TaskAssigned" | "CommentAdded" | "DueSoon"
    public string Title { get; set; }
    public string? Body { get; set; }
    public int? TaskId { get; set; }
    public int? ProjectId { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
}
```

**Frontend'de nerede kullanılacağı:** `src/components/layout/NotificationsMenu.tsx`.

**Şu anki davranış:** Zil ikonu var (tasarım gereği), açıldığında **sahte bildirim
göstermiyor**; altyapının bulunmadığını açıklayan bir metin gösteriyor. Okunmamış sayısı
rozeti de bilinçli olarak eklenmedi.

---

## 11. Görevde başlangıç tarihi

**Eksik özellik:** Görev için başlangıç tarihi (`StartDate`).

**Gerekli değişiklik:** `ProjectTask` entity'sine `StartDate` alanı, `CreateTaskDto` /
`UpdateTaskDto` / `TaskResponseDto` içine karşılığı ve bir migration.

**Frontend'de nerede kullanılacağı:** `src/components/tasks/TaskDetailDrawer.tsx` (detay
listesi) ve `src/components/tasks/TaskFormDialog.tsx`.

**Şu anki davranış:** Backend yalnızca `DueDate` tuttuğu için arayüzde başlangıç tarihi
alanı **hiç gösterilmiyor**. Gantt benzeri bir görünüm de bu yüzden yapılmadı.

---

## 12. Kullanıcı bazlı iş yükü istatistikleri

**Eksik özellik:** Ekip sayfasındaki kullanıcı başına açık/tamamlanan görev, dahil olunan
proje sayısı ve toplam süre.

**Gerekli endpoint:** `/api/users/{id}/stats` — `GET` (ya da `/api/users?includeStats=true`)

**Önerilen response modeli**
```csharp
public class UserStatsDto
{
    public int UserId { get; set; }
    public int OpenTasks { get; set; }
    public int CompletedTasks { get; set; }
    public int ProjectCount { get; set; }
    public decimal TotalHours { get; set; }
}
```

**Frontend'de nerede kullanılacağı:** `src/pages/TeamPage.tsx` tablo sütunları.

**Şu anki davranış:** Değerler, oturum sahibinin erişebildiği görev ve zaman kayıtlarından
istemcide hesaplanıyor. Bu yüzden bir ProjectManager, kendi projelerinde olmayan iş yükünü
göremez; tablonun altında bu sınır yazılı olarak belirtiliyor.

---

## 13. Kendi profilini güncelleme ve şifre değiştirme

**Eksik özellik:** Kullanıcının kendi ad/soyad/departman bilgisini güncellemesi ve şifresini
değiştirmesi.

**Gerekli endpoint'ler:**
- `/api/users/me` — `PUT`
- `/api/users/me/password` — `PUT`

**Önerilen request modelleri**
```csharp
public class UpdateProfileDto
{
    public string FirstName { get; set; }   // NotEmpty, max 50
    public string LastName { get; set; }    // NotEmpty, max 50
    public string? Department { get; set; } // max 100
}

public class ChangePasswordDto
{
    public string CurrentPassword { get; set; }
    public string NewPassword { get; set; }  // min 6
}
```

**Önerilen response modeli:** `UserResponseDto` (şifre için `204 No Content`).

**Frontend'de nerede kullanılacağı:** `src/pages/ProfilePage.tsx`.

**Şu anki davranış:** Tek güncelleme ucu `PUT /api/users/{id}` ve o da
`[Authorize(Roles = "Admin")]` ile korunuyor. Bu yüzden:
- **Admin** kendi profilini gerçekten güncelleyebiliyor (rol ve aktiflik alanları
  değiştirilmeden, mevcut değerleriyle gönderiliyor).
- **Diğer roller** için form salt okunur gösteriliyor ve nedeni açıklanıyor — çalışmayan
  bir "Kaydet" butonu konulmadı.
- Şifre bölümü hiç eklenmedi.

---

## 14. "Geciken görev" için birleşik filtre

**Eksik özellik:** Tek istekte "teslim tarihi geçmiş **ve** tamamlanmamış" görevleri almak.
`TaskQueryParameters` `Status` alanını tek değer olarak alıyor; "Done olmayanlar" denemiyor.

**Gerekli değişiklik:** `TaskQueryParameters` içine
```csharp
public bool? IsOverdue { get; set; }             // DueDate < UtcNow && Status != Done
public ProjectTaskStatus[]? Statuses { get; set; } // çoklu durum filtresi
```

**Frontend'de nerede kullanılacağı:** `src/services/statsService.ts` (panel "Geciken görev"
sayacı), `src/pages/TasksPage.tsx` ("yalnızca gecikenler" anahtarı).

**Şu anki davranış:** Panel sayacı için açık durumların her biri ayrı ayrı sayılıp
toplanıyor (3 adet `totalCount` isteği — kayıt indirilmiyor). Tablodaki "yalnızca
gecikenler" anahtarı ise görüntülenen sayfa üzerinde istemcide süzüyor ve bu durum
kullanıcıya bildiriliyor.

---

## Sınır olmayan, bilgi amaçlı notlar

Bunlar eksiklik değil; arayüzün neden öyle davrandığını açıklar.

- **Görev durumu ayrı bir uçtan değişiyor.** `UpdateTaskDto` içinde `Status` yok; durum
  yalnızca `PATCH /api/tasks/{id}/status` ile değişiyor. Arayüz de düzenleme formunda
  durum alanı göstermiyor, ayrı bir durum seçici ve Kanban sürükle-bırak kullanıyor.
  Aynı duruma geçiş backend'de `400` döndüğü için istemci bu isteği hiç göndermiyor.
- **Görevin projesi değiştirilemiyor.** `UpdateTaskDto` içinde `ProjectId` yok; düzenleme
  formunda proje alanı kilitli.
- **Aynı anda tek oturum.** Bir hesabın canlı oturumu varken ikinci giriş `409` +
  `SESSION_ALREADY_ACTIVE` döndürüyor; devralınan oturumlar `401` + `SESSION_REVOKED`
  alıyor. Arayüz bu iki kodu ayrı ayrı ele alıp kullanıcıya anlaşılır mesaj gösteriyor.
  Aynı hesapla hem eski `wwwroot` panelinde hem yeni arayüzde çalışılamaz — bu backend'in
  bilinçli bir kuralı.
- **Enum'lar sayı olarak taşınıyor.** `Program.cs` içinde `JsonStringEnumConverter` kayıtlı
  olmadığı için `role`, `status`, `priority` alanları JSON'da sayıdır. Frontend tipleri
  (`src/types/enums.ts`) buna göre yazıldı.
- **Tarihler `Z` eki olmadan geliyor.** Veritabanından okunan `DateTime` değerleri
  `Kind=Unspecified` olduğu için JSON'a saat dilimi eki olmadan çıkıyor, ama değerler UTC.
  Frontend `parseApiDate` ile bunları UTC kabul ediyor (`src/utils/date.ts`); aksi halde
  tarayıcı saat dilimi kadar kayma olurdu.
- **Hata gövdeleri iki farklı biçimde geliyor.** Middleware/`OnChallenge` PascalCase
  (`{Message, StatusCode, Code}`), FluentValidation ise camelCase ProblemDetails
  (`{title, status, errors}`) döndürüyor. `src/utils/errors.ts` ikisini tek biçime indiriyor.
- **`pageSize` üst sınırı 100.** Toplu veri çeken yerlerde sayfalar dolaşılıyor ama üst
  sınır konuldu; sınıra ulaşıldığında ekranda "kısmi veri" uyarısı çıkıyor.
- **Üye çıkarma kalıcı silme değil.** `DELETE /api/projects/{id}/members/{memberId}`
  üyeliği pasifleştiriyor; arayüz de "Pasif" rozetiyle bunu dürüstçe gösteriyor.
