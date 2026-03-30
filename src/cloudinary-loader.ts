'use client'

export default function cloudinaryLoader({ src, width, quality }: { src: string, width: number, quality?: number }) {
  // Cloudinary dışı görseller veya geçersiz URL'ler için olduğu gibi döndür
  if (!src || !src.includes('res.cloudinary.com')) {
    return src;
  }
  
  // Cloudinary URL Örneği:
  // https://res.cloudinary.com/demo/image/upload/v12345/folder/image.jpg
  // Araya sıkıştırma ve boyut parametreleri eklemek istiyoruz: f_auto,q_auto,w_{width}
  
  const params = ['f_auto', 'c_limit', `w_${width}`, `q_${quality || 'auto'}`];
  
  // "/upload/" parçasını bulup araya giriyoruz
  const uploadIndex = src.indexOf('/upload/');
  if (uploadIndex === -1) return src;
  
  const beforeUpload = src.substring(0, uploadIndex + 8); // '/upload/' dahil
  const afterUpload = src.substring(uploadIndex + 8);
  
  return `${beforeUpload}${params.join(',')}/${afterUpload}`;
}
