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

## Faz 3: Yönetim Paneli (Devam Ediyor)
- [x] **Panel Düzeni**: Mobil uyumlu kenar çubuğu (Sidebar) ve başlık yapısı.
- [x] **Dashboard**: Ciro, trafik, en çok satanlar gibi detaylı grafikler (Şu an mock, yakında gerçek).
- [x] **Mekan Editörü**: Mekan detaylarını, kategorileri ve ürünleri düzenleme arayüzü (Canlı DB bağlantılı).
- [ ] **Toplu Veri Yükleme (Excel)**: Ürünleri, kategorileri ve detayları (alerjen, fiyat vb.) Excel'den içe aktarma.
- [x] **Site Ayarları**: Ana sayfa başlıkları ve arka planını değiştiren ayarlar sayfası.
- [x] **Görsel Yönetimi**: Cloudinary entegrasyonu (İmzalı/Güvenli Yükleme).
- [ ] **Ürün Resim Yönetimi**: Mekan editöründe ürün resimlerini yükleme özelliği.
- [ ] **Giriş / Yetkilendirme**: Yönetici girişi (Supabase Auth).

## Faz 4: Analiz & İçgörüler (Sırada)
- [x] **Veri Toplama Katmanı**: `[slug]/page.tsx` içinde Görüntüleme ve Tıklamaları takip etme yapısı.
- [ ] **Veri Kaydı**: Analitik olaylarının Supabase'e yazılması.
- [ ] **Veri Görselleştirme Bağlantısı**: Paneldeki grafikleri gerçek verilerle besleme.

## Faz 5: Denetim & Güvenlik (Planlanan)
- [ ] **Yönetici İşlem Logları**: Yöneticilerin yaptığı değişiklikleri (oluşturma/silme) kayıt altına alma.
- [ ] **Rol Tabanlı Erişim**: Süper Yönetici vs. Restoran Müdürü ayrımı.
