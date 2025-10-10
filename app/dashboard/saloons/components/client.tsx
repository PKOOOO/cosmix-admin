// app/dashboard/saloons/components/client.tsx
"use client";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";
import { SaloonColumn, columns } from "./columns";
import { DataTable } from "@/components/ui/data-table";
import { ApiList } from "@/components/ui/api-list";

interface SaloonClientProps {
    data: SaloonColumn[]
}

export const SaloonClient: React.FC<SaloonClientProps> = ({
    data 
}) => {
    const router = useRouter();

    return (
        <div className="relative min-h-screen">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-6 md:mt-8 gap-4">
                <div className="flex items-center justify-between sm:justify-start gap-4">
                    <Heading
                        title={`Saloons (${data.length})`}
                    />
                    <Button onClick={() => router.push('/dashboard/saloons/new')} className="sm:hidden">
                        <Plus className="mr-2 h-4 w-4" />
                        Add New
                    </Button>
                </div>
                <Button onClick={() => router.push('/dashboard/saloons/new')} className="hidden sm:flex">
                    <Plus className="mr-2 h-4 w-4" />
                    Add New
                </Button>
            </div>
            
            <div className="pb-20 sm:pb-0">
                <DataTable searchKey="name" columns={columns} data={data} />
            </div>
            
            {/* <Heading title="API" description="API calls for Saloons" />
            <Separator />
            <ApiList entityName="saloons" entityIdName="saloonId" /> */}
        </div>
    )
}
