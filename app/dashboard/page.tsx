export const dynamic = 'force-dynamic';

import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import prismadb from "@/lib/prismadb";
import { getTotalRevenue } from "@/actions/get-total-revenue";
import { getSalesCount } from "@/actions/get-sales-count";
import { getStockCount } from "@/actions/get-stock-count";
import { getPendingBookings } from "@/actions/get-pending-bookings";
import { getBookingsCount } from "@/actions/get-bookings-count";
import { getServicesCount } from "@/actions/get-services-count";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { checkAdminAccess } from "@/lib/admin-access";
import {
  CreditCard,
  DollarSign,
  Package,
  Users,
  Calendar,
  Scissors
} from "lucide-react";

const DashboardPage: React.FC = async () => {
  const { user } = await checkAdminAccess();

  if (!user) {
    redirect('/sign-in');
  }

  // Check if user has any saloons
  const userSaloons = await prismadb.saloon.findMany({
    where: {
      userId: user.id
    }
  });

  const hasSaloons = userSaloons.length > 0;

  // Don't redirect - show empty state instead to prevent redirect loops
  // When user has no saloons, we'll show a friendly message below
  // If user has no saloons, show empty state
  if (!hasSaloons) {
    return (
      <div className="flex-col">
        <div className="flex-1 space-y-4 p-8 pt-6">
          <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
            <Scissors className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Ei palveluja vielä</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              Aloita luomalla ensimmäinen palvelusi. Kun olet luonut palvelun, näet tilastot täällä.
            </p>
            <a
              href="/dashboard/saloons/new"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground h-10 px-4 py-2 hover:bg-primary/90"
            >
              Luo ensimmäinen palvelu
            </a>
          </div>
        </div>
      </div>
    );
  }

  const totalRevenue = await getTotalRevenue(user.id);
  const salesCount = await getSalesCount(user.id);
  const stockCount = await getStockCount(user.id);
  const pendingBookings = await getPendingBookings(user.id);
  const bookingsCount = await getBookingsCount(user.id);
  const servicesCount = await getServicesCount(user.id);

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        {/* <Heading title="Dashboard" description="Overview of your business" /> */}

        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Kokonaistulot
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalRevenue}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Palvelun myynti</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+{salesCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tarjoamasi palvelut</CardTitle>
              <Scissors className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{servicesCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Varaukset tarjolla</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bookingsCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vireillä olevia varauksia</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingBookings}</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
