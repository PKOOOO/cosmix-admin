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
        header: "Nimi",
    },
    {
        accessorKey: "servicesCount",
        header: "Palvelut",
        cell: ({ row }) => (
            <span>{row.original.servicesCount} palvelua</span>
        )
    },
    {
        accessorKey: "createdAt",
        header: "Date",
    },
];
