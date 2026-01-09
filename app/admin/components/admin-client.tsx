"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Settings, Users, Package, Building2, Euro } from "lucide-react";
import { AdminCategoriesClient } from "./admin-categories-client";
import { AdminServicesClient } from "./admin-services-client";
import { AdminRevenueClient } from "./admin-revenue-client";
import { AdminSaloonsListClient } from "./admin-saloons-list-client";


interface AdminStats {
  globalCategories: number;
  parentServices: number;
  totalSaloons: number;
  totalEnrolledServices: number;
  totalRevenue: number;
}

export const AdminClient = () => {
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats>({
    globalCategories: 0,
    parentServices: 0,
    totalSaloons: 0,
    totalEnrolledServices: 0,
    totalRevenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [showRevenue, setShowRevenue] = useState(false);
  const [showSaloons, setShowSaloons] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get('/api/admin/stats');
        setStats(response.data);
      } catch (error) {
        console.error('Error fetching admin stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  // Show Revenue details view
  if (showRevenue) {
    return <AdminRevenueClient onBack={() => setShowRevenue(false)} />;
  }

  // Show Saloons list view
  if (showSaloons) {
    return <AdminSaloonsListClient onBack={() => setShowSaloons(false)} />;
  }



  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}


      {/* Stats Cards - 2x2 on mobile, 4 cols on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 p-3 md:p-6">
            <CardTitle className="text-xs md:text-sm font-medium">Categories</CardTitle>

          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold">
              {loading ? "..." : stats.globalCategories}
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:border-[#423120]/50 transition-colors"
          onClick={() => setShowRevenue(true)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 p-3 md:p-6">
            <CardTitle className="text-xs md:text-sm font-medium">Revenue</CardTitle>

          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold text-green-600">
              {loading ? "..." : `€${stats.totalRevenue.toFixed(2)}`}
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:border-[#423120]/50 transition-colors"
          onClick={() => setShowSaloons(true)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 p-3 md:p-6">
            <CardTitle className="text-xs md:text-sm font-medium">Saloons</CardTitle>

          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold">
              {loading ? "..." : stats.totalSaloons}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 p-3 md:p-6">
            <CardTitle className="text-xs md:text-sm font-medium">Enrolled Services</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold">
              {loading ? "..." : stats.totalEnrolledServices}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="categories" className="space-y-4">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="categories">Global Categories</TabsTrigger>
          <TabsTrigger value="services">Parent Services</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-4">
          <AdminCategoriesClient />
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <AdminServicesClient />
        </TabsContent>
      </Tabs>
    </div>
  );
};
