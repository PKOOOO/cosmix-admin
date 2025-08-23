"use client";

import { ColumnDef } from "@tanstack/react-table";

// Define the shape of the data for each row in the table
export type BookingColumn = {
  id: string;
  service: string;
  user: string; // This will now be explicitly non-null after the mapping
  isConfirmed: boolean;
  date: string;
  time: string;
  createdAt: string;
};

export const columns: ColumnDef<BookingColumn>[] = [
  {
    accessorKey: "user",
    header: "User",
  },
  {
    accessorKey: "service",
    header: "Service",
  },
  {
    accessorKey: "date",
    header: "Date",
  },
  {
    accessorKey: "time",
    header: "Time",
  },
  {
    accessorKey: "isConfirmed",
    header: "Confirmed",
    cell: ({ row }) => (
      // Display 'Yes' or 'No' based on the boolean value
      <div>{row.original.isConfirmed ? "Yes" : "No"}</div>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Created At",
  },
];