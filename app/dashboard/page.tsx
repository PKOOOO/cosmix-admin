// app/dashboard/page.tsx
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
import { 
  CreditCard, 
  DollarSign, 
  Package,
  Users,
  Calendar,
  Scissors
} from "lucide-react";

const DashboardPage: React.FC = async () => {
  const { userId } = auth();

  if (!userId) {
    redirect('/sign-in');
  }

  // Find the user in your database using the Clerk ID
  const user = await prismadb.user.findUnique({
    where: { 
        clerkId: userId 
    }
  });

  if (!user) {
    redirect('/post-sign-in');
  }

  // Check if user has any saloons
  const userSaloons = await prismadb.saloon.findMany({
    where: {
        userId: user.id
    }
  });

  const hasSaloons = userSaloons.length > 0;

  if (!hasSaloons) {
    redirect('/dashboard/saloons');
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
                Total Revenue
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalRevenue}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sales</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+{salesCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Services</CardTitle>
              <Scissors className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{servicesCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bookingsCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Bookings</CardTitle>
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
