// Path: ./components/columns.ts

"use client";

import { ColumnDef } from "@tanstack/react-table";
import { CellAction } from "./cell-action";

export type ServiceColumn = {
    id: string;
    name: string;
    price: number | null;
    durationMinutes: number | null;
    isPopular: boolean;
    categoryName: string;
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
        accessorKey: "price",
        header: "Price",
        cell: ({ row }) => (
            <div>
                {/* Handle null price gracefully */}
                {row.original.price !== null 
                    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(row.original.price) 
                    : "N/A"}
            </div>
        )
    },
    {
        accessorKey: "durationMinutes",
        header: "Duration",
        cell: ({ row }) => (
            <div>
                {/* Handle null durationMinutes gracefully */}
                {row.original.durationMinutes !== null ? `${row.original.durationMinutes} min` : "N/A"}
            </div>
        )
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