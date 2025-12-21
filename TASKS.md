# QR Menü SaaS - Geliştirme Görevleri (Yol Haritası)

## Faz 1: Temel & Tasarım Sistemi (Tamamlandı)
- [x] **Tasarım Sistemini Kur**: Renk paleti (CSS değişkenleri), tipografi (Outfit) ve temel animasyonları `globals.css` içinde tanımla.
- [x] **Arayüz Bileşen Kütüphanesi**: Premium görünümlü yeniden kullanılabilir atomlar (Butonlar, Inputlar, Kartlar, Etiketler) oluştur.
- [x] **Mekan Temalandırma**: Birden fazla mekan (venue) için dinamik renk teması desteği ekle.

## Faz 2: Karşılama Sayfası & Menü Görünümü (Tamamlandı)
- [x] **Hero Alanı**: Dinamik öğeler ve etkileyici bir giriş bölümü.
- [x] **Çoklu Mekan Yönlendirmesi**: `/[slug]` yapısı ile dinamik olarak ilgili restoranın menüsünü yükle (Aura, One Bar vb.).
- [x] **Menü Arayüzü**: Kaydırınca aktifleşen (Scrollspy) navigasyon, yapışkan başlıklar ve ızgara ürün görünümü.
- [x] **Örnek Veri**: Aura, One Bar ve The Cafe için kapsamlı test verileri.

## Faz 3: Yönetim Paneli (Devam Ediyor)
- [x] **Panel Düzeni**: Mobil uyumlu kenar çubuğu (Sidebar) ve başlık yapısı.
- [x] **Analiz Grafikleri (AdminLTE Tarzı)**: Ciro, trafik, en çok satanlar gibi detaylı Recharts grafikleri.
- [x] **Mekan Editörü**: Mekan detaylarını, kategorileri ve ürünleri düzenleme arayüzü.
- [x] **Görsel Yükleme**: Ürün resimleri için Cloudinary entegrasyonu (Arayüz hazır).
- [ ] **Giriş / Yetkilendirme**: Yönetici girişi (Supabase/Firebase Auth).
- [ ] **Veritabanı Bağlantısı**: Gerçek verilerin okunup yazılması.

## Faz 4: Analiz & İçgörüler (Yeni)
- [x] **Veri Toplama Katmanı**: `[slug]/page.tsx` içinde Görüntüleme ve Tıklamaları takip etme yapısı.
- [ ] **Oturum Takibi**: Ziyaretçiler için anonim `sessionId` oluşturma ve saklama.
- [ ] **Veri Görselleştirme Bağlantısı**: Paneldeki grafikleri gerçek verilerle besleme.
- [ ] **Raporlama Servisi**: Aylık özet raporları oluşturma mantığı.

## Faz 5: Denetim & Güvenlik (Planlanan)
- [ ] **Yönetici İşlem Logları**: Yöneticilerin yaptığı değişiklikleri (oluşturma/silme) kayıt altına alma.
- [ ] **Rol Tabanlı Erişim**: Süper Yönetici vs. Restoran Müdürü ayrımı.
