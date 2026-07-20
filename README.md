# Project Management API

Heweso staj programı kapsamında geliştirdiğim proje/görev yönetim sistemi. ASP.NET Core Web API +
EF Core (SQLite) ile yazıldı; JWT ile kimlik doğrulama, rol bazlı yetkilendirme, Repository + Service
katmanları, FluentValidation ve Swagger var. Bonus olarak API ile aynı süreçten servis edilen basit
bir HTML/CSS/JS panel de ekledim (`wwwroot/`). Gereksinimler `Proje_Yonetim_Sistemi_Staj_Projesi_v1.2.pdf`
dosyasında.

## Kullanılanlar

- .NET 10 / ASP.NET Core Web API
- Entity Framework Core (SQLite)
- JWT Bearer Authentication
- `Microsoft.AspNetCore.Identity.PasswordHasher<User>` (parolalar PBKDF2 ile hashleniyor, düz metin hiçbir yerde yok)
- FluentValidation + `SharpGrip.FluentValidation.AutoValidation.Mvc` (otomatik model doğrulama)
- Swashbuckle / Swagger

## Klasör yapısı

```
Controllers/   -> thin controller, request/response koordinasyonu + [Authorize]
Services/      -> iş kuralları burada (tarih/saat kısıtları, atama-üyelik kontrolü,
                   CompletedAt/TaskHistories kuralları, yorum yetkisi vb.)
Repositories/  -> IUnitOfWork + entity başına repository
Dtos/          -> Create/Update/Response için ayrı DTO'lar, entity API'den hiç dönmüyor
Validators/    -> FluentValidation
Middleware/    -> global exception handling
Security/      -> JWT üretimi/ayarları
Entities/      -> EF Core entity modelleri (soft delete alanları dahil)
Migrations/    -> EF Core migration'ları
Data/          -> AppDbContext + DataSeeder
wwwroot/       -> bonus frontend paneli
```

## Çalıştırma

```bash
dotnet restore
dotnet run
```

İlk çalıştırmada `Database.MigrateAsync()` migration'ları uyguluyor (SQLite dosyası proje kökünde
`projectmanagement.db` olarak oluşuyor) ve veritabanı boşsa `Data/DataSeeder.cs` seed verisini ekliyor.

Migration'ları elle çalıştırmak istersen:

```bash
dotnet tool install --global dotnet-ef
dotnet ef database update
```

Swagger: `http://localhost:5044/swagger`

## Test kullanıcıları

| Rol | E-posta | Şifre |
|---|---|---|
| Admin | admin@heweso.com | Admin123! |
| ProjectManager | pm@heweso.com | Manager123! |
| TeamMember | dev1@heweso.com | Member123! |
| TeamMember | dev2@heweso.com | Member123! |

Seed'de `pm@heweso.com` sahipliğinde bir proje, iki görev, bir yorum, bir zaman kaydı ve bir
TaskHistory kaydı geliyor.

Swagger'da test etmek için: `/api/auth/login` ile giriş yapıp dönen `accessToken`'ı kopyala, sağ
üstteki **Authorize** butonuna `Bearer <token>` şeklinde yapıştır.

## Frontend paneli

`dotnet run` sonrası `http://localhost:5044/` adresinden, framework kullanmadan yazdığım bir panel
açılıyor (`app.UseStaticFiles()` ile `wwwroot/`'tan servis ediliyor). API ile aynı origin'de
çalıştığı için ayrı bir build adımına ya da CORS ayarına gerek kalmadı, Node de gerekmiyor — sade
`<script type="module">` ile ES module'ler kullandım, hash tabanlı basit bir router yazdım
(`js/router.js`) ve JWT'yi `localStorage`'da tutup her istekte `Authorization` header'ına ekleyen
bir fetch sarmalayıcım var (`js/api.js`).

Panelde şunlar var: giriş/kayıt, proje listesi (filtre + sıralama + sayfalama) ve oluşturma, proje
detayında düzenleme/arşivleme/silme/ekip üyesi yönetimi, görev listesi ve oluşturma, görev detayında
düzenleme/silme/durum değiştirme/yorumlar/zaman kayıtları/geçmiş, ve Admin için kullanıcı yönetimi.
Butonlar backend'deki yetki kurallarına göre gösteriliyor/gizleniyor (ör. "Düzenle" sadece proje
sahibine ya da Admin'e görünüyor) ama gerçek kontrol her zaman backend'de — frontend tarafı sadece
UX için.

Bunun için tek şey değiştirdim backend'de: `GET /api/users`'ı Admin'in yanında ProjectManager'a da
açtım, çünkü PM ekibine üye eklerken veya göreve birini atarken kullanıcı seçebilmesi lazım, yoksa
panelde kullanıcıyı ID'sini bilmeden seçemiyordu. Dokümanda zaten bu endpoint için "Admin erişimi
önerilir" yazıyor, zorunlu demiyor. Güncelleme (`PUT /api/users/{id}`) yine sadece Admin'de.

## Roller

- **Admin** — her şeye erişir, kullanıcı aktif/pasif durumunu ve rolünü değiştirebilir.
- **ProjectManager** — sadece kendi sahibi olduğu projeleri yönetir, ekip üyesi ekler/çıkarır, görev açar ve atar.
- **TeamMember** — üyesi olduğu projeleri ve kendine atanan görevleri görür, yorum yazabilir, zaman kaydı girebilir, atandığı görevin durumunu değiştirebilir.

Public `/api/auth/register` her zaman TeamMember oluşturuyor — kayıt sırasında kendine Admin/PM rolü
seçebilmek güvenlik açığı olurdu, o yüzden rol yükseltmeyi bilinçli olarak sadece Admin'in
`PUT /api/users/{id}` çağrısına bıraktım.

## İş kuralları

- `AssignedToUserId`, projenin aktif üyesi (ya da sahibi) değilse görev oluşturma/güncelleme reddediliyor.
- `DueDate` proje `StartDate`'inden önce olamıyor, `EndDate` de `StartDate`'ten önce olamıyor.
- Görev `Done` olunca `CompletedAt` set ediliyor, geri alınırsa temizleniyor.
- Durum/atanan kişi/öncelik değişince `TaskHistories`'e otomatik kayıt düşüyor.
- Görevin gerçekleşen süresi (`ActualHours`) ayrı bir kolonda tutulmuyor, `TaskTimeLogs` toplamından hesaplanıyor.
- Yoruma sadece proje üyesi/sahibi yazabiliyor; düzenleme/silme sadece yazan kişide ya da Admin'de.
- `Viewer` rolündeki proje üyeleri salt okunur — yorum yazamaz, zaman kaydı giremez, atandıkları görevin durumunu değiştiremez (Admin/proje sahibi bu kısıttan muaf tabii).
- Soft delete: `User`, `Project`, `ProjectTask`, `Comment` üzerinde `IsDeleted` + global query filter var. Proje silinince altındaki görevler de soft-delete oluyor, yorum/zaman kayıtları kalıyor.

## Listeleme / filtreleme / sıralama

Tüm liste endpoint'leri `page` ve `pageSize` alıyor (varsayılan 10, üst sınır 100 — çok büyük
`pageSize` istenirse kırpılıyor).

- `GET /api/projects` → `status`, `ownerId`, `sortBy` (`name`/`startDate`/`status`), `sortDirection`
- `GET /api/tasks` → `projectId`, `assignedToUserId`, `status`, `priority`, `dueBefore`, `dueAfter`, `sortBy` (`dueDate`/`priority`/`status`/`title`), `sortDirection`
- `GET /api/time-logs` → `taskId`, `userId`, `from`, `to`

Admin olmayan kullanıcılarda proje/görev listeleri otomatik olarak "sahibi olduğu veya üyesi olduğu"
kayıtlarla sınırlanıyor, bunu ayrıca filtre olarak eklemeye gerek kalmadı.

## Endpoint'ler

| Modül | Endpoint | Not |
|---|---|---|
| Auth | `POST /api/auth/register` | TeamMember olarak kayıt |
| Auth | `POST /api/auth/login` | JWT üretir |
| Users | `GET /api/users`, `/api/users/{id}` | Admin + ProjectManager |
| Users | `PUT /api/users/{id}` | sadece Admin |
| Projects | `GET/POST /api/projects`, `GET/PUT /api/projects/{id}` | Admin/ProjectManager |
| Projects | `PATCH /api/projects/{id}/archive`, `DELETE /api/projects/{id}` | arşivleme / soft delete |
| ProjectMembers | `GET/POST /api/projects/{projectId}/members`, `DELETE .../{memberId}` | ekip üyeliği |
| Tasks | `GET/POST /api/tasks`, `GET/PUT /api/tasks/{id}` | görev CRUD |
| Tasks | `PATCH /api/tasks/{id}/status`, `DELETE /api/tasks/{id}` | durum / soft delete |
| Comments | `GET/POST /api/tasks/{taskId}/comments`, `PUT/DELETE /api/comments/{id}` | yorumlar |
| TaskHistories | `GET /api/tasks/{taskId}/histories` | görev geçmişi |
| TaskTimeLogs | `GET /api/time-logs`, `POST /api/tasks/{taskId}/time-logs` | zaman kayıtları |

## Dokümanın istemediği ama eklediklerim

- **CORS** — geliştirirken Swagger dışından da (bonus frontend gibi) rahat test edebilmek için açtım, production'da daraltılması lazım.
- **UnitOfWork** — repository'ler tek `AppDbContext` üzerinde çalışıp tek `SaveChangesAsync` ile commit olsun diye (görev durumu değişince `ProjectTask` + `TaskHistory` aynı anda kaydediliyor mesela).
- **`PagedResult<T>` / `PaginationQuery`** — her listeleme endpoint'inde aynı sayfalama kodunu tekrar yazmamak için ortak tipler.

## Eklemediklerim

Docker Compose, unit/integration testler, Serilog, e-posta bildirimleri, CI/CD — bunların hepsi bonus
kapsamında ve zaman yetmedi, önceliği Zorunlu + Orta Seviye kapsama ve frontend paneline verdim.

Not: JWT imzalama anahtarı şu an `appsettings.json`'da düz metin (`Jwt:Key`). Geliştirme için sorun
değil ama gerçek bir production ortamında bunu environment variable ya da secret manager'a taşımak
gerekir.
