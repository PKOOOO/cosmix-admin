// app\(dashboard)\[storeId]\(routes)\services\components\columns.tsx

"use client";

import { ColumnDef } from "@tanstack/react-table";
import { CellAction } from "./cell-action";

export type ServiceColumn = {
    id: string;
    name: string;
    isPopular: boolean;
    categoryName: string;
    serviceType: "Parent" | "Sub-Service" | "Standalone"; // Added service type
    parentServiceName?: string; // Added parent service name for sub-services
    saloonNames: string[]; // Added saloon names array
    createdAt: string;
};

export const columns: ColumnDef<ServiceColumn>[] = [
    {
        accessorKey: "name",
        header: "Name",
    },
    {
        accessorKey: "categoryName",
        header: "Category",
    },
    {
        accessorKey: "serviceType",
        header: "Type",
        cell: ({ row }) => {
            const type = row.original.serviceType;
            const parentName = row.original.parentServiceName;
            
            if (type === "Sub-Service" && parentName) {
                return (
                    <div className="text-sm">
                        <div className="font-medium text-blue-600">{type}</div>
                        <div className="text-gray-500 text-xs">under {parentName}</div>
                    </div>
                );
            }
            
            return (
                <div className={`font-medium ${
                    type === "Parent" ? "text-green-600" : 
                    type === "Sub-Service" ? "text-blue-600" : 
                    "text-gray-600"
                }`}>
                    {type}
                </div>
            );
        }
    },
    {
        accessorKey: "saloonNames",
        header: "Saloons",
        cell: ({ row }) => {
            const saloons = row.original.saloonNames;
            const serviceType = row.original.serviceType;
            
            if (serviceType === "Parent") {
                return (
                    <div className="text-xs text-gray-400 italic">
                        N/A (Parent Service)
                    </div>
                );
            }
            
            if (!saloons || saloons.length === 0) {
                return (
                    <div className="text-xs text-gray-400 italic">
                        No saloons assigned
                    </div>
                );
            }
            
            if (saloons.length === 1) {
                return (
                    <div className="text-sm font-medium">
                        {saloons[0]}
                    </div>
                );
            }
            
            return (
                <div className="text-sm">
                    <div className="font-medium">{saloons[0]}</div>
                    <div className="text-xs text-gray-500">
                        +{saloons.length - 1} more
                    </div>
                </div>
            );
        }
    },
    {
        accessorKey: "isPopular",
        header: "Popular",
        cell: ({ row }) => (
            <div>{row.original.isPopular ? "Yes" : "No"}</div>
        )
    },
    {
        accessorKey: "createdAt",
        header: "Date",
    },
    {
        id: "actions",
        cell: ({ row }) => <CellAction data={row.original} />,
    }
];