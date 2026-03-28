# QR Menu SaaS – Kullanıcı Rehberi

## 📦 Proje Hakkında
QR Menu SaaS, restoran ve kafe gibi mekanların menülerini **online** olarak yönetebileceği ve **müşterilere** interaktif bir menü deneyimi sunabileceği bir platformdur.
- **Admin Panel** – Menüler, kategoriler, ürünler ve zamanlamalar burada yönetilir.
- **Müşteri Menüsü** – Kullanıcılar QR kodu tarayarak menüyü görüntüler, ürünleri arar ve sipariş verir.

---

## 🛠️ Gereksinimler
| Araç | Versiyon |
|------|----------|
| Node.js | 20.x (LTS) |
| npm / yarn | 9.x |
| Git | 2.40+ |
| Vercel CLI (opsiyonel) | `npm i -g vercel` |
| Cloudinary hesabı (görseller için) | – |

---

## 🚀 Başlangıç – Kurulum
1. **Depoyu klonlayın**
   ```bash
   git clone https://github.com/Emiros71/qr-menu-saas.git
   cd qr-menu-saas
   ```
2. **Bağımlılıkları yükleyin**
   ```bash
   npm install   # veya yarn
   ```
3. **Ortam değişkenlerini ayarlayın**
   - `.env.local` dosyasını oluşturun (örnek: `.env.example` dosyasını kopyalayın)
   - Gerekli anahtarlar:
     ```env
     NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
     CLOUDINARY_URL=your-cloudinary-url
     ```
4. **Geliştirme sunucusunu başlatın**
   ```bash
   npm run dev   # http://localhost:3000
   ```
   Tarayıcıda `http://localhost:3000` adresine giderek uygulamayı görebilirsiniz.

---

## 🔧 Admin Panel Kullanımı
### 1. Giriş
- `/admin` yoluna gidin ve Supabase kimlik bilgileriyle oturum açın.

### 2. Mekan (Venue) Yönetimi
- **Mekan Oluştur** – “Yeni Mekan” butonuyla isim, slug ve tema renkleri girilir.
- **Tema** – `primary`, `secondary`, `background` gibi renkleri ayarlayarak UI’nın görünümünü özelleştirebilirsiniz.

### 3. Kategori ve Zamanlama
- **Kategori Ekle** – İsim, açıklama, `startTime` ve `endTime` belirlenir.
- **Zamanlama** – Kategori sadece belirlenen saat aralığında menüde görünür. Saat dışındaysa **tamamen gizlenir** (gri değil).
- **Alt Kategoriler** – Kategori içinde başka bir kategori ekleyerek hiyerarşi oluşturabilirsiniz.

### 4. Ürün Yönetimi
- **Ürün Ekle** – İsim, fiyat, açıklama, görsel (Cloudinary URL) ve kategori seçilir.
- **Görsel** – Cloudinary’ye yüklediğiniz görseller otomatik olarak menüde gösterilir. Görsel yoksa **fallback** (varsayılan) logo gösterilir.

### 5. Arama (Search) Ayarları
- Açıklama bazlı arama **kaldırıldı**.
- **Ürün adı** ve **kategori adı** (alt kategoriler dahil) arama yapılabilir.
- Örnek: “şarap” yazdığınızda “Şarap” kategorisindeki tüm ürünler listelenir.

---

## 🍽️ Müşteri Menüsü – Kullanım
- QR kodu tarayın veya doğrudan `https://<your-domain>/<venue‑slug>` adresine gidin.
- **Ürün Görselleri** – Cloudinary’den gelen yüksek çözünürlüklü görseller gösterilir. Görsel yoksa fallback logo kullanılır.
- **Arama Çubuğu** – Ürün adı ya da kategori adı girerek hızlıca filtreleyebilirsiniz.
- **Kategori Zamanlaması** – Aktif olmayan kategoriler menüde **görünmez**.

---

## 📦 Deploy (Vercel) – Yayına Alma
1. **Vercel hesabı oluşturun** ve proje ekleyin.
2. **GitHub entegrasyonu** – `main` branch’ı Vercel’e bağlayın.
3. **Deploy** – `git push origin main` komutu Vercel’i tetikler.
4. **Git Author/Committer** – Vercel Hobby planı için `noreply` e‑posta (`emiros71@users.noreply.github.com`) kullanılmalı. Aksi takdirde “Deployment Blocked” hatası alınır.
5. **Ortam Değişkenleri** – Vercel dashboard’da `.env.local` içeriğini aynı şekilde ekleyin.

---

## 🛠️ Sık Karşılaşılan Sorunlar & Çözümler
| Sorun | Çözüm |
|-------|------|
| Görsel yüklenmiyor | Cloudinary URL’nin `https://res.cloudinary.com/...` formatında olduğundan emin olun. `next.config.ts` içinde `remotePatterns` ayarını kontrol edin. |
| Arama sonuçları eksik | `src/components/menu/RestaurantMenu.tsx` dosyasındaki `matchingCategoryIds` setini kontrol edin; kategori adı araması bu set üzerinden yapılır. |
| Kategori zamanlaması çalışmıyor | `src/lib/timeUtils.ts` içinde `isWithinTimeRange` fonksiyonunu inceleyin; `start` ve `end` değerleri doğru formatta (`HH:mm`) olmalı. |
| Deploy “Blocked” | Git config: `git config --global user.email "emiros71@users.noreply.github.com"` ve `git config --global user.name "emir"` komutlarını çalıştırın. |

---

## 📚 Ek Kaynaklar
- **Supabase Docs** – https://supabase.com/docs
- **Cloudinary Docs** – https://cloudinary.com/documentation
- **Next.js Docs** – https://nextjs.org/docs
- **Vercel Deploy Guide** – https://vercel.com/docs

---

## 📝 Notlar
- Proje **Next.js 14** (app router) kullanıyor; dosya yapısı `src/app` ve `src/components` altında.
- Stil için **TailwindCSS** yerine vanilla CSS tercih edilmiştir; `src/styles` klasöründeki `globals.css` dosyasını düzenleyebilirsiniz.
- Yeni bir özellik eklemek için `src/components/menu` içinde ilgili komponenti güncelleyin ve **test** eklemeyi unutmayın (`src/__tests__`).

> **İyi çalışmalar!**
