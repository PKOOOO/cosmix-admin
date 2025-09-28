// app/(dashboard)/dashboard/categories/new/components/category-form.tsx
"use client";
import * as z from "zod";
import { Category } from "@prisma/client";
import { Trash } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
import React from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { AlertModal } from "@/components/modals/alert-modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { checkAdminAccess } from "@/lib/admin-access";

const formSchema = z.object({
    name: z.string().min(1, "Name is required."),
    saloonId: z.string().optional(),
});

type CategoryFormValues = z.infer<typeof formSchema>;

interface CategoryFormProps {
    initialData: Category | null;
}

export const CategoryForm: React.FC<CategoryFormProps> = ({ initialData }) => {
    const router = useRouter();

    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [saloons, setSaloons] = useState<{id: string, name: string}[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);

    const title = initialData ? "Edit category" : "Create category";
    const description = initialData ? "Edit category details" : "Add a new category";
    const toastMessage = initialData ? "Category updated successfully." : "Category created successfully.";
    const action = initialData ? "Save changes" : "Create";

    const form = useForm<CategoryFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: initialData ? {
            name: initialData.name,
            saloonId: "", // Will be set from initialData
        } : {
            name: "",
            saloonId: "",
        },
    });

    // Fetch user's saloons and check admin status
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Check admin status
                const adminResponse = await axios.get('/api/admin/check');
                setIsAdmin(adminResponse.data.isAdmin);
                
                // Only fetch saloons if not admin
                if (!adminResponse.data.isAdmin) {
                    const response = await axios.get('/api/saloons?owned=1');
                    setSaloons(response.data);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
                // If admin check fails, assume not admin and fetch saloons
                try {
                    const response = await axios.get('/api/saloons?owned=1');
                    setSaloons(response.data);
                } catch (saloonError) {
                    console.error('Error fetching saloons:', saloonError);
                }
            }
        };
        fetchData();
    }, []);

    const onSubmit = async (data: CategoryFormValues) => {
        try {
            setLoading(true);
            
            // Validate saloon selection for non-admin users
            if (!isAdmin && !data.saloonId) {
                toast.error("Please select a saloon");
                return;
            }
            
            if (initialData) {
                await axios.patch(
                    `/api/categories/${initialData.id}`,
                    data
                );
            } else {
                await axios.post(`/api/categories`, data);
            }
    
            router.refresh();
            router.push('/dashboard/categories');
            toast.success(toastMessage);
        } catch (error) {
            toast.error("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const onDelete = async () => {
        if (!initialData) return;
        
        try {
            setLoading(true);
            await axios.delete(`/api/categories/${initialData.id}`);
            
            toast.success("Category deleted successfully.");
            setOpen(false);
            setTimeout(() => {
                router.refresh();
                router.push('/dashboard/categories');
            }, 100);
        } catch (error) {
            toast.error("Failed to delete category. Please try again.");
            setOpen(false);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative">
            <AlertModal
                isOpen={open}
                onClose={() => setOpen(false)}
                onConfirm={onDelete}
                loading={loading}
            />
            
            {/* Header Section */}
            <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                <Heading title={title} />
                {initialData && (
                    <Button
                        disabled={loading}
                        variant="destructive"
                        size="sm"
                        onClick={() => setOpen(true)}
                        className="w-full sm:w-auto"
                    >
                        <Trash className="h-4 w-4 mr-2" />
                        Delete Category
                    </Button>
                )}
            </div>
            
            <Separator className="mb-6" />
            
            {/* Main content container with proper bottom padding for mobile */}
            <div className="pb-20 md:pb-0">
                <Form {...form}>
                    <form
                        id="category-form"
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-6 w-full"
                    >
                        {/* Admin Notice */}
                        {isAdmin && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                                <p className="text-sm text-blue-800">
                                    <strong>Admin Mode:</strong> You are creating a global category that will be available to all saloons on the platform.
                                </p>
                            </div>
                        )}

                        {/* Form Fields Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Name</FormLabel>
                                        <FormControl>
                                            <Input
                                                disabled={loading}
                                                placeholder="Enter category name"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            
                            {!isAdmin && (
                                <FormField
                                    control={form.control}
                                    name="saloonId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Saloon</FormLabel>
                                            <Select 
                                                disabled={loading} 
                                                onValueChange={field.onChange} 
                                                value={field.value}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select a saloon" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {saloons.map((saloon) => (
                                                        <SelectItem key={saloon.id} value={saloon.id}>
                                                            {saloon.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                        </div>

                        {/* Desktop Submit Button */}
                        <Button disabled={loading} className="hidden md:flex w-full md:w-auto md:ml-auto" type="submit">
                            {action}
                        </Button>
                    </form>
                </Form>
            </div>
            
            {/* Mobile Sticky Bottom Button - Fixed positioning */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-t border-gray-200 p-4 shadow-lg">
                <Button disabled={loading} className="w-full" type="submit" form="category-form">
                    {action}
                </Button>
            </div>
        </div>
    );
};
