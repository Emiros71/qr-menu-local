# 🚀 QR Menu On-Premise (Local) Geçiş Görevleri

Bu dosya, güncel `qr-menu-local` projesinin %100 kendi sunucunuzda (HPE Gen10) dışarıya kapalı olarak Vercel ve Cloudinary BAAĞIMSIZ çalışabilmesi için yapılması gerekenleri adım adım listelemektedir.

## 📝 1. Çift Yönlü Depolama (Storage) Altyapısı (Biz Yapacağız)
Şu anda `ImageUpload.tsx` resmi sadece Cloudinary'e yüklüyor. Bunu değiştireceğiz:
- [x] Sistemi `NEXT_PUBLIC_STORAGE_PROVIDER` ortam değişkenine göre akıllı hale getirmek.
- [x] Buluttayken (Değer yoksa veya `cloudinary` ise) eskisini çalışır tutmak.
- [x] Lokal sunucudayken (`supabase` ise) resmi yerel Supabase'in *Storage Bucket* bölgesine atacak fonksiyonel yüklemeyi yazmak.

## 🎨 2. Arayüz ve Güvenlik Limitlerinin Açılması (Biz Yapacağız)
Next.js bilmediği IP ve alan adlarından gelen fotoğrafları kapatır.
- [x] `next.config.ts` dosyasına kendi sunucu IP/alan adlarınızı (Lokal Supabase url/IP'leri) ekleyebilmesi için dinamik veya geniş bir `remotePattern` eklenmesi.

## 🗄️ 3. Coolify: Supabase Sunucu Kurulumu (Siz/Beraber Yapacağız)
Proje kodlarını uyarladıktan sonra sunucuda ortamın hazırlanması gerekir:
- [x] Coolify panelinde **Services > 1-Click Apps > Supabase** seçilerek lokal bir Supabase ayağa kaldırılmalı.
- [ ] Kurulum bitince verilen Lokal URL ve Anon Key kopyalanmalı.
- [x] (Önemli) Lokal Supabase arayüzünden `qr-menu` veya `menu-images` adında yeni public bir **Storage Bucket** açılmalı. (Böylece Cloudinary yerine tüm logolar ve yiyecek resimleri bu klasöre atılabilecek).

## 🚀 4. Projenin (Frontend) Lokal Coolify'da Dağıtımı (Siz Yapacaksınız)
Tüm veritabanı kurulduğunda uygulamanın kendisini ayağa kaldıracağız.
- [ ] Modifiye ettiğimiz bu `qr-menu-local` kodlarını Coolify'da "Next.js" projesi olarak kurmak.
- [ ] Ayarlardan Environment Variables bölümüne şunları girmek:
  - `NEXT_PUBLIC_SUPABASE_URL=http://kendi-supabaseniz:8000`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY=sizin-lokal-keyiniz`
  - `NEXT_PUBLIC_STORAGE_PROVIDER=supabase`
- [ ] Uçtan uca test ederek uygulamanın artık internet bağlantısı olmadan bile kendi içerisinde siparişleri ve menüleri dağıtabildiğini doğrulamak.
