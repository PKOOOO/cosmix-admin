// app\(dashboard)\[storeId]\(routes)\services\components\client.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import React from "react";
import { ServiceColumn, columns } from "./columns";
import { DataTable } from "@/components/ui/data-table";
import { ApiList } from "@/components/ui/api-list";

interface ServiceClientProps {
    data: ServiceColumn[]
}

// Mobile-friendly service card component
const ServiceCard: React.FC<{ service: ServiceColumn }> = ({ service }) => {
    const getTypeColor = (type: string) => {
        switch (type) {
            case "Parent": return "bg-green-100 text-green-800 border-green-200";
            case "Sub-Service": return "bg-blue-100 text-blue-800 border-blue-200";
            default: return "bg-gray-100 text-gray-800 border-gray-200";
        }
    };

    const getPopularBadge = (isPopular: boolean) => {
        return isPopular ? (
            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                ⭐ Popular
            </Badge>
        ) : null;
    };

    return (
        <Card className="mb-4 shadow-sm border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                    <CardTitle className="text-lg font-semibold text-gray-900">{service.name}</CardTitle>
                    <div className="flex gap-2">
                        {getPopularBadge(service.isPopular)}
                        <Badge className={getTypeColor(service.serviceType)}>
                            {service.serviceType}
                        </Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Category and Type Row */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Category</p>
                        <p className="text-sm font-semibold text-gray-900 mt-1">{service.categoryName}</p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Type</p>
                        <p className="text-sm font-semibold text-blue-900 mt-1">{service.serviceType}</p>
                        {service.parentServiceName && (
                            <p className="text-xs text-blue-600 mt-1">under {service.parentServiceName}</p>
                        )}
                    </div>
                </div>
                
                {/* Saloons Row */}
                <div className="bg-purple-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Saloons</p>
                    {service.serviceType === "Parent" ? (
                        <p className="text-sm text-gray-500 italic mt-1">N/A (Parent Service)</p>
                    ) : service.saloonNames.length === 0 ? (
                        <p className="text-sm text-gray-500 italic mt-1">No saloons assigned</p>
                    ) : service.saloonNames.length === 1 ? (
                        <p className="text-sm font-semibold text-purple-900 mt-1">{service.saloonNames[0]}</p>
                    ) : (
                        <div className="mt-1">
                            <p className="text-sm font-semibold text-purple-900">{service.saloonNames[0]}</p>
                            <p className="text-xs text-purple-600">+{service.saloonNames.length - 1} more</p>
                        </div>
                    )}
                </div>
                
                {/* Created Date */}
                <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Created</p>
                    <p className="text-sm text-gray-700 mt-1">{service.createdAt}</p>
                </div>
            </CardContent>
        </Card>
    );
};

export const ServiceClient: React.FC<ServiceClientProps> = ({
    data 
}) => {
    const router = useRouter();
    const params = useParams();
    const [searchTerm, setSearchTerm] = useState("");
    const [typeFilter, setTypeFilter] = useState<"all" | "Parent" | "Sub-Service" | "Standalone">("all");

    // Filter data based on search term and type
    const filteredData = data.filter(service => {
        const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             service.categoryName.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesType = typeFilter === "all" || service.serviceType === typeFilter;
        
        return matchesSearch && matchesType;
    });

    const parentServices = data.filter(service => service.serviceType === "Parent").length;
    const subServices = data.filter(service => service.serviceType === "Sub-Service").length;
    const standaloneServices = data.filter(service => service.serviceType === "Standalone").length;

    return (
        <>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <Heading
                title={`Services (${data.length})`}
                description={`Manage your services - ${parentServices} parent, ${subServices} sub-services, ${standaloneServices} standalone`}
            /> 
            <Button onClick={() => router.push(`/${params.storeId}/services/new`)} className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Add New
            </Button>
        </div>
        <Separator />
        
        {/* Desktop Table View */}
        <div className="hidden md:block">
            <DataTable searchKey="name" columns={columns} data={data} />
        </div>
        
        {/* Mobile Card View */}
        <div className="md:hidden">
            {/* Mobile Search and Filters */}
            <div className="mb-6 space-y-4">
                <Input
                    placeholder="🔍 Search services by name or category..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-12 text-base border-2 border-gray-200 focus:border-blue-500 rounded-lg"
                />
                
                {/* Type Filter Buttons */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                    <Button
                        variant={typeFilter === "all" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setTypeFilter("all")}
                        className="flex-shrink-0"
                    >
                        All ({data.length})
                    </Button>
                    <Button
                        variant={typeFilter === "Parent" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setTypeFilter("Parent")}
                        className="flex-shrink-0 bg-green-600 hover:bg-green-700"
                    >
                        Parent ({parentServices})
                    </Button>
                    <Button
                        variant={typeFilter === "Sub-Service" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setTypeFilter("Sub-Service")}
                        className="flex-shrink-0 bg-blue-600 hover:bg-blue-700"
                    >
                        Sub ({subServices})
                    </Button>
                    <Button
                        variant={typeFilter === "Standalone" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setTypeFilter("Standalone")}
                        className="flex-shrink-0 bg-gray-600 hover:bg-gray-700"
                    >
                        Standalone ({standaloneServices})
                    </Button>
                </div>
            </div>
            
            {filteredData.length === 0 ? (
                <div className="text-center py-8">
                    <p className="text-gray-500">
                        {searchTerm || typeFilter !== "all" ? "No services found matching your filters" : "No services found"}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredData.map((service) => (
                        <ServiceCard key={service.id} service={service} />
                    ))}
                </div>
            )}
        </div>
        
        <Heading title="API" description="API calls for Services" />
        <Separator />
        <ApiList entityName="services" entityIdName="serviceId" />
        </>
    )
}