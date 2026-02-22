import { VenueService } from "@/services/venue-service";
import RestaurantMenu from "@/components/menu/RestaurantMenu";
import { notFound } from "next/navigation";

// Force dynamic rendering on the server
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function RestaurantPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const venue = await VenueService.getVenueBySlug(slug);

    if (!venue) {
        return notFound();
    }

    return <RestaurantMenu venue={venue} />;
}
