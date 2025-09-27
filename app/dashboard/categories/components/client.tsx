// app/(dashboard)/dashboard/categories/components/client.tsx
"use client";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";
import { CategoryColumn, columns } from "./columns";
import { DataTable } from "@/components/ui/data-table";

interface CategoryClientProps {
    data: CategoryColumn[]
}

export const CategoryClient: React.FC<CategoryClientProps> = ({
    data 
}) => {
    const router = useRouter();

    return (
        <div className="relative min-h-screen">
            <div className="flex items-center justify-between mt-6 md:mt-8">
                <Heading
                    title={`Categories (${data.length})`}
                /> 
                <Button onClick={() => router.push('/dashboard/categories/new')} className="hidden sm:flex">
                    <Plus className="mr-2 h-4 w-4" />
                    Add New
                </Button>
            </div>
            
            <div className="pb-20 sm:pb-0">
                <DataTable searchKey="name" columns={columns} data={data} />
            </div>
            
            {/* Mobile Sticky Bottom Button */}
            <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 p-3">
                <Button 
                    onClick={() => router.push('/dashboard/categories/new')} 
                    className="w-full bg-black hover:bg-gray-800 text-white"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Add New Category
                </Button>
            </div>
        </div>
    )
}
