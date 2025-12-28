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
- [ ] **Giriş / Yetkilendirme**: Yönetici girişi (Supabase Auth) - *Faz 9'a taşındı*.

## Faz 4: Analiz & İçgörüler (Devam Eden - Kısmen Tamamlandı)
- [x] **Veri Toplama Katmanı**: `[slug]/page.tsx` içinde Görüntüleme ve Tıklamaları takip etme yapısı.
- [ ] **Veri Kaydı**: Analitik olaylarının Supabase'e yazılması.
- [ ] **Veri Görselleştirme Bağlantısı**: Paneldeki grafikleri gerçek verilerle besleme.

## Faz 5: Denetim & Test (Planlanan - Faz 11'e Genişletildi)
- [x] **E2E Test Altyapısı**: Playwright ile Admin paneli, UI etkileşimleri ve izole test senaryoları.
- [ ] **Yönetici İşlem Logları**: Yöneticilerin yaptığı değişiklikleri kayıt altına alma - *Faz 11'de detaylandırıldı*.
- [ ] **Rol Tabanlı Erişim**: Süper Yönetici vs. Restoran Müdürü ayrımı - *Faz 9'da detaylandırıldı*.

## Faz 6: Görünüm & UX (Devam Ediyor - Faz 12 ile Birleşecek)
- [x] **Varsayılan Görsel**: Görseli olmayan ürünler için kurumsal logo (Crowne Plaza) kullanımı.
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

## Faz 8: Bekleyen & Son Tamamlanan Görevler (24.12.2024 ve 28.12.2024)
- [x] **Excel Formatları Güncelleme**: Alerjen ve Çeviri (EN) desteği için Excel import şablonunu ve mantığını güncelle.
- [x] **Excel Format Kontrolü**: Ürün/Kategori Excel şablonlarını yeni i18n yapısına göre güncelle.
- [x] **Alerjen Eşleşme İyileştirmesi**: Büyük/küçük harf duyarsız (case-insensitive) alerjen eşleşmesi (Süt == süt).
- [ ] **Alerjen Sistemi E2E Testleri**: Global alerjen kütüphanesi için kapsamlı testler yaz.
- [ ] **Admin Panel Alerjen Testleri**: CRUD işlemleri ve çoklu dil testleri.
- [ ] **Müşteri Menü Alerjen Testleri**: Alerjen gösterimi ve çeviri değişimi testleri.

---

## Faz 9: SaaS Altyapısı & Güvenlik (ÖNCELİKLİ - YENİ) 🔐
*Gerçek bir SaaS deneyimi için çoklu kullanıcı ve rol yönetimi.*
- [ ] **Supabase Auth Entegrasyonu**: Admin paneli için Login (Giriş) sayfası yap.
- [ ] **Kullanıcı Profilleri**: `profiles` tablosu oluştur (User ID -> Venue ID eşleşmesi).
- [ ] **Rol Tabanlı Erişim (RBAC)**:
    - **Süper Admin**: Tüm mekanları görür/yönetir (SaaS sahibi).
    - **Mekan Yöneticisi**: Sadece kendi mekanını görür/düzenler.
    - **Personel**: Sadece temel işlemleri yapabilir (örn: ürün stok durumu).
- [ ] **Middleware Koruması**: `/admin` rotalarını yetkisiz erişime kapat.

## Faz 10: Akıllı Menü & Zaman Yönetimi (YENİ ⭐)
*Gündüz/Gece menüsü gibi zamana bağlı gösterim senaryoları.*
- [ ] **Zaman Çizelgesi Veri Yapısı**: Kategorilere `start_time` (09:00) ve `end_time` (14:00) kolonları ekle.
- [ ] **Admin Ayarları**: Kategori düzenleme modunda saat aralığı seçici (Time Picker) ekle.
- [ ] **Mekan Saat Dilimi**: Mekan ayarlarına `timezone` seçeneği ekle.
- [ ] **Dinamik Müşteri Menüsü**:
    - Müşteri siteye girdiğinde saati kontrol et.
    - Saati gelmemiş kategorileri otomatik gizle veya "Şu an kapalı" olarak silik göster.

## Faz 11: Denetim & Gözlemlenebilirlik (Audit Logs - YENİ) 👁️
*Kim, ne zaman, neyi değiştirdi?*
- [ ] **Audit Logs Tablosu**: `logs` tablosu oluştur (log_id, admin_id, action_type, resource, details, timestamp).
- [ ] **Log Servisi**: Tüm kritik `DbService` işlemleri (create, update, delete) sonrasında otomatik log kaydı oluşturan yapı.
- [ ] **Admin Aktivite Sayfası**: Yöneticilerin geçmiş işlemleri görebileceği, filtrelenebilir bir "İşlem Geçmişi" sayfası.

## Faz 12: Frontend Cilalama & Analiz (UX Polish - YENİ) ✨
*Daha akıcı ve ölçülebilir bir müşteri deneyimi.*
- [ ] **Analitik Uyumluluğu**: Ürün kartlarına `data-product-id`, `data-category` gibi analiz tool'larının okuyabileceği attribute'lar.
- [ ] **Loading Skeletons**: Sayfa yüklenirken içerik iskeletleri gösterimi.
- [ ] **Framer Motion Animasyonları**: Kategori geçişleri, sepet hareketleri, dil değişimi efektleri.
- [ ] **Empty States**: Boş durumlar için kullanıcı dostu tasarımlar.
