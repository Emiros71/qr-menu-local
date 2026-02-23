import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Aura Premium QR Menu',
        short_name: 'Aura',
        description: 'Dijital Menü ve Sipariş Sistemi',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#000000',
        icons: [
            {
                src: '/favicon.ico',
                sizes: '16x16 32x32 64x64',
                type: 'image/x-icon',
            }
        ],
    }
}
