# VPS Backup & Restore

Coolify + Supabase + Next.js uygulamanızı tek bir komutla yedekleyin ve başka bir VPS'e taşıyın.

## İçerik

- `scripts/backup.sh` — Mevcut VPS'ten tam yedek alır
- `scripts/restore.sh` — Yeni VPS'e yedeği geri yükler

## Ne Yedeklenir?

| Bileşen | Açıklama |
|---|---|
| Supabase Veritabanları | Tüm PostgreSQL veritabanları (pg_dump) |
| Coolify Yapılandırması | `/data/coolify` dizini ve Coolify DB |
| Docker Volume'ları | Supabase, Coolify ve uygulama volume'ları |
| Uygulama Dosyaları | Next.js kaynak kodu ve build dosyaları |
| Environment Dosyaları | Tüm `.env*` dosyaları |
| Docker Compose | `docker-compose*.yml` dosyaları |

## Kullanım

### 1. Yedek Alma (Mevcut VPS)

Script'i VPS'e gönderin:

```bash
scp scripts/backup.sh root@vps-ip:/root/
```

Mevcut VPS'te çalıştırın:

```bash
ssh root@vps-ip
chmod +x /root/backup.sh
bash /root/backup.sh
```

Çıktı örneği:

```
[BACKUP] === QR Menu VPS Backup ===
[BACKUP] Starting backup: qr-menu-backup-2026-04-04_143022
[BACKUP] Found Postgres container: supabase-db
[BACKUP] Dumping database: supabase
[BACKUP] Backing up Coolify configuration
[BACKUP] Backing up Docker volumes
[BACKUP] === Backup Complete ===
[BACKUP] Archive: /root/qr-menu-backups/qr-menu-backup-2026-04-04_143022.tar.gz
[BACKUP] Size: 245M
```

Yedek dosyası: `/root/qr-menu-backups/qr-menu-backup-YYYY-MM-DD_HHMMSS.tar.gz`

### 2. Yeni VPS'e Transfer

```bash
scp /root/qr-menu-backups/qr-menu-backup-*.tar.gz root@yeni-vps-ip:/root/
```

### 3. Geri Yükleme (Yeni VPS)

Script'i yeni VPS'e gönderin:

```bash
scp scripts/restore.sh root@yeni-vps-ip:/root/
```

Yeni VPS'te çalıştırın:

```bash
ssh root@yeni-vps-ip
chmod +x /root/restore.sh
bash /root/restore.sh /root/qr-menu-backup-2026-04-04_143022.tar.gz
```

Restore scripti otomatik olarak:
1. Coolify kurulumunu kontrol eder (yoksa kurar)
2. Docker volume'ları geri yükler
3. Supabase veritabanlarını import eder
4. Uygulama dosyalarını yerine koyar
5. `.env` dosyalarını geri yükler
6. Tüm servisleri yeniden başlatır

## Taşıma Sonrası Kontrol Listesi

- [ ] Coolify Dashboard'a giriş yap: `http://<yeni-vps-ip>:8000`
- [ ] Tüm uygulamaların çalıştığını doğrula
- [ ] Supabase bağlantısını test et
- [ ] `.env` dosyalarındaki domain/IP değerlerini güncelle:
  - `NEXT_PUBLIC_SITE_URL`
  - `NEXT_PUBLIC_SUPABASE_URL` (eğer Supabase URL'si değiştiyse)
- [ ] QR menü URL'lerini test et
- [ ] DNS kayıtlarını yeni VPS IP'sine yönlendir

## Otomatik Yedekleme (Cron)

Her gün otomatik yedek almak için:

```bash
# Crontab'a ekle (her gün saat 03:00)
0 3 * * * /root/backup.sh >> /var/log/qr-menu-backup.log 2>&1
```

Eski yedekleri temizlemek için (son 7 gün):

```bash
0 4 * * * find /root/qr-menu-backups -name "*.tar.gz" -mtime +7 -delete
```

## Sorun Giderme

### "No Supabase Postgres container found"

Supabase container adı farklı olabilir. Container listesini kontrol edin:

```bash
docker ps --format '{{.Names}}' | grep -i postgres
```

### "Coolify installation failed"

Coolify'yi manuel kurun:

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

### Veritabanı restore hatası

Veritabanını manuel restore edin:

```bash
# SQL dosyası için
docker exec -i <postgres-container> psql -U postgres -d <db-name> < backup.sql

# Dump dosyası için
docker exec -i <postgres-container> pg_restore -U postgres -d <db-name> --clean --if-exists < backup.dump
```

### Volume restore hatası

Volume'ları manuel kontrol edin:

```bash
docker volume ls
docker run --rm -v <volume-name>:/volume alpine ls /volume
```
