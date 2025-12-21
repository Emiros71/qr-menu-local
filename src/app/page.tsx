import Link from "next/link";
import { venues } from "@/data/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import Image from "next/image";

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-zinc-50 flex flex-col items-center py-20 px-4">
            <h1 className="text-4xl font-bold mb-8 text-center text-zinc-900">Oteller & Restoranlar</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl w-full">
                {venues.map((venue) => (
                    <Link href={`/${venue.slug}`} key={venue.id} className="group">
                        <Card className="overflow-hidden hover:shadow-xl transition-shadow h-full border-zinc-200">
                            <div className="relative h-48 w-full bg-zinc-100">
                                {venue.coverImage && (
                                    <Image
                                        src={venue.coverImage}
                                        alt={venue.name}
                                        fill
                                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                )}
                                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                            </div>
                            <CardHeader>
                                <CardTitle className="text-xl">{venue.name}</CardTitle>
                                <CardDescription>{venue.description}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <span className="text-sm font-medium text-primary">Menüyü İncele &rarr;</span>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}
