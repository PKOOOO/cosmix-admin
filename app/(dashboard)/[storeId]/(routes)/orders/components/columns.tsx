"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export type OrderColumn = {
  id: string;
  phone: string;
  address: string;
  county: string;
  customerName: string;
  idNumber: string;
  isPaid: boolean;
  totalPrice: string;
  products: string;
  createdAt: string;
  customerEmail: string;
  trackingId: string | null;
};

export const columns: ColumnDef<OrderColumn>[] = [
  {
    accessorKey: "products",
    header: "Products",
  },
  {
    accessorKey: "county",
    header: "county",
  },
  {
    accessorKey: "customerName",
    header: "Customer Name",
    cell: ({ row }) => {
      const customerName = row.getValue("customerName") as string;
      return customerName && customerName.trim() !== "" ? (
        <span>{customerName}</span>
      ) : (
        <em className="text-gray-400">Missing</em>
      );
    },
  },
  {
    accessorKey: "idNumber",
    header: "ID Number",
    cell: ({ row }) => {
      const idNumber = row.getValue("idNumber") as string;
      return idNumber && idNumber.trim() !== "" ? (
        <span>{idNumber}</span>
      ) : (
        <em className="text-gray-400">Missing</em>
      );
    },
  },
  {
    accessorKey: "customerEmail",
    header: "Customer Email",
  },
  {
    accessorKey: "phone",
    header: "Phone",
  },
  {
    accessorKey: "address",
    header: "Address",
  },
  {
    accessorKey: "totalPrice",
    header: "Total Price",
  },
  {
    accessorKey: "isPaid",
    header: "Status",
    cell: ({ row }) => (
      <span
        className={`px-2 py-1 rounded text-white text-xs font-medium ${
          row.getValue("isPaid") ? "bg-green-600" : "bg-red-600"
        }`}
      >
        {row.getValue("isPaid") ? "Paid" : "Pending"}
      </span>
    ),
  },
  {
    accessorKey: "trackingId",
    header: "Tracking ID",
    cell: ({ row }) => {
      const trackingId = row.getValue("trackingId") as string | null;
      return trackingId ? (
        <span className="text-xs text-blue-700 font-semibold">{trackingId}</span>
      ) : (
        <span className="text-xs text-gray-500 italic">Not assigned</span>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "Date",
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const order = row.original;
      
      return (
        <div className="flex items-center justify-center">
          <ViewTrackingButton orderId={order.id} />
        </div>
      );
    },
  },
];

// Separate component to handle the navigation
function ViewTrackingButton({ orderId }: { orderId: string }) {
  const params = useParams();
  const storeId = params.storeId as string;

  return (
    <Link href={`/${storeId}/orders/${orderId}`}>
      <Button variant="outline" size="sm" className="h-8">
        <Eye className="h-3 w-3 mr-1" />
        Track
      </Button>
    </Link>
  );
}