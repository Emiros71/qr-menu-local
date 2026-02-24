# Canlıya Alma (Deployment) ve Mimari Yol Haritası

Bu doküman, QR Menü SaaS projenizi güvenli, ölçeklenebilir ve profesyonel bir şekilde gerçek kullanıcılara açmanız (Production) için gereken adımları içerir.

---

## 🚀 Aşama 1: Ortam ve Güvenlik Hazırlıkları

Projenizi canlıya almadan önce veritabanı ve bulut servislerinizin "Production" ayarlarını yapmalısınız.

### 1. Supabase (Veritabanı) Güvenliği
- **Row Level Security (RLS) Kontrolü:** Tüm tablolarınızdaki RLS politikalarının doğru çalıştığından emin olun. `service_role` anahtarını sadece sunucu tarafında (`/api/` route'ları içinde) kullandığınızı iki kez doğrulayın.
- **Production Ortamı:** Geliştirme sürecinde (Dev) kullandığınız Supabase projesi ile canlıdaki (Prod) projenin ayrı olması tavsiye edilir. Canlı için yeni bir Supabase projesi açıp, sadece oradaki veritabanı URL ve API Key'lerini kullanın.

### 2. Cloudinary (İmaj Yönetimi)
- Cloudinary panelinde **Upload Presets** ayarlarından imaj yüklemelerini sadece "Signed" (İmzalı) olarak sınırlandırın. Bu sayede API Secret anahtarınız olmadan kimse dışarıdan resim yükleyemez (Uygulamamız halihazırda imzalı yükleme altyapısına sahiptir).

### 3. Ortam Değişkenleri (.env.local)
- Bu dosya **kesinlikle** GitHub'a yollanmamalıdır.
- API Key gibi sırları barındıran isimleri not alın (Örn: `SUPABASE_SERVICE_ROLE_KEY`). Bir sonraki aşamada bu değerleri doğrudan yayın ortamı paneline gireceksiniz.

---

## ☁️ Aşama 2: Vercel İle Canlıya Alma (Önerilen Yöntem)

Next.js projeleri için en kusursuz ve pürüzsüz yayın platformu kendi yaratıcıları olan **Vercel**'dir.

1. **Vercel Hesabı Açın:** [Vercel.com](https://vercel.com) üzerinden GitHub hesabınızla giriş yapın.
2. **Projeyi İçe Aktarın (Import):** "Add New Project" seçeneğine tıklayıp, GitHub'a attığınız `qr-menu-saas` reposunu seçin.
3. **Environment Variables (Çok Önemli):** "Deploy" tuşuna basmadan önce "Environment Variables" sekmesini açın. `.env.local` dosyanızdaki **tüm şifreleri ve anahtarları, değerleriyle birlikte buraya yapıştırın.**
4. **Deploy:** Butona basın. Vercel sizin için kodları çekecek, `npm run build` yapacak ve global bulut ağında (CDN) projenizi milisaniyeler içinde yayına alacak.
   - *Not:* Her `git push origin main` dediğinizde Vercel otomatik olarak güncel kodlarınızı alır ve sitenizi kesintisiz yeniler.

*(Alternatif: DigitalOcean, AWS EC2, veya Hetzner gibi bir Linux sunucu (VPS) kiralayıp Docker, PM2 ve Nginx kullanarak da manuel kurulum yapabilirsiniz. Ancak Vercel ücretsiz paketinde SaaS projeniz için devasa bir limit sunar.)*

---

## 🌐 Aşama 3: Wildcard Subdomain Mimarisi (Mekanlara Özel URL)

**Örnek Senaryo:** Restoran sahibi kendisine ait `aura.qrmenu.com` adresini istiyor.

Bunu yapmak için ana domaininizi bir **Wildcard Subdomain** (Asterisk `*` - Herhangi bir alt domain) olarak Vercel'e yönlendirmeniz ve kod tarafında bir yönlendirici (Middleware) yazmanız gerekir.

### A. Alan Adı (DNS) Ayarları
Domaininizi aldığınız yere (GoDaddy, Cloudflare, vb.) gidip DNS ayarlarınıza şu A kaydını eklemelisiniz:
- **Türü:** `A` veya `CNAME`
- **Ad/Host:** `*` (Yıldız işareti tüm subdomainleri kapsar)
- **Hedef:** Vercel IP adresi (`76.76.21.21`) veya CNAME Alias'ı.

### B. Next.js Middleware İle Yönlendirme
Kullanıcının hangi subdomain'den (örneğin `mado.qrmenu.com`) geldiğini algılayıp, ona sadece o mekanın verisini göstermek için bir `middleware.ts` dosyası hazırlamalıyız. 

Yazılım mantığı şöyledir:
1. Birisi `mado.qrmenu.com` 'a girdi.
2. Next.js Middleware araya girer, Hostname'in `mado.qrmenu.com` olduğunu görür.
3. Uygulamayı yeniden yönlendirmez, ancak tarayıcı arka planında isteği `/[slug]` yapısına, yani aslında `qrmenu.com/mado` içeriğine çevirir *(Rewrite işlemi)*.
4. Müşterinin adres çubuğunda hala `mado.qrmenu.com` yazar ancak karşısına o mekanın menüsü gelir!

---

## 📋 Aşama 4: Canlıya Alım Öncesi Checklist

Uygulamanın linkini ilk müşterinize vermeden önce şunları test edin:

- [ ] **E2E Testler:** `npm run test:e2e` ile Playwright testlerini çalıştırıp temel senaryoları doğrulayın.
- [ ] **Güvenlik Testi:** Giriş yapmadan `/admin` sayfasına gitmeyi deneyin, sistemin sizi "/login" sayfasına attığından emin olun.
- [ ] **Resim Optimizasyonu:** Bir telefondan resim çekip menüye yükleyin. Resmin 1MB'dan küçük bir boyutta Cloudinary'e gittiğini ağ (network) sekmesinden gözlemleyin.
- [ ] **SEO & Meta Etiketleri:** Mekan sayfalarınızdaki ( `/[slug]` ) başlık ve açıklama etiketlerinin, o mekanın ismini doğru yansıttığını kontrol edin.

---

> Bu yol haritası ile projenizi sadece ayağa kaldırmakla kalmaz, aynı zamanda kurumsal uygulamalar standartlarında (Multi-tenant) devasa bir SaaS altyapısına kavuşturursunuz! 
