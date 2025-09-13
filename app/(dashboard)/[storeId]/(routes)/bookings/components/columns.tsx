"use client";

import { ColumnDef } from "@tanstack/react-table";

// Define the shape of the data for each row in the table
export type BookingColumn = {
  id: string;
  service: string;
  user: string; // Customer name
  isConfirmed: boolean;
  date: string; // Appointment date
  time: string; // Appointment time
  createdAt: string; // When the booking was created
  totalAmount?: number; // Booking amount
};

export const columns: ColumnDef<BookingColumn>[] = [
  {
    accessorKey: "user",
    header: "Customer",
  },
  {
    accessorKey: "service",
    header: "Service",
  },
  {
    accessorKey: "date",
    header: "Appointment Date",
    cell: ({ row }) => (
      <div className="font-medium">
        {row.original.date}
      </div>
    ),
  },
  {
    accessorKey: "time",
    header: "Appointment Time",
    cell: ({ row }) => (
      <div className="font-medium text-blue-600">
        {row.original.time}
      </div>
    ),
  },
  {
    accessorKey: "isConfirmed",
    header: "Status",
    cell: ({ row }) => (
      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
        row.original.isConfirmed 
          ? "bg-green-100 text-green-800" 
          : "bg-yellow-100 text-yellow-800"
      }`}>
        {row.original.isConfirmed ? "Confirmed" : "Pending"}
      </div>
    ),
  },
  {
    accessorKey: "totalAmount",
    header: "Amount",
    cell: ({ row }) => (
      <div className="font-medium text-green-600">
        {row.original.totalAmount ? `$${row.original.totalAmount.toFixed(2)}` : "N/A"}
      </div>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Booked On",
    cell: ({ row }) => (
      <div className="text-sm text-gray-500">
        {row.original.createdAt}
      </div>
    ),
  },
];