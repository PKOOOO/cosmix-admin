// app/(dashboard)/dashboard/categories/components/columns.tsx
"use client";
import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { CellAction } from "./cell-action";

export type CategoryColumn = {
    id: string;
    name: string;
    saloonName?: string;
    isGlobal: boolean;
    servicesCount: number;
    createdAt: string;
};

export const columns: ColumnDef<CategoryColumn>[] = [
    {
        accessorKey: "name",
        header: "Name",
    },
    {
        accessorKey: "saloonName",
        header: "Saloon",
        cell: ({ row }) => (
            <span>
                {row.original.isGlobal ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Global
                    </span>
                ) : (
                    row.original.saloonName || "N/A"
                )}
            </span>
        )
    },
    {
        accessorKey: "servicesCount",
        header: "Services",
        cell: ({ row }) => (
            <span>{row.original.servicesCount} services</span>
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
