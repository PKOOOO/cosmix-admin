// app/(dashboard)/dashboard/services/components/columns.tsx
"use client";
import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { CellAction } from "./cell-action";
import { Badge } from "@/components/ui/badge";

export type ServiceColumn = {
    id: string;
    name: string;
    description: string;
    category: string;
    isPopular: boolean;
    createdAt: string;
};

export const columns: ColumnDef<ServiceColumn>[] = [
    {
        accessorKey: "name",
        header: "Name",
    },
    {
        accessorKey: "description",
        header: "Description",
    },
    {
        accessorKey: "category",
        header: "Category",
    },
    {
        accessorKey: "isPopular",
        header: "Popular",
        cell: ({ row }) => (
            <Badge variant={row.original.isPopular ? "default" : "secondary"}>
                {row.original.isPopular ? "Popular" : "Regular"}
            </Badge>
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
