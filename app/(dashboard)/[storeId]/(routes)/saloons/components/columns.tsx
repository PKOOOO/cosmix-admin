// app\(dashboard)\[storeId]\(routes)\saloons\components\columns.tsx
"use client";
import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { CellAction } from "./cell-actions";
import Image from "next/image";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export type SaloonColumn = {
    id: string;
    name: string;
    shortIntro: string;
    address: string;
    imageUrl: string;
    subServices: Array<{
        name: string;
        price: number;
        duration: number;
        isAvailable: boolean;
    }>;
    averageRating?: number;
    ratingsCount?: number;
    createdAt: string;
};

export const columns: ColumnDef<SaloonColumn>[] = [
    {
        accessorKey: "imageUrl",
        header: "Image",
        cell: ({ row }) => (
            <div className="w-16 h-16 relative">
                <Image
                    src={row.original.imageUrl}
                    alt={row.original.name}
                    fill
                    className="rounded-md object-cover"
                />
            </div>
        )
    },
    {
        accessorKey: "averageRating",
        header: "Rating",
        cell: ({ row }) => {
            const avg = row.original.averageRating ?? 0;
            const count = row.original.ratingsCount ?? 0;
            return <span>{avg.toFixed(1)} ({count})</span>;
        }
    },
    {
        accessorKey: "name",
        header: "Name",
    },
    {
        accessorKey: "shortIntro",
        header: "Short Intro",
    },
    {
        accessorKey: "address",
        header: "Address",
    },
    {
        accessorKey: "subServices",
        header: "Sub-Services",
        cell: ({ row }) => {
            const subServices = row.original.subServices;
            
            if (subServices.length === 0) {
                return <span className="text-gray-500 italic">No sub-services</span>;
            }
            
            if (subServices.length === 1) {
                const service = subServices[0];
                return (
                    <div className="space-y-1">
                        <span className="text-blue-600">{service.name}</span>
                        <div className="text-xs text-gray-500">
                            ${service.price} • {service.duration}min
                            {!service.isAvailable && (
                                <span className="text-red-500 ml-2">Unavailable</span>
                            )}
                        </div>
                    </div>
                );
            }
            
            return (
                <ScrollArea className="h-20 w-48 rounded-md border">
                    <div className="p-2">
                        <h4 className="mb-2 text-xs font-medium text-gray-700">
                            Sub-Services ({subServices.length})
                        </h4>
                        {subServices.map((service, index) => (
                            <React.Fragment key={service.name}>
                                <div className="space-y-1">
                                    <div className="text-sm text-blue-600">{service.name}</div>
                                    <div className="text-xs text-gray-500">
                                        ${service.price} • {service.duration}min
                                        {!service.isAvailable && (
                                            <span className="text-red-500 ml-2">Unavailable</span>
                                        )}
                                    </div>
                                </div>
                                {index < subServices.length - 1 && (
                                    <Separator className="my-2" />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </ScrollArea>
            );
        }
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