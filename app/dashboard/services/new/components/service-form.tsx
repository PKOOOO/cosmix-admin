// app/(dashboard)/dashboard/services/new/components/service-form.tsx
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
    parentServiceId: z.string().optional(),
    saloonIds: z.array(z.string()).optional(),
    isParent: z.boolean().default(false),
}).refine((data) => {
    // If it's not a parent service, require at least one saloon
    if (!data.isParent && (!data.saloonIds || data.saloonIds.length === 0)) {
        return false;
    }
    return true;
}, {
    message: "At least one saloon is required for non-parent services.",
    path: ["saloonIds"],
});

type ServiceFormValues = z.infer<typeof formSchema>;

interface ServiceFormProps {
    initialData: Service | null;
}

export const ServiceForm: React.FC<ServiceFormProps> = ({ initialData }) => {
    const router = useRouter();

    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<{ id: string, name: string }[]>([]);
    const [saloons, setSaloons] = useState<{ id: string, name: string }[]>([]);
    const [parentServices, setParentServices] = useState<{ id: string, name: string }[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);


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
            parentServiceId: initialData.parentServiceId || "",
            saloonIds: [],
            isParent: !initialData.parentServiceId,
        } : {
            name: "",
            description: "",
            categoryId: "",
            parentServiceId: "",
            saloonIds: [],
            isParent: false,
        },
    });

    // Watch form state for debugging
    const formState = form.formState;
    console.log("Form state:", {
        isValid: formState.isValid,
        errors: formState.errors,
        isSubmitting: formState.isSubmitting,
        isDirty: formState.isDirty
    });

    // Fetch categories, saloons, and check admin status
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [categoriesRes, saloonsRes, adminRes] = await Promise.all([
                    axios.get('/api/categories'),
                    axios.get('/api/saloons?owned=1'),
                    axios.get('/api/admin/check')
                ]);
                setCategories(categoriesRes.data);
                setSaloons(saloonsRes.data);
                setIsAdmin(adminRes.data.isAdmin);
            } catch (error) {
                console.error('Error fetching data:', error);
                setIsAdmin(false);
            }
        };
        fetchData();
    }, []);

    const categoryId = form.watch("categoryId");
    const parentServiceId = form.watch("parentServiceId");

    // Fetch parent services when category changes (only for admins)
    useEffect(() => {
        if (categoryId && isAdmin) {
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
    }, [categoryId, isAdmin]);

    // Handle parent service selection - populate form fields
    useEffect(() => {
        if (parentServiceId && parentServices.length > 0) {
            const selectedParentService = parentServices.find(service => service.id === parentServiceId);
            if (selectedParentService) {
                // Populate form fields with parent service data
                form.setValue("name", `${selectedParentService.name} - Sub Service`);
                form.setValue("description", `Sub-service of ${selectedParentService.name}`);
            }
        }
    }, [parentServiceId, parentServices, form]);

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

        } catch (error) {
            console.error("Form submission error:", error);
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
                        {/* Non-Admin Notice */}
                        {!isAdmin && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                                <p className="text-sm text-blue-800">
                                    <strong>Note:</strong> You can create sub-services that are based on existing parent services. Parent services can only be created by administrators.
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

                            {isAdmin && (
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
                            )}


                            {!form.watch("isParent") && isAdmin && (
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
                                                    {parentServices.length === 0 ? (
                                                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                                            No parent services available for this category
                                                        </div>
                                                    ) : (
                                                        parentServices.map((service) => (
                                                            <SelectItem key={service.id} value={service.id}>
                                                                {service.name}
                                                            </SelectItem>
                                                        ))
                                                    )}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                            {parentServices.length === 0 && (
                                                <p className="text-sm text-muted-foreground">
                                                    No parent services found for this category. Create a parent service first.
                                                </p>
                                            )}
                                        </FormItem>
                                    )}
                                />
                            )}

                            {!isAdmin && (
                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                                    <p className="text-sm text-blue-800">
                                        <strong>Note:</strong> As a regular user, you can only create services for your saloons.
                                        Sub-services are created by administrators and can be selected when setting up your saloon.
                                    </p>
                                </div>
                            )}

                            {!form.watch("isParent") && (
                                <FormField
                                    control={form.control}
                                    name="saloonIds"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Select Saloons</FormLabel>
                                            <div className="space-y-2">
                                                {saloons.map((saloon) => (
                                                    <div key={saloon.id} className="flex items-center space-x-2">
                                                        <input
                                                            type="checkbox"
                                                            id={`saloon-${saloon.id}`}
                                                            checked={field.value?.includes(saloon.id) || false}
                                                            onChange={(e) => {
                                                                const currentValues = field.value || [];
                                                                if (e.target.checked) {
                                                                    field.onChange([...currentValues, saloon.id]);
                                                                } else {
                                                                    field.onChange(currentValues.filter(id => id !== saloon.id));
                                                                }
                                                            }}
                                                            className="rounded border-gray-300"
                                                        />
                                                        <label htmlFor={`saloon-${saloon.id}`} className="text-sm">
                                                            {saloon.name}
                                                        </label>
                                                    </div>
                                                ))}
                                            </div>
                                            <FormMessage />
                                            <p className="text-sm text-muted-foreground">
                                                Select at least one saloon for this service
                                            </p>
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
                        <Button
                            disabled={loading}
                            className="hidden md:flex w-full md:w-auto md:ml-auto"
                            type="submit"
                        >
                            {action}
                        </Button>
                    </form>
                </Form>
            </div>

            {/* Mobile Sticky Bottom Button - Fixed positioning */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-t border-gray-200 p-4 shadow-lg">
                <Button
                    disabled={loading}
                    className="w-full"
                    type="submit"
                    form="service-form"
                >
                    {action}
                </Button>
            </div>
        </div>
    );
};
