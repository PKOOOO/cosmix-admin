// app/(dashboard)/dashboard/categories/components/columns.tsx
"use client";
import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { CellAction } from "./cell-action";

export type CategoryColumn = {
    id: string;
    name: string;
    saloonName: string;
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
