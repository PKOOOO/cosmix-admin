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
    createdAt: string;
    isParent: boolean;
    parentService?: string;
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
        id: "type",
        header: "Type",
        cell: ({ row }) => {
            const isParent = row.original.isParent;
            return (
                <div className="flex items-center gap-2">
                    <Badge variant={isParent ? "default" : "secondary"}>
                        {isParent ? "Parent Service" : "Sub Service"}
                    </Badge>
                    {!isParent && row.original.parentService && (
                        <span className="text-xs text-muted-foreground">
                            of {row.original.parentService}
                        </span>
                    )}
                </div>
            );
        },
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
