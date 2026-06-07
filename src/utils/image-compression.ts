import imageCompression from 'browser-image-compression';

interface CompressionOptions {
    maxSizeMB?: number;
    maxWidthOrHeight?: number;
    useWebWorker?: boolean;
}

const defaultOptions: CompressionOptions = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1200,
    useWebWorker: true,
};

/**
 * Istemci tarafinda gorsel dosyalarini sikistirir.
 * Yukleme kotasini azaltmak ve aktarim hizini iyilestirmek icin kullanilir.
 */
export async function compressImage(file: File, customOptions?: CompressionOptions): Promise<File> {
    if (!file.type.startsWith('image/')) {
        return file;
    }

    const options = { ...defaultOptions, ...customOptions };

    try {
        console.log(`[Compression] Original file size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
        const compressedBlob = await imageCompression(file, options);

        const compressedFile = new File([compressedBlob], file.name, {
            type: compressedBlob.type,
            lastModified: Date.now(),
        });

        console.log(`[Compression] Compressed file size: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);

        if (compressedFile.size > file.size) {
            console.warn("[Compression] Compressed file is larger than the original; using the original.");
            return file;
        }

        return compressedFile;
    } catch (error) {
        console.error("[Compression] Image compression failed:", error);
        return file;
    }
}
