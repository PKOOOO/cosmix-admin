// app\(dashboard)\[storeId]\(routes)\saloons\components\columns.tsx
"use client";
import { ColumnDef } from "@tanstack/react-table";
import { CellAction } from "./cell-actions";
import Image from "next/image";

export type SaloonColumn = {
    id: string;
    name: string;
    shortIntro: string;
    address: string;
    imageUrl: string;
    createdAt: string;
};

export const columns: ColumnDef<SaloonColumn>[] = [
{
  accessorKey: "imageUrl",
  header: "Image",
  cell: ({ row }) => (
    <div className="w-10 h-10 relative">
      <Image
        src={row.original.imageUrl}
        alt={row.original.name}
        fill
        className="rounded-full object-cover"
      />
    </div>
  )
},

    {
        accessorKey: "name",
        header: "Name",
    },
    {
        accessorKey: "shortIntro",
        header: "Short Intro",
    },
    {
        accessorKey: "address",
        header: "Address",
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