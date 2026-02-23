import { VenueService } from "@/services/venue-service";
import RestaurantMenu from "@/components/menu/RestaurantMenu";
import { notFound } from "next/navigation";
import { Metadata } from "next";

// Force dynamic rendering on the server
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const venue = await VenueService.getVenueBySlug(slug);

    if (!venue) {
        return {
            title: "Mekan Bulunamadı",
            description: "Aradığınız mekan sistemimizde bulunamadı."
        };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const defaultCover = venue.coverImage || (venue.theme as any)?.defaultProductImage || "https://upload.wikimedia.org/wikipedia/commons/4/4b/Crowne_Plaza_Hotels_%26_Resorts_logo.svg";

    return {
        title: `${venue.name} | QR Menu`,
        description: venue.description || `${venue.name} dijital menüsü. Lezzetlerimizi keşfedin!`,
        openGraph: {
            title: `${venue.name} - Dijital Menü`,
            description: venue.description || `${venue.name} dijital menüsü. Lezzetlerimizi keşfedin!`,
            images: [
                {
                    url: defaultCover,
                    width: 1200,
                    height: 630,
                    alt: venue.name,
                },
            ],
            type: "website",
        },
        twitter: {
            card: "summary_large_image",
            title: `${venue.name} - Dijital Menü`,
            description: venue.description || `${venue.name} dijital menüsü. Lezzetlerimizi keşfedin!`,
            images: [defaultCover],
        }
    };
}

export default async function RestaurantPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const venue = await VenueService.getVenueBySlug(slug);

    if (!venue) {
        return notFound();
    }

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Restaurant",
        "name": venue.name,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        "image": venue.coverImage || (venue.theme as any)?.defaultProductImage || "",
        "description": venue.description || `${venue.name} dijital menüsü.`,
        "url": `https://app.com/${venue.slug}` // Change app.com to your actual domain
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <RestaurantMenu venue={venue} />
        </>
    );
}
