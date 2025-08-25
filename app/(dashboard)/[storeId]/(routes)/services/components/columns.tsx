// app\(dashboard)\[storeId]\(routes)\services\components\columns.tsx

"use client";

import { ColumnDef } from "@tanstack/react-table";
import { CellAction } from "./cell-action";

export type ServiceColumn = {
    id: string;
    name: string;
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
