import { MetadataRoute } from 'next';
import { VenueService } from '@/services/venue-service';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://qrmenu-saas.com';

    // Get all venues
    const venues = await VenueService.getVenues(null); // Fetch all without profile restriction

    const venueUrls = venues.map((venue) => ({
        url: `${baseUrl}/${venue.slug}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: 0.8,
    }));

    return [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 1,
        },
        ...venueUrls,
    ];
}
