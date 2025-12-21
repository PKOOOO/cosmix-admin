"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Settings, Users, Package, Building2 } from "lucide-react";
import { AdminCategoriesClient } from "./admin-categories-client";
import { AdminServicesClient } from "./admin-services-client";

interface AdminStats {
  globalCategories: number;
  parentServices: number;
  totalSaloons: number;
  totalUsers: number;
}

export const AdminClient = () => {
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats>({
    globalCategories: 0,
    parentServices: 0,
    totalSaloons: 0,
    totalUsers: 0
  });
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Admin Dashboard</h2>
          <p className="text-muted-foreground">
            Manage global categories and parent services for all saloons
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Global Categories</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : stats.globalCategories}
            </div>
            <p className="text-xs text-muted-foreground">
              Available to all saloons
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Parent Services</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : stats.parentServices}
            </div>
            <p className="text-xs text-muted-foreground">
              Base service templates
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Saloons</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : stats.totalSaloons}
            </div>
            <p className="text-xs text-muted-foreground">
              Registered saloons
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : stats.totalUsers}
            </div>
            <p className="text-xs text-muted-foreground">
              Platform users
            </p>
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
