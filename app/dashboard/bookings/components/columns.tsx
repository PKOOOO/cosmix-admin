// app/(dashboard)/dashboard/bookings/components/columns.tsx
"use client";
import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { CellAction } from "./cell-action";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export type BookingColumn = {
    id: string;
    serviceName: string;
    customerName: string;
    customerEmail: string;
    saloonName: string;
    bookingTime: Date;
    status: string;
    totalAmount: number;
    createdAt: string;
};

export const columns: ColumnDef<BookingColumn>[] = [
    {
        accessorKey: "customerName",
        header: "Customer",
    },
    {
        accessorKey: "customerEmail",
        header: "Email",
    },
    {
        accessorKey: "serviceName",
        header: "Service",
    },
    {
        accessorKey: "saloonName",
        header: "Saloon",
    },
    {
        accessorKey: "bookingTime",
        header: "Booking Time",
        cell: ({ row }) => {
            const date = row.getValue("bookingTime") as Date;
            return (
                <div className="space-y-1">
                    <div className="font-medium">
                        {format(date, "MMM dd, yyyy")}
                    </div>
                    <div className="text-sm text-gray-500">
                        {format(date, "h:mm a")}
                    </div>
                </div>
            );
        }
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
            const status = row.original.status;
            const variant = status === "confirmed" ? "default" : 
                           status === "pending" ? "secondary" : 
                           status === "cancelled" ? "destructive" : "outline";
            return <Badge variant={variant}>{status}</Badge>;
        }
    },
    {
        accessorKey: "totalAmount",
        header: "Amount",
        cell: ({ row }) => (
            <span>${row.original.totalAmount}</span>
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
