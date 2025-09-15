import { getBookingsCount } from "@/actions/get-bookings-count";
import { getServicesCount } from "@/actions/get-services-count";
import { getTotalRevenue } from "@/actions/get-total-revenue";
import { getPendingBookings } from "@/actions/get-pending-bookings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { formatter } from "@/lib/utils";
import { Calendar, Scissors, Clock, DollarSign } from "lucide-react";
import { getOwnedSelectedSaloon, getSelectedSaloonIdForStore } from "@/lib/saloon";
import { checkSalonAccess } from "@/lib/salon-access";

interface DashboardPageProps {
    params: { storeId: string }
};

const DashboardPage: React.FC<DashboardPageProps> = async ({
    params
}) => {
    // Check if user has salons, redirect if not
    await checkSalonAccess(params.storeId);
    
    const selectedSaloon = await getOwnedSelectedSaloon(params.storeId);
    const selectedSaloonId = selectedSaloon?.id;
    const totalRevenue = await getTotalRevenue(params.storeId, selectedSaloonId);
    const bookingsCount = await getBookingsCount(params.storeId, selectedSaloonId);
    const servicesCount = await getServicesCount(params.storeId, selectedSaloonId);
    const pendingBookings = await getPendingBookings(params.storeId, selectedSaloonId);

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
                <Heading title={`${selectedSaloon?.name ?? "Spa"} Dashboard`} description={`Overview of your ${selectedSaloon?.name ?? "spa"} business`} />
            
                <Separator />
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Total Revenue
                            </CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {formatter.format(totalRevenue)}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                From completed bookings
                            </p>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Completed Bookings
                            </CardTitle>
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {bookingsCount}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Successfully completed
                            </p>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Available Services
                            </CardTitle>
                            <Scissors className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {servicesCount}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Services offered
                            </p>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Pending Bookings
                            </CardTitle>
                            <Clock className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {pendingBookings}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Awaiting confirmation
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

export default DashboardPage;