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
Security/      -> JWT üretimi/ayarları + eşzamanlı oturum kontrolü
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

### Aynı Wi-Fi'daki başka cihazlardan (telefon/tablet) erişim

`launchSettings.json`'daki `http` profili `0.0.0.0:5044` dinliyor, yani makinedeki tüm IPv4
adresleri — `127.0.0.1` de buna dahil olduğu için `http://localhost:5044` bozulmadan çalışmaya
devam ediyor.

```bash
# Yerel IP'yi öğren (Wi-Fi genelde en0, değilse en1)
ipconfig getifaddr en0

# Ağa açık çalıştır (varsayılan profil zaten bu)
dotnet run --launch-profile http
```

Uygulama açılırken erişilebilecek adresleri konsola basıyor (`Program.cs` içindeki
`LogReachableUrls`), IP'yi elle aramaya gerek yok. Telefondan:

- Panel → `http://LAPTOP_IP:5044`
- Swagger → `http://LAPTOP_IP:5044/swagger`

Profiller:

| Profil | Adres | Ne zaman |
|---|---|---|
| `http` (varsayılan) | `http://0.0.0.0:5044` | normal geliştirme + yerel ağ erişimi |
| `localhost-only` | `http://localhost:5044` | ağa hiç açmak istemediğinde |
| `https` | `https://localhost:7222` + `http://localhost:5044` | sadece bu makine |

HTTPS yönlendirmesi bilerek kapalı: geliştirme sertifikası telefonda güvenilmediği için sürekli
sertifika uyarısı üretiyordu, yerel ağ kullanımı için düz HTTP yeterli.

macOS ilk çalıştırmada "gelen ağ bağlantılarına izin verilsin mi?" diye soruyor — **İzin Ver**
demek gerekiyor, yoksa telefon bağlanamıyor. Yanlışlıkla reddedildiyse: Sistem Ayarları → Ağ →
Güvenlik Duvarı → Seçenekler.

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
düzenleme/silme/durum değiştirme/yorumlar/zaman kayıtları/geçmiş, Admin için kullanıcı yönetimi ve
bir de oyun sayfası.
Butonlar backend'deki yetki kurallarına göre gösteriliyor/gizleniyor (ör. "Düzenle" sadece proje
sahibine ya da Admin'e görünüyor) ama gerçek kontrol her zaman backend'de — frontend tarafı sadece
UX için.

### Tema

Panelin teması Batman/Gotham. Renk paleti gece siyahı + bat-signal sarısı (`#ffd23f`) + kızıl vurgu,
tipografi Oswald/Rajdhani. Arka planda sabit bir Gotham gece fotoğrafı, dönen bat-signal huzmesi,
ekranı geçen yarasa siluetleri ve altta şehir silüeti var; kartlarda hover kalkması ve soluk yarasa
filigranı, butonlarda ışık parlaması, tablo satırlarında sarı süpürme efekti. Fotoğraflar Unsplash'ten
(serbest lisans), geri kalan her şey CSS/SVG. `prefers-reduced-motion` destekli — animasyondan
rahatsız olan kullanıcılarda kapanıyor.

Tema tamamen `wwwroot/css/styles.css` ve `index.html` içinde; hiçbir sınıf adı, buton ya da işlev
değiştirilmedi, sadece görsel katman.

### Gotham Runner (oyun)

Menüdeki **Oyun** sekmesi (`#/game`) Chrome'un dinozor oyununun birebir mekaniğine sahip, Batman
evrenine uyarlanmış bir canvas oyunu (`wwwroot/js/views/batmanGame.js`):

| Dino | Gotham Runner |
|---|---|
| Dinozor | Joker (koşan karakter) |
| Kaktüs | Gargoyle heykelleri (küçük/büyük, 1-3'lü gruplar) |
| Pterodaktil | Süzülen Batman, 3 yükseklikte |
| Bulut | Gotham sisi |
| Gündüz/gece | Alacakaranlık ↔ gece + ay fazları + uzakta bat-signal |

Dino'nun orijinal sabitleri korundu: aynı yerçekimi/zıplama fiziği, `0.001` hızlanma,
`mesafe × 0.025` puanlama, her 100 puanda bip sesi, uçan engel 400 puandan sonra. Zıpla `SPACE`/`↑`,
eğil `↓`, mobilde dokunmatik. Rekor `localStorage`'da. Görünüm değiştiğinde oyun döngüsü ve klavye
dinleyicileri otomatik kapanıyor, diğer sayfalarda tuş çakışması olmuyor.

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

## Eşzamanlı oturum kontrolü

Bir hesabın aynı anda tek bir yerde açık olması gerekiyordu. JWT stateless olduğu için token'ı
üretildikten sonra "iptal etmek" mümkün değil; bu yüzden sunucu tarafında oturum durumu tutuyorum.

**Sunucu — aynı kullanıcı tek yerden.** `User` üzerine `SessionId`, `SessionStartedAt`,
`SessionLastSeenAt` ekledim. Login'de bir `SessionId` üretilip hem veritabanına yazılıyor hem de
token'a `sid` claim'i olarak gömülüyor. Her istekte `JwtBearerEvents.OnTokenValidated`
(`Security/SessionValidator.cs`) token'daki `sid` ile veritabanındakini karşılaştırıyor; uyuşmuyorsa
401 dönüyor. Aktif oturumu olan bir hesapla ikinci giriş denenirse **409 Conflict** +
`Code: SESSION_ALREADY_ACTIVE` dönüyor.

**Tarayıcı — aynı anda tek hesap.** Oturum açıkken `#/login` veya `#/register`'a gidilirse form
yerine kimin açık olduğunu gösteren bir hata ekranı çıkıyor (`wwwroot/js/views/sessionBlock.js`),
"Çıkış yap ve devam et" butonuyla. Sekmeler arası `storage` olayıyla senkronize, ikinci sekmede
farklı kullanıcı oluşamıyor.

**Kilitlenmeye karşı.** Tarayıcı çıkış yapılmadan kapanırsa hesap sonsuza kadar kilitli kalmasın
diye boşta kalma eşiği koydum: `Jwt:SessionIdleMinutes` (varsayılan 10) süresince hiç istek gelmezse
oturum terk edilmiş sayılıp yeni girişe izin veriliyor. Token'ın kendi ömrü dolduysa da öyle.
`Jwt:SessionTouchSeconds` (varsayılan 30) ise "son görülme" damgasının veritabanına en fazla hangi
sıklıkta yazılacağını sınırlıyor — her istekte yazmamak için.

Frontend çıkışta `POST /api/auth/logout` çağırıyor; bu yapılmazsa oturum boşta kalma süresi dolana
kadar sunucuda açık kalır.

İlgili migration: `20260728120000_AddUserSessionTracking`.

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
| Auth | `POST /api/auth/login` | JWT üretir, oturum açar |
| Auth | `POST /api/auth/logout` | oturumu serbest bırakır (`[Authorize]`) |
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

- **CORS** — geliştirirken Swagger dışından da (bonus frontend gibi) rahat test edebilmek için açtım. Artık ortama duyarlı: Development'ta `AllowAnyOrigin`, Production'da yalnızca `Cors:AllowedOrigins` listesindeki origin'ler (liste boşsa hiçbir cross-origin isteğe izin yok). Frontend API ile aynı origin'den servis edildiği için bu değişiklik paneli etkilemiyor.
- **UnitOfWork** — repository'ler tek `AppDbContext` üzerinde çalışıp tek `SaveChangesAsync` ile commit olsun diye (görev durumu değişince `ProjectTask` + `TaskHistory` aynı anda kaydediliyor mesela).
- **`PagedResult<T>` / `PaginationQuery`** — her listeleme endpoint'inde aynı sayfalama kodunu tekrar yazmamak için ortak tipler.
- **Eşzamanlı oturum kontrolü** — yukarıda ayrı bölümde anlattım.
- **Yerel ağ erişimi** — `0.0.0.0` binding + profiller, telefondan test edebilmek için.
- **Geliştirmede statik dosya önbelleği kapalı** — `wwwroot` için `no-cache` başlıkları. Bunu eklemeden önce tarayıcılar güncellenen js/css dosyalarının eski sürümünü servis etmeye devam ediyordu ve Chrome ile Safari farklı davranıyordu; hata aramak yerine önbelleği kaynağında kapattım.
- **Batman teması + Gotham Runner** — frontend bölümünde anlattım.

## Eklemediklerim

Docker Compose, unit/integration testler, Serilog, e-posta bildirimleri, CI/CD — bunların hepsi bonus
kapsamında ve zaman yetmedi, önceliği Zorunlu + Orta Seviye kapsama ve frontend paneline verdim.

## Güvenlik notları

- JWT imzalama anahtarı şu an `appsettings.json`'da düz metin (`Jwt:Key`) ve hâlâ placeholder değerde. Geliştirme için sorun değil ama gerçek bir production ortamında environment variable ya da secret manager'a taşımak gerekir.
- Uygulama `0.0.0.0` dinlediği için aynı Wi-Fi'daki **herkes** erişebiliyor. Ev ağında sorun değil; kafe/okul/yurt gibi paylaşımlı bir ağda çalıştırmadan önce `Jwt:Key`'i ve `DataSeeder`'daki bilinen şifreleri (`Admin123!` vb.) değiştirmek lazım. Ağa hiç açmak istemediğinde `--launch-profile localhost-only` var.
- HTTPS ve `AllowedHosts: "*"` bilinçli olarak bu haliyle bırakıldı: ikisi de yerel ağ üzerinden IP ile erişim için gerekli. Uygulama internete açılacaksa ikisinin de gözden geçirilmesi gerekir.
