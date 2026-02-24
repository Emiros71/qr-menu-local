import imageCompression from 'browser-image-compression';

interface CompressionOptions {
    maxSizeMB?: number;
    maxWidthOrHeight?: number;
    useWebWorker?: boolean;
}

const defaultOptions: CompressionOptions = {
    maxSizeMB: 1, // Max 1MB
    maxWidthOrHeight: 1200, // Max 1200px (genişlik veya yüksekliğe göre orantılı küçültür)
    useWebWorker: true,
};

/**
 * İstemci tarafında (tarayıcıda) görsel dosyalarını sıkıştırır.
 * Cloudinary gibi bulut hizmetlerine yüklemeden önce kota tasarrufu sağlamak ve 
 * yükleme hızlarını artırmak için kullanılır.
 * 
 * @param file Sıkıştırılacak görsel dosyası
 * @param customOptions Özel sıkıştırma ayarları (opsiyonel)
 * @returns Sıkıştırılmış dosya (veya hata durumunda orijinal dosyanın kendisi)
 */
export async function compressImage(file: File, customOptions?: CompressionOptions): Promise<File> {
    // Sadece görselleri sıkıştır (PDF, vs. geldiyse atla)
    if (!file.type.startsWith('image/')) {
        return file;
    }

    const options = { ...defaultOptions, ...customOptions };

    try {
        console.log(`[Compression] Orijinal dosya boyutu: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
        const compressedBlob = await imageCompression(file, options);

        // return blob as File object ensuring name and lastModified are kept
        const compressedFile = new File([compressedBlob], file.name, {
            type: compressedBlob.type,
            lastModified: Date.now(),
        });

        console.log(`[Compression] Sıkıştırılmış dosya boyutu: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);

        // Eğer sıkıştırma sonucu dosya büyüdüyse (nadiren olur: çok küçük görsellerde) orijinali dön
        if (compressedFile.size > file.size) {
            console.warn("[Compression] Sıkıştırılmış dosya orijinalden büyük oldu, orijinal kullanılıyor.");
            return file;
        }

        return compressedFile;
    } catch (error) {
        console.error("[Compression] Görsel sıkıştırma hatası:", error);
        // Hata durumunda yüklemenin durmaması için orijinal dosyayı döndür
        return file;
    }
}
