# Project Management API

Backend-odaklı bir proje/görev yönetim sistemi. ASP.NET Core Web API + EF Core (SQLite) üzerine JWT
kimlik doğrulama, rol bazlı yetkilendirme, Repository + Service katmanları, FluentValidation ve
Swagger dokümantasyonu ile inşa edilmiştir. (`Proje_Yonetim_Sistemi_Staj_Projesi_v1.2.pdf` teknik
gereksinim dokümanına göre geliştirilmiştir.)

## Teknoloji Yığını

- .NET 10 / ASP.NET Core Web API
- Entity Framework Core (SQLite)
- JWT Bearer Authentication (`Microsoft.AspNetCore.Authentication.JwtBearer`)
- `Microsoft.AspNetCore.Identity.PasswordHasher<User>` (PBKDF2 tabanlı parola hashleme)
- FluentValidation (+ `SharpGrip.FluentValidation.AutoValidation.Mvc` ile otomatik model doğrulama)
- Swashbuckle / Swagger (OpenAPI 3, Bearer güvenlik şeması tanımlı)

## Mimari

```
Controllers/   -> thin controller, sadece request/response koordinasyonu ve [Authorize] kuralları
Services/      -> tüm iş kuralları burada (tarih/saat kısıtları, atama-üyelik kontrolü,
                   CompletedAt/TaskHistories kuralları, yorum yetkisi, vb.)
Repositories/  -> IUnitOfWork + entity başına repository, EF Core DbContext'i sarmalar
Dtos/          -> Create/Update/Response için ayrı DTO'lar (Entity hiçbir zaman API'den dönmez)
Validators/    -> FluentValidation ile DTO seviyesinde doğrulama
Middleware/    -> global exception handling (tutarlı hata formatı)
Security/      -> JWT üretim/ayarları
Entities/      -> EF Core entity modelleri (soft delete alanları dahil)
Migrations/    -> EF Core migration dosyaları
Data/          -> AppDbContext + DataSeeder (ilk çalıştırmada seed veri)
```

## Kurulum ve Çalıştırma

```bash
dotnet restore
dotnet run
```

Uygulama ilk açılışta otomatik olarak:
1. `dotnet ef database update` ile aynı işi yapan `Database.MigrateAsync()` çağrısıyla migration'ları uygular (SQLite dosyası `projectmanagement.db` proje kökünde oluşturulur),
2. Veritabanı boşsa seed verisini (`Data/DataSeeder.cs`) ekler.

Migration'ları elle uygulamak isterseniz:

```bash
dotnet tool install --global dotnet-ef   # ilk kurulumda
dotnet ef database update
```

Swagger UI: `http://localhost:5044/swagger` (Development ortamında).

## Test Kullanıcıları (Seed Data)

| Rol | E-posta | Şifre |
|---|---|---|
| Admin | admin@heweso.com | Admin123! |
| ProjectManager | pm@heweso.com | Manager123! |
| TeamMember | dev1@heweso.com | Member123! |
| TeamMember | dev2@heweso.com | Member123! |

Seed veride `pm@heweso.com` sahipliğinde bir proje, iki görev, bir yorum, bir zaman kaydı ve bir
TaskHistory kaydı bulunur.

### Swagger'da JWT ile test etme

1. `POST /api/auth/login` ile yukarıdaki kullanıcılardan biriyle giriş yapın, dönen `accessToken`'ı kopyalayın.
2. Swagger'ın sağ üstündeki **Authorize** düğmesine `Bearer <token>` biçiminde token'ı girin.
3. Korumalı endpointleri doğrudan Swagger üzerinden çağırabilirsiniz.

## Rol ve Yetki Özeti

- **Admin**: Tüm kullanıcı/proje/görev/üyelik işlemlerini yönetir, kullanıcı aktif/pasif durumunu ve rolünü değiştirebilir.
- **ProjectManager**: Sadece sahibi olduğu projeleri oluşturabilir/güncelleyebilir/arşivleyebilir, ekip üyesi ekleyip çıkarabilir, görev oluşturup atayabilir.
- **TeamMember**: Üyesi olduğu projeleri ve kendisine atanan/erişebildiği görevleri görüntüler; yorum ve zaman kaydı ekleyebilir, atandığı görevin durumunu değiştirebilir.
- Public `POST /api/auth/register` her zaman `TeamMember` rolüyle kullanıcı oluşturur; rol yükseltme yalnızca Admin'in `PUT /api/users/{id}` çağrısıyla yapılabilir (self-service rol seçimi güvenlik açığı olacağından bilinçli olarak kapatılmıştır).

## Öne Çıkan İş Kuralları

- `AssignedToUserId`, ilgili projenin aktif üyesi (veya proje sahibi) değilse görev oluşturma/güncelleme reddedilir.
- `DueDate`, projenin `StartDate` değerinden önce olamaz; `EndDate`, `StartDate`'ten önce olamaz.
- Görev `Done` durumuna geçtiğinde `CompletedAt` otomatik set edilir; `Done`'dan geri alınırsa temizlenir.
- Görev durumu, atanan kullanıcı veya öncelik değiştiğinde `TaskHistories` tablosuna otomatik kayıt düşülür.
- Bir görevin gerçekleşen süresi (`ActualHours`) `TaskTimeLogs` toplamından hesaplanır; ayrı bir sütunda tutulmaz.
- Yoruma sadece proje üyesi/sahibi ekleyebilir; yorum güncelleme/silme sadece yazan kullanıcı veya Admin tarafından yapılabilir.
- Soft delete: `User`, `Project`, `ProjectTask`, `Comment` üzerinde `IsDeleted` alanı ve global query filter ile uygulanır. Proje silindiğinde altındaki görevler de soft-delete edilir; yorum/zaman kayıtları korunur.

## Listeleme, Filtreleme, Sıralama

- Tüm liste endpointleri `page` / `pageSize` destekler (varsayılan 10, üst sınır 100).
- `GET /api/projects`: `status`, `ownerId`, `sortBy` (`name`, `startDate`, `status`), `sortDirection`.
- `GET /api/tasks`: `projectId`, `assignedToUserId`, `status`, `priority`, `dueBefore`, `dueAfter`, `sortBy` (`dueDate`, `priority`, `status`, `title`), `sortDirection`.
- `GET /api/time-logs`: `taskId`, `userId`, `from`, `to`.
- Admin olmayan kullanıcılar için proje/görev listeleri otomatik olarak "sahip olduğu veya üyesi olduğu" kayıtlarla sınırlanır.

## API Uç Noktaları (özet)

| Modül | Endpoint | Açıklama |
|---|---|---|
| Auth | `POST /api/auth/register` | Yeni TeamMember kaydı |
| Auth | `POST /api/auth/login` | JWT access token üretir |
| Users | `GET/PUT /api/users`, `/api/users/{id}` | Admin: listeleme, detay, güncelleme/aktif-pasif |
| Projects | `GET/POST /api/projects`, `GET/PUT /api/projects/{id}` | Proje CRUD (Admin/ProjectManager) |
| Projects | `PATCH /api/projects/{id}/archive`, `DELETE /api/projects/{id}` | Arşivleme / soft delete |
| ProjectMembers | `GET/POST /api/projects/{projectId}/members`, `DELETE .../{memberId}` | Ekip üyeliği yönetimi |
| Tasks | `GET/POST /api/tasks`, `GET/PUT /api/tasks/{id}` | Görev CRUD |
| Tasks | `PATCH /api/tasks/{id}/status`, `DELETE /api/tasks/{id}` | Durum değişimi / soft delete |
| Comments | `GET/POST /api/tasks/{taskId}/comments`, `PUT/DELETE /api/comments/{id}` | Yorumlar |
| TaskHistories | `GET /api/tasks/{taskId}/histories` | Görev değişiklik geçmişi |
| TaskTimeLogs | `GET /api/time-logs`, `POST /api/tasks/{taskId}/time-logs` | Zaman kayıtları |

## Spesifikasyonun Ötesinde Yapılan Ekler (gerekçeli)

- **CORS ("Default" policy, tüm origin'lere açık)**: Yerel geliştirmede Swagger dışı bir istemciden
  (ör. bonus frontend) API'yi engelsiz test edebilmek için eklendi; prod için daraltılması önerilir.
- **`UnitOfWork` deseni**: Repository'ler tek bir `AppDbContext` üzerinde çalışıp tek `SaveChangesAsync`
  ile commit edilsin diye eklendi (ör. görev durumu değişince hem `ProjectTask` hem `TaskHistory`
  aynı transaction'da kaydediliyor).
- **`PagedResult<T>` / `PaginationQuery` ortak tipleri**: Tüm liste endpointlerinde tekrar eden
  sayfalama mantığını tek yerde toplamak için eklendi.
- **Public register her zaman `TeamMember` oluşturur**: Spesifikasyon rol seçimini netleştirmediği
  için, kullanıcıların kendi kendine Admin/ProjectManager seçmesini engelleyen daha güvenli bir
  varsayılan tercih edildi.

## Bilinen Sınırlamalar / Yapılmayanlar (Bonus Kapsam)

Bonus kapsamındaki Docker Compose, unit/integration test projesi, Serilog, frontend panel, e-posta
bildirimleri ve CI/CD bu teslimatta yer almamaktadır; zaman kısıtı nedeniyle Zorunlu ve Orta Seviye
kapsam önceliklendirilmiştir.

Geliştirme ortamında JWT imzalama anahtarı `appsettings.json` içinde düz metin olarak tutulmaktadır
(`Jwt:Key`); üretim ortamında bu değerin ortam değişkeni veya secret manager üzerinden verilmesi
gerekir.
