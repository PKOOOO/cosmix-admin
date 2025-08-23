"use client";

import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { DataTable } from "@/components/ui/data-table";
import { BookingColumn, columns } from "./columns";

interface BookingClientProps {
  data: BookingColumn[];
}

export const BookingClient: React.FC<BookingClientProps> = ({ data }) => {
  return (
    <>
      <Heading
        title={`Bookings (${data.length})`}
        description="Manage all bookings for your store"
      />
      <Separator />
      <DataTable searchKey="user" columns={columns} data={data} />
    </>
  );
};