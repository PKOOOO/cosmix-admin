// app/dashboard/saloons/page.tsx
export const dynamic = 'force-dynamic';

import prismadb from "@/lib/prismadb";
import { format } from "date-fns";
import { SaloonClient } from "./components/client";
import { SaloonColumn } from "./components/columns";
import { SaloonsError } from "./error-component";
import { checkAdminAccess } from "@/lib/admin-access";

const SaloonsPage = async () => {
    try {
        const { user } = await checkAdminAccess();
        const ownerId = user?.id;

        if (ownerId) {
            console.log('[SALOONS_PAGE] Found user:', user.email);
        }

        if (!ownerId) {
            console.log('[SALOONS_PAGE] No ownerId found, showing sign in message');
            return (
                <div className="flex-col">
                    <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
                        <div className="text-center">
                            <h1 className="text-2xl font-semibold mb-4">Please sign in to view your saloons</h1>
                        </div>
                    </div>
                </div>
            );
        }

        const saloons = await prismadb.saloon.findMany({
            where: {
                userId: ownerId,
            },
            include: {
                images: true,
                saloonServices: {
                    include: {
                        service: {
                            include: {
                                category: true,
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        console.log('[SALOONS_PAGE] Found saloons:', saloons.length);

        // Fetch rating aggregates per saloon (only if there are saloons)
        const saloonIdToRating = new Map<string, { avg: number; count: number }>();

        if (saloons.length > 0) {
            try {
                const saloonIds = saloons.map(s => s.id);
                const ratings = await (prismadb as any).saloonReview.groupBy({
                    by: ['saloonId'],
                    where: { saloonId: { in: saloonIds } },
                    _avg: { rating: true },
                    _count: { rating: true },
                });
                ratings.forEach((r: any) => {
                    saloonIdToRating.set(r.saloonId as string, {
                        avg: r._avg.rating || 0,
                        count: r._count.rating || 0
                    });
                });
                console.log('[SALOONS_PAGE] Fetched ratings for', ratings.length, 'saloons');
            } catch (error) {
                console.error('[SALOONS_PAGE] Error fetching ratings:', error);
                // Continue without ratings if there's an error
            }
        }

        const formattedSaloons: SaloonColumn[] = saloons.map((item) => {
            // Filter only sub-services with pricing information
            const subServices = item.saloonServices
                .filter(saloonService => saloonService.service.parentServiceId !== null)
                .map(saloonService => ({
                    name: saloonService.service.name,
                    price: saloonService.price,
                    duration: saloonService.durationMinutes,
                    isAvailable: saloonService.isAvailable,
                }));

            const agg: { avg: number; count: number } = saloonIdToRating.get(item.id) || { avg: 0, count: 0 } as { avg: number; count: number };
            return {
                id: item.id,
                name: item.name,
                shortIntro: item.shortIntro || "",
                address: item.address || "",
                imageUrl: item.images[0]?.url || "",
                subServices: subServices,
                averageRating: agg.avg,
                ratingsCount: agg.count,
                createdAt: format(item.createdAt, "MMMM do, yyyy")
            };
        });

        return (
            <div className="flex-col">
                <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
                    <SaloonClient data={formattedSaloons} />
                </div>
            </div>
        );
    } catch (error) {
        console.error('[SALOONS_PAGE] Error rendering page:', error);
        // Return error UI instead of throwing to prevent redirect loop
        return <SaloonsError />;
    }
}

export default SaloonsPage;
