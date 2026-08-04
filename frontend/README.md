# Nexus — Proje Yönetimi Arayüzü

Bu klasör, kök dizindeki **Project Management API** (ASP.NET Core 10 + EF Core/SQLite)
için yazılmış React arayüzüdür. Amaç, mevcut API'yi klasik bir admin panelinden çok
modern bir SaaS proje yönetim ürünü gibi kullanılabilir hale getirmek.

Arayüzdeki her veri gerçek API'den gelir. Backend'de karşılığı olmayan işlemler için
**sahte veri üretilmez ve çalışmayan buton gösterilmez**; eksikler kök dizindeki
[`FRONTEND_API_GAPS.md`](../FRONTEND_API_GAPS.md) dosyasında raporlanmıştır.

---

## İçindekiler

- [Kullanılan teknolojiler](#kullanılan-teknolojiler)
- [Hızlı başlangıç](#hızlı-başlangıç)
- [Ortam değişkenleri](#ortam-değişkenleri)
- [Komutlar](#komutlar)
- [API bağlantısı](#api-bağlantısı)
- [Kimlik doğrulama](#kimlik-doğrulama)
- [Klasör mimarisi](#klasör-mimarisi)
- [Ekranlar](#ekranlar)
- [Tasarım sistemi](#tasarım-sistemi)
- [Erişilebilirlik](#erişilebilirlik)
- [Testler](#testler)
- [Bilinen eksikler](#bilinen-eksikler)

---

## Kullanılan teknolojiler

| Alan | Seçim | Not |
|---|---|---|
| Derleyici/dev sunucu | Vite 6 | |
| UI | React 19 + TypeScript (strict) | `any` kullanılmıyor, ESLint kuralı ile yasak |
| Stil | Tailwind CSS v4 (`@tailwindcss/vite`) | Token'lar CSS değişkeni olarak `src/index.css` içinde |
| Bileşenler | shadcn/ui deseni (Radix UI + CVA) | `src/components/ui/` altında, projeye kopyalanmış |
| Yönlendirme | React Router 7 | |
| Sunucu durumu | TanStack Query 5 | API verisi **yalnızca** burada tutulur |
| İstemci durumu | React Context | Yalnızca oturum ve tema |
| HTTP | Axios | Tek merkezî istemci + interceptor'lar |
| Formlar | React Hook Form + Zod | Backend FluentValidation kuralları birebir yansıtıldı |
| İkonlar | Lucide React | |
| Grafikler | Recharts | |
| Tarih | date-fns (tr locale) | |
| Sürükle-bırak | dnd-kit | Kanban |
| Bildirim | Sonner | |
| Test | Vitest + Testing Library | |

---

## Hızlı başlangıç

Ön koşul: **Node.js 20+** (veya 22+) ve npm.

```bash
# 1) Backend'i çalıştır (repo kökünde, ayrı bir terminalde)
cd ..
dotnet restore
dotnet run --launch-profile localhost-only     # http://localhost:5044

# 2) Frontend
cd frontend
cp .env.example .env
npm install
npm run dev                                    # http://localhost:5173
```

`http://localhost:5173` adresini açıp seed kullanıcılarından biriyle giriş yapın:

| Rol | E-posta | Şifre |
|---|---|---|
| Admin | `admin@heweso.com` | `Admin123!` |
| ProjectManager | `pm@heweso.com` | `Manager123!` |
| TeamMember | `dev1@heweso.com` | `Member123!` |
| TeamMember | `dev2@heweso.com` | `Member123!` |

> **Önemli:** Backend "aynı anda tek oturum" kuralı uyguluyor. Aynı hesap başka bir
> tarayıcıda/sekmede açıkken giriş denerseniz `409` alırsınız. Diğer oturumdan çıkış yapın
> ya da boşta kalma süresinin (`Jwt:SessionIdleMinutes`, varsayılan 10 dk) dolmasını
> bekleyin. Kökteki eski `wwwroot` paneli ile bu arayüzü aynı hesapla aynı anda kullanamazsınız.

---

## Ortam değişkenleri

`.env.example` şablondur; gerçek gizli değer içermez ve içermemelidir.

```env
VITE_API_BASE_URL=http://localhost:5044/api
VITE_APP_NAME=Nexus
```

- API adresi kod içinde **hiçbir yerde** sabit yazılmaz. Tek okuma noktası
  [`src/config/env.ts`](src/config/env.ts); diğer tüm dosyalar `env.apiBaseUrl` kullanır.
- Değişken tanımlı değilse `http://localhost:5044/api` varsayılanı kullanılır (backend'in
  `Properties/launchSettings.json` içindeki gerçek portu).
- Aynı Wi-Fi'daki telefondan test için makinenizin yerel IP'sini yazın:
  `VITE_API_BASE_URL=http://192.168.1.25:5044/api`. Backend zaten `0.0.0.0:5044` dinliyor,
  Vite dev sunucusu da `host: true` ile ağa açık.

`.env` dosyası `.gitignore` içindedir; yalnızca `.env.example` repoya girer.

---

## Komutlar

```bash
npm install       # bağımlılıkları kur
npm run dev       # geliştirme sunucusu (5173)
npm run type-check # TypeScript denetimi (tsc --noEmit)
npm run lint      # ESLint
npm run test      # Vitest (tek sefer)
npm run test:watch # Vitest izleme modu
npm run build     # type-check + production build → dist/
npm run preview   # build çıktısını yerelde servis et
```

---

## API bağlantısı

**Katmanlar:**

```
components / pages
      ↓  (yalnızca hook çağırır)
hooks/queries · hooks/mutations      → TanStack Query
      ↓
services/*.ts                        → tip-güvenli istek/yanıt
      ↓
api/client.ts + api/endpoints.ts     → Axios + tek uç listesi
```

- UI bileşenlerinin içinde **doğrudan Axios çağrısı yoktur**.
- Kullanılan tüm uçlar tek dosyada toplanmıştır: [`src/api/endpoints.ts`](src/api/endpoints.ts).
  Bu listede olmayan bir yol frontend'de çağrılmaz.
- Query anahtarları [`src/api/queryKeys.ts`](src/api/queryKeys.ts) içindeki fabrikadan üretilir;
  mutasyonlardan sonra doğru anahtarlar invalidate edilir.

**Bağlanılan gerçek uçlar**

| Modül | Uç |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout` |
| Users | `GET /users`, `GET /users/{id}`, `PUT /users/{id}` |
| Projects | `GET/POST /projects`, `GET/PUT/DELETE /projects/{id}`, `PATCH /projects/{id}/archive` |
| Members | `GET/POST /projects/{id}/members`, `DELETE /projects/{id}/members/{memberId}` |
| Tasks | `GET/POST /tasks`, `GET/PUT/DELETE /tasks/{id}`, `PATCH /tasks/{id}/status` |
| Comments | `GET/POST /tasks/{taskId}/comments`, `PUT/DELETE /comments/{id}` |
| Histories | `GET /tasks/{taskId}/histories` |
| Time logs | `GET /time-logs`, `POST /tasks/{taskId}/time-logs` |

**Backend'e uyum için dikkat edilen üç nokta**

1. **Enum'lar sayıdır.** `Program.cs` içinde `JsonStringEnumConverter` yok, bu yüzden
   `role`, `status`, `priority` JSON'da sayı olarak taşınır. Tipler `src/types/enums.ts`
   içinde backend `Enums/*.cs` dosyalarıyla birebir eşleşecek şekilde tanımlandı.
2. **Tarihler `Z` eki olmadan gelir.** Veritabanından okunan değerler
   `"2026-08-04T06:47:03.011835"` biçiminde ama UTC'dir. `new Date()` bunu yerel saat
   sayıp kaydırırdı; `parseApiDate` (`src/utils/date.ts`) eksik olduğunda `Z` ekler.
3. **İki farklı hata gövdesi var.** Middleware PascalCase
   (`{Message, StatusCode, Errors, Code}`), FluentValidation ise camelCase ProblemDetails
   (`{title, status, errors}`) döndürür. `src/utils/errors.ts` ikisini tek `NormalizedApiError`
   biçimine indirger; alan hataları `applyApiFieldErrors` ile ilgili form alanının altına yazılır.

**CORS:** Backend Development ortamında `AllowAnyOrigin` kullandığı için ek ayar gerekmedi;
**backend'de hiçbir değişiklik yapılmadı**. Production'da `Cors:AllowedOrigins` listesine
arayüzün origin'i eklenmelidir (liste boşsa hiçbir cross-origin isteğe izin verilmez).

---

## Kimlik doğrulama

Backend saf **JWT Bearer** kullanıyor; cookie tabanlı kimlik doğrulama, refresh token ve
`/auth/me` ucu yok. Buna göre kurgulanan akış:

- **Giriş / kayıt** → `AuthContext` token, kullanıcı ve `expiresAt` değerlerini
  `localStorage`'a yazar. Kayıt her zaman `TeamMember` rolü üretir (backend kuralı).
- **İstek interceptor'ı** her isteğe `Authorization: Bearer <token>` ekler.
- **Yanıt interceptor'ı** 401 aldığında oturumu temizler ve uygulamaya haber verir.
  Yönlendirmeyi kendisi yapmaz — `ProtectedRoute` React Router üzerinden `/login`'e
  götürür, böylece tam sayfa yenileme ve sonsuz döngü riski yoktur. `login`/`register`
  istekleri bu davranıştan muaftır (orada 401 "hatalı şifre" demektir).
- **Sayfa yenilendiğinde** saklanan oturum geri okunur; süresi geçmişse sunucuya hiç
  gidilmeden temizlenir, geçerliyse ucuz bir korumalı istekle doğrulanır.
- **Giriş sonrası yönlendirme:** korumalı bir sayfadan gelindiyse oraya, yoksa `/dashboard`.
- **Sekmeler arası eşitleme:** bir sekmede çıkış yapılırsa `storage` olayıyla diğer
  sekmeler de düşer.
- **Çıkışta** `POST /auth/logout` çağrılır. Bu yapılmazsa hesap, boşta kalma süresi dolana
  kadar sunucuda kilitli kalır.
- **Eşzamanlı oturum:** login `409` + `SESSION_ALREADY_ACTIVE` dönerse ayrı ve açıklayıcı
  bir uyarı gösterilir; oturum devralındığında gelen `401` + `SESSION_REVOKED` ise
  "başka bir cihazdan giriş yapılmış olabilir" mesajıyla ele alınır.

**Yetkiler.** `src/utils/permissions.ts` backend'deki `EnsureCanManage*` kurallarını
yansıtır ve yalnızca UX içindir (yetkisiz butonu göstermemek). Gerçek kontrol her zaman
backend'dedir. `/team` rotası ayrıca `ProtectedRoute allowedRoles` ile korunur, çünkü
`GET /api/users` yalnızca Admin ve ProjectManager'a açıktır.

---

## Klasör mimarisi

```
frontend/
├─ .env.example
├─ eslint.config.js
├─ vite.config.ts            # React + Tailwind eklentileri, @ alias, Vitest ayarı
├─ tsconfig.json             # strict, noUnusedLocals, paths: @/* → src/*
└─ src/
   ├─ api/
   │  ├─ client.ts           # Axios örneği + interceptor'lar + cleanParams
   │  ├─ endpoints.ts        # gerçek uçların TEK listesi
   │  └─ queryKeys.ts        # query key fabrikası
   ├─ components/
   │  ├─ ui/                 # shadcn deseni ilkeller (button, dialog, form, table…)
   │  ├─ layout/             # AppLayout, Sidebar, GlobalSearch, UserMenu, PageHeader…
   │  ├─ common/             # EmptyState, ErrorState, Skeletons, ConfirmDialog, badge'ler
   │  ├─ auth/               # AuthShell
   │  ├─ dashboard/          # StatCard
   │  ├─ projects/           # kart, tablo, form, ekip paneli, aktivite
   │  ├─ tasks/              # tablo, filtreler, form, Kanban, detay drawer, geçmiş
   │  ├─ comments/           # CommentSection
   │  ├─ time-logs/          # görev içi bölüm + manuel kayıt formu
   │  └─ reports/            # grafikler + tema paleti
   ├─ config/env.ts          # TEK ortam yapılandırması
   ├─ contexts/              # AuthContext, ThemeContext
   ├─ hooks/
   │  ├─ queries/            # useProjects, useTasks, useTimeLogs, useUsers…
   │  └─ mutations/          # useTaskMutations (optimistic), useProjectMutations…
   ├─ lib/                   # cn(), authStorage
   ├─ pages/                 # 17 ekran
   ├─ routes/                # AppRoutes, ProtectedRoute, PublicRoute, ErrorBoundary
   ├─ schemas/               # Zod şemaları (backend validator'larının karşılığı)
   ├─ services/              # authService, projectService, taskService, statsService…
   ├─ test/                  # setup + render yardımcıları
   ├─ types/                 # api.ts, enums.ts, models.ts (backend DTO karşılıkları)
   └─ utils/                 # date, format, errors, formErrors, permissions
```

---

## Ekranlar

| Ekran | Rota | Ne yapar |
|---|---|---|
| Giriş | `/login` | Gerçek `POST /auth/login`; 409 oturum çakışması ayrı ele alınır |
| Kayıt | `/register` | `POST /auth/register`, ardından otomatik oturum |
| Panel | `/dashboard` | Sayaçlar (tıklanınca filtreli listeye gider), durum dağılımı ve tamamlanma grafiği, aktif proje ilerlemesi, yaklaşan teslimler, size atanan görevler |
| Projeler | `/projects` | Kart/tablo görünümü (tercih `localStorage`'da), durum filtresi, sıralama, sayfalama, oluştur/düzenle/arşivle/sil |
| Proje detayı | `/projects/:id` | Genel bakış · Görevler · Ekip · Zaman · Aktivite sekmeleri |
| Kanban | `/projects/:id/board` | dnd-kit ile sürükle-bırak → `PATCH /tasks/{id}/status`, optimistic update + hata durumunda geri alma |
| Görevler | `/tasks` | Sunucu tarafı filtreler (proje, durum, öncelik, atanan, tarih) + sayfalama; oluştur/düzenle/sil |
| Görevlerim | `/my-tasks` | Geciken · Bugün · Yaklaşan · Tamamlanan bölümleri |
| Görev detayı | (drawer) | Detay · Yorumlar · Zaman · Geçmiş; durum değiştirme, düzenle/sil |
| Takvim | `/calendar` | Teslim tarihlerinin aylık görünümü (`dueAfter`/`dueBefore` ile sunucudan) |
| Zaman kayıtları | `/time-logs` | Günlük/haftalık/proje toplamları, tarih ve kullanıcı filtreleri, manuel kayıt |
| Ekip | `/team` | Kullanıcılar, iş yükü, rol/aktiflik düzenleme (Admin) — Admin+PM erişimi |
| Raporlar | `/reports` | Durum, öncelik, proje ilerlemesi, tamamlanma eğrisi, proje/kullanıcı bazlı süre |
| Profil | `/profile` | Hesap bilgileri ve iş yükü özeti |
| Ayarlar | `/settings` | Tema, liste tercihi, API bağlantı bilgisi |
| Yetkisiz | `/unauthorized` | Rol yetmediğinde |
| Bulunamadı | `*` | 404 |
| Hata | (ErrorBoundary) | Render hatalarında beyaz ekran yerine kurtarılabilir sayfa |

Her liste ekranında **yükleme iskeleti**, **hata durumu** (tekrar dene butonuyla) ve
**boş durum** görünümü vardır. Silme/arşivleme işlemleri onay diyaloğu ister, sonuçlar
toast ile bildirilir.

---

## Tasarım sistemi

Token'lar `src/index.css` içinde CSS değişkeni olarak tanımlı, Tailwind v4'ün
`@theme inline` bloğuyla yardımcı sınıflara bağlanıyor.

| Rol | Açık tema | Koyu tema |
|---|---|---|
| Arka plan | `#F8FAFC` | `#0B1120` |
| Kart | `#FFFFFF` | `#111A2E` |
| Vurgu | `#4F46E5` | `#6366F1` |
| Vurgu (hover) | `#4338CA` | `#818CF8` |
| Ana metin | `#0F172A` | `#E2E8F0` |
| İkincil metin | `#64748B` | `#94A3B8` |
| Kenarlık | `#E2E8F0` | `#24314A` |
| Başarı / Uyarı / Hata | `#16A34A` / `#F59E0B` / `#DC2626` | `#22C55E` / `#FBBF24` / `#F87171` |

- Varsayılan **açık tema**; koyu tema ve "sistemi takip et" seçeneği var. Tercih
  `localStorage`'da tutulur ve `index.html` içindeki küçük bir script ile ilk boyamadan
  önce uygulanır (tema geçişinde beyaz "flash" olmaz).
- Tipografi Inter; ikonlar Lucide; yarıçap tek bir `--radius` değerinden türetilir;
  gölgeler küçük ve ölçülüdür. Gradient, neon renk ve dekoratif animasyon kullanılmadı.
- Kırılımlar: 375px (mobil), 768px (tablet), 1024px (küçük laptop), 1440px (masaüstü).
  Mobilde sidebar çekmeceye dönüşür, tablolar yatay kayar, Kanban kolonları yatay kayar,
  görev drawer'ı tam ekran açılır, diyaloglar kendi içinde kaydırılır.

---

## Erişilebilirlik

- Tüm etkileşimli öğeler klavyeyle gezilebilir; görünür ve tutarlı odak halkası var.
- Diyalog/çekmece odak yönetimi ve `Esc` davranışı Radix ilkelleriyle sağlanıyor.
- Formlarda `<label>` bağlantısı, `aria-invalid` ve `aria-describedby` otomatik kuruluyor
  (`components/ui/form.tsx`); hata mesajları `role="alert"` ile duyuruluyor.
- Yükleme bölgeleri `role="status"` + ekran okuyucuya özel metin taşıyor.
- Durum ve öncelik göstergeleri renk **artı** ikon/metin kullanıyor; anlam yalnızca renge
  bağlı değil.
- Yalnızca ikon içeren butonlarda `aria-label` var; sayfa başında "İçeriğe geç" bağlantısı
  bulunuyor.
- `prefers-reduced-motion` desteklenir: geçiş ve animasyonlar kapatılır.

---

## Testler

Vitest + Testing Library (jsdom). Kapsanan davranışlar:

| Dosya | Ne test ediliyor |
|---|---|
| `src/utils/date.test.ts` | `Z` eki olmayan UTC tarihlerin doğru çözülmesi, gün hesapları, teslim etiketleri |
| `src/utils/format.test.ts` | Ondalıklı saat biçimlendirme, yüzde hesabı, baş harfler |
| `src/utils/errors.test.ts` | PascalCase middleware hatası ve camelCase ProblemDetails'in tek biçime indirgenmesi, ağ hatası |
| `src/schemas/schemas.test.ts` | Login/Register/Proje/Görev/Zaman kaydı doğrulama kuralları (backend sınırlarıyla aynı) |
| `src/pages/LoginPage.test.tsx` | Boş form doğrulaması, geçersiz e-posta, başarılı gönderim, 401 ve 409 hata gösterimi |
| `src/routes/ProtectedRoute.test.tsx` | Yükleniyor durumu, oturumsuz yönlendirme, rol bazlı erişim |
| `src/components/common/StatusBadge.test.tsx` | Enum → etiket eşlemesi, metinli durum gösterimi |
| `src/components/common/ErrorState.test.tsx` | Backend mesajı, yetki hatası, ağ hatası, tekrar dene |

```bash
npm run test
```

E2E testi (Playwright vb.) **yazılmadı**; olmayan bir kapsamı varmış gibi göstermemek için
belirtiliyor.

---

## Bilinen eksikler

**Mock veri kullanılan yer yoktur.** Tüm listeler, sayaçlar ve grafikler gerçek API
yanıtlarından üretilir. Aşağıdakiler, backend'de karşılığı olmadığı için **arayüzde hiç
yer almayan** ya da sınırlı çalışan özelliklerdir. Ayrıntı ve önerilen uç tasarımları için
[`FRONTEND_API_GAPS.md`](../FRONTEND_API_GAPS.md).

Arayüzde **hiç bulunmayan** (uç olmadığı için):

- Zaman kaydı düzenleme/silme ve başlat–durdur sayacı
- Kullanıcı oluşturma ve silme
- Bildirim listesi (zil ikonu var, içerik yerine açıklama gösterir)
- Şifre değiştirme; Admin dışındaki roller için profil düzenleme
- Görevde başlangıç tarihi (backend yalnızca `DueDate` tutuyor)
- Panelde "Son aktiviteler" kartı (çalışma alanı geneli aktivite ucu yok)

**Sınırlı çalışan** (ekranda kullanıcıya belirtilir):

- **Arama** — sunucu tarafı arama ucu yok; yalnızca yüklü sayfada süzer
- **Panel sayaçları** — `totalCount` üzerinden birden çok sayım isteğiyle hesaplanır
  (kayıt indirilmez, ama tek istekte alınamaz)
- **Raporlar / haftalık toplamlar** — indirilen kayıtlardan hesaplanır, sayfa sınırına
  ulaşıldığında "kısmi veri" uyarısı çıkar
- **Proje aktivitesi** — en son güncellenen 12 görevin geçmişinden derlenir
- **Zaman kayıtlarında proje filtresi** — istemcide süzülür
- **Ekip sayfasındaki iş yükü sayıları** — erişilebilir kayıtlardan hesaplanır
- **Yorum sayısı** — DTO'da olmadığı için gösterilmez; yerine yorumları açan buton vardır
