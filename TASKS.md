# QR Menü SaaS - Geliştirme Görevleri (Yol Haritası)

## Faz 1: Temel & Tasarım Sistemi (Tamamlandı)
- [x] **Tasarım Sistemini Kur**: Renk paleti (CSS değişkenleri), tipografi (Outfit) ve temel animasyonları `globals.css` içinde tanımla.
- [x] **Arayüz Bileşen Kütüphanesi**: Premium görünümlü yeniden kullanılabilir atomlar (Butonlar, Inputlar, Kartlar, Etiketler) oluştur.
- [x] **Mekan Temalandırma**: Birden fazla mekan (venue) için dinamik renk teması desteği ekle.

## Faz 2: Karşılama Sayfası & Menü Görünümü (Tamamlandı)
- [x] **Hero Alanı**: Dinamik öğeler ve etkileyici bir giriş bölümü (Admin panelinden yönetilebilir).
- [x] **Çoklu Mekan Yönlendirmesi**: `/[slug]` yapısı ile dinamik olarak ilgili restoranın menüsünü yükle (Aura, One Bar vb.).
- [x] **Menü Arayüzü**: Kaydırınca aktifleşen (Scrollspy) navigasyon, yapışkan başlıklar ve ızgara ürün görünümü.
- [x] **Veritabanı Entegrasyonu**: Supabase üzerinden gerçek verilerin çekilmesi.

## Faz 3: Yönetim Paneli (Tamamlandı)
- [x] **Panel Düzeni**: Mobil uyumlu kenar çubuğu (Sidebar) ve başlık yapısı.
- [x] **Dashboard**: Ciro, trafik, en çok satanlar gibi detaylı grafikler.
- [x] **Mekan Editörü**: Mekan detaylarını, kategorileri ve ürünleri düzenleme arayüzü (Canlı DB bağlantılı).
- [x] **Toplu Veri Yükleme (Excel)**: Ürün/Kategori içe aktarma, güncelleme desteği ve Kategori Eşleştirme Sihirbazı.
- [x] **Gelişmiş Ürün Yönetimi**: Modal tabanlı ürün ekleme/düzenleme, boş form desteği ve detaylı alanlar.
- [x] **Alerjen Yönetimi**: Dinamik alerjen listesi ve anlık yeni alerjen ekleme özelliği.
- [x] **Site Ayarları**: Ana sayfa başlıkları ve arka planını değiştiren ayarlar sayfası.
- [x] **Görsel Yönetimi**: Cloudinary entegrasyonu (İmzalı yükleme, Toplu yükleme sihirbazı, Duplicate önleme).
- [x] **API Güvenliği**: Service Role Key kullanan güvenli Admin API rotaları (RLS Bypass).
- [ ] **Giriş / Yetkilendirme**: Yönetici girişi (Supabase Auth).

## Faz 4: Analiz & İçgörüler (Sırada)
- [x] **Veri Toplama Katmanı**: `[slug]/page.tsx` içinde Görüntüleme ve Tıklamaları takip etme yapısı.
- [ ] **Veri Kaydı**: Analitik olaylarının Supabase'e yazılması.
- [ ] **Veri Görselleştirme Bağlantısı**: Paneldeki grafikleri gerçek verilerle besleme.

## Faz 5: Denetim & Test (Planlanan)
- [x] **E2E Test Altyapısı**: Playwright ile Admin paneli, UI etkileşimleri ve izole test senaryoları.
- [ ] **Yönetici İşlem Logları**: Yöneticilerin yaptığı değişiklikleri (oluşturma/silme) kayıt altına alma.
- [ ] **Rol Tabanlı Erişim**: Süper Yönetici vs. Restoran Müdürü ayrımı.

## Faz 6: Görünüm & UX (Devam Ediyor)
- [x] **Varsayılan Görsel**: Görseli olmayan ürünler için kurumsal logo (Crowne Plaza) kullanımı.
        **Varsayılan Görsel**: Burada mekanlara göre değişiklik gösterecek.
- [ ] **Animasyonlar**: Sayfa geçişleri ve mikro etkileşimler.
- [ ] **Görünüm & Performans**: Optimizasyon ve hız iyileştirmeleri.

## Faz 7: Çoklu Dil & Alerjen Sistemi (Tamamlandı ✅ - 24.12.2024)
- [x] **i18n Altyapısı**: Mekanlar için çoklu dil desteği (supportedLanguages, defaultLanguage).
- [x] **Dil Değiştirici**: Müşteri menüsünde sticky header'da dil seçici.
- [x] **Ürün/Kategori Çevirileri**: Admin panelde her ürün ve kategori için dil bazlı çeviri girişi.
- [x] **React Hydration Hatası Düzeltmesi**: suppressHydrationWarning ile tarayıcı uzantı uyumsuzluğu çözümü.
- [x] **Alerjen Kütüphanesi (Global)**: Tüm mekanlarda ortak kullanılan merkezi alerjen veritabanı.
- [x] **Alerjen CRUD Yönetimi**: Admin panelde yeni tab ile alerjen ekleme, düzenleme, silme ve çeviri.
- [x] **Alerjen Çoklu Dil**: Her alerjen için tüm desteklenen dillerde çeviri desteği.
- [x] **Ürün Bazlı Alerjen İstatistiği**: Her alerjenin kaç üründe kullanıldığını gösterme.
- [x] **Müşteri Menüsünde Alerjen Çevirileri**: DB'den dinamik alerjen çevirileri gösterimi.
- [x] **Kaydet Butonu Geri Bildirimi**: Admin panelde değişikliklerin kaydedildiğini bildiren uyarılar.
- [x] **E2E i18n Testleri**: Playwright ile dil değiştirme ve çeviri testleri.

## Faz 8: Bekleyen Görevler (Yeni - 24.12.2024)
- [ ] **Excel Formatları Güncelleme**: Alerjen sistemi için Excel import/export formatlarını güncelle.
- [ ] **Excel Format Kontrolü**: Ürün/Kategori Excel şablonlarını yeni yapıya göre test et.
- [ ] **Alerjen Sistemi E2E Testleri**: Global alerjen kütüphanesi için kapsamlı testler yaz.
- [ ] **Admin Panel Alerjen Testleri**: CRUD işlemleri ve çoklu dil testleri.
- [ ] **Müşteri Menü Alerjen Testleri**: Alerjen gösterimi ve çeviri değişimi testleri.
