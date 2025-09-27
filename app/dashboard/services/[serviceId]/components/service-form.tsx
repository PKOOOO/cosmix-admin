// app/(dashboard)/services/[serviceId]/components/service-form.tsx
"use client";
import * as z from "zod";
import { Service } from "@prisma/client";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { AlertModal } from "@/components/modals/alert-modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const formSchema = z.object({
    name: z.string().min(1, "Name is required."),
    description: z.string().optional(),
    categoryId: z.string().min(1, "Category is required."),
    isPopular: z.boolean().default(false),
    parentServiceId: z.string().optional(),
    saloonIds: z.array(z.string()).min(1, "At least one saloon is required."),
    isParent: z.boolean().default(false),
});

type ServiceFormValues = z.infer<typeof formSchema>;

interface ServiceFormProps {
    initialData: Service & {
        saloonServices?: {
            saloon: {
                id: string;
                name: string;
            }
        }[]
    } | null;
}

export const ServiceForm: React.FC<ServiceFormProps> = ({ initialData }) => {
    const router = useRouter();

    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
    const [saloons, setSaloons] = useState<{id: string, name: string}[]>([]);
    const [parentServices, setParentServices] = useState<{id: string, name: string}[]>([]);

    const title = initialData ? "Edit service" : "Create service";
    const description = initialData ? "Edit service details" : "Add a new service";
    const toastMessage = initialData ? "Service updated successfully." : "Service created successfully.";
    const action = initialData ? "Save changes" : "Create";

    const form = useForm<ServiceFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: initialData ? {
            name: initialData.name,
            description: initialData.description || "",
            categoryId: initialData.categoryId,
            isPopular: initialData.isPopular,
            parentServiceId: initialData.parentServiceId || "",
            saloonIds: initialData.saloonServices?.map(ss => ss.saloon.id) || [],
            isParent: !initialData.parentServiceId,
        } : {
            name: "",
            description: "",
            categoryId: "",
            isPopular: false,
            parentServiceId: "",
            saloonIds: [],
            isParent: false,
        },
    });

    // Fetch categories and saloons
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [categoriesRes, saloonsRes] = await Promise.all([
                    axios.get('/api/categories'),
                    axios.get('/api/saloons?owned=1')
                ]);
                setCategories(categoriesRes.data);
                setSaloons(saloonsRes.data);
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };
        fetchData();
    }, []);

    // Fetch parent services when category changes
    useEffect(() => {
        const categoryId = form.watch("categoryId");
        if (categoryId) {
            const fetchParentServices = async () => {
                try {
                    const response = await axios.get(`/api/services?category=${categoryId}`);
                    const parentServices = response.data.filter((service: any) => !service.parentServiceId);
                    setParentServices(parentServices);
                } catch (error) {
                    console.error('Error fetching parent services:', error);
                }
            };
            fetchParentServices();
        }
    }, [form.watch("categoryId")]);

    const onSubmit = async (data: ServiceFormValues) => {
        try {
            setLoading(true);
            
            if (initialData) {
                await axios.patch(
                    `/api/services/${initialData.id}`,
                    data
                );
            } else {
                await axios.post(`/api/services`, data);
            }
    
            router.refresh();
            router.push('/dashboard/services');
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
            await axios.delete(`/api/services/${initialData.id}`);
            
            toast.success("Service deleted successfully.");
            setOpen(false);
            setTimeout(() => {
                router.refresh();
                router.push('/dashboard/services');
            }, 100);
        } catch (error) {
            toast.error("Failed to delete service. Please try again.");
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
                        Delete Service
                    </Button>
                )}
            </div>
            
            <Separator className="mb-6" />
            
            {/* Main content container with proper bottom padding for mobile */}
            <div className="pb-20 md:pb-0">
                <Form {...form}>
                    <form
                        id="service-form"
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-6 w-full"
                    >
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
                                                placeholder="Enter service name"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            
                            <FormField
                                control={form.control}
                                name="categoryId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Category</FormLabel>
                                        <Select 
                                            disabled={loading} 
                                            onValueChange={field.onChange} 
                                            value={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a category" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {categories.map((category) => (
                                                    <SelectItem key={category.id} value={category.id}>
                                                        {category.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            
                            <FormField
                                control={form.control}
                                name="isParent"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                        <div className="space-y-0.5">
                                            <FormLabel>Parent Service</FormLabel>
                                            <p className="text-sm text-muted-foreground">
                                                This is a parent service (no pricing)
                                            </p>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            
                            <FormField
                                control={form.control}
                                name="isPopular"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                        <div className="space-y-0.5">
                                            <FormLabel>Popular Service</FormLabel>
                                            <p className="text-sm text-muted-foreground">
                                                Mark as popular service
                                            </p>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            
                            {!form.watch("isParent") && (
                                <FormField
                                    control={form.control}
                                    name="parentServiceId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Parent Service</FormLabel>
                                            <Select 
                                                disabled={loading} 
                                                onValueChange={field.onChange} 
                                                value={field.value}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select parent service (optional)" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {parentServices.map((service) => (
                                                        <SelectItem key={service.id} value={service.id}>
                                                            {service.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                            
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem className="md:col-span-2">
                                        <FormLabel>Description</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                disabled={loading}
                                                placeholder="Enter service description"
                                                {...field}
                                                value={field.value || ""}
                                                className="min-h-[100px]"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
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
                <Button disabled={loading} className="w-full" type="submit" form="service-form">
                    {action}
                </Button>
            </div>
        </div>
    );
};
