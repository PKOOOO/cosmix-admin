"use client";
import * as z from "zod";
import { Service, Category } from "@prisma/client";
import { Trash } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import toast from "react-hot-toast";
import { useParams, useRouter } from "next/navigation";
import { AlertModal } from "@/components/modals/alert-modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Saloon } from "@prisma/client";

const formSchema = z.object({
    name: z.string().min(1, "Name is required."),
    description: z.string().nullable().optional(),
    isPopular: z.boolean(),
    isParent: z.boolean(),
    categoryId: z.string().min(1, "Category is required."),
    parentServiceId: z.string().nullable().optional(),
    saloonIds: z.array(z.string()).optional(), // Changed from saloonId to saloonIds array
}).refine((data) => {
    // Only require saloons if it's NOT a parent service
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
    initialData: (Service & {
        parentService: Service | null;
        category: Category | null;
        saloonServices?: { saloonId: string }[]; // Add existing saloon relations
    }) | null;
    categories: Category[];
    services: Service[];
    saloons: Saloon[];
}

export const ServiceForm: React.FC<ServiceFormProps> = ({ initialData, categories, services, saloons }) => {
    const params = useParams();
    const router = useRouter();

    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const title = initialData ? "Edit service" : "Create service";
    const description = initialData ? "Edit service details" : "Add a new service";
    const toastMessage = initialData ? "Service updated successfully." : "Service created successfully.";
    const action = initialData ? "Save changes" : "Create";

    const form = useForm<ServiceFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: initialData
            ? {
                ...initialData,
                description: initialData.description,
                parentServiceId: initialData.parentServiceId,
                isParent: false,
                saloonIds: initialData?.saloonServices?.map(ss => ss.saloonId) || [], // Pre-populate with existing saloons
            }
            : {
                name: "",
                description: null,
                isPopular: false,
                isParent: false,
                categoryId: "",
                parentServiceId: null,
                saloonIds: [],
            },
    });

    // Watch the isParent field to conditionally show/hide fields
    const isParent = form.watch("isParent");
    const selectedSaloonIds = form.watch("saloonIds") || [];

    const toggleSaloon = (saloonId: string) => {
        const currentIds = selectedSaloonIds;
        const newIds = currentIds.includes(saloonId)
            ? currentIds.filter(id => id !== saloonId)
            : [...currentIds, saloonId];
        form.setValue("saloonIds", newIds);
    };

    const onSubmit = async (data: ServiceFormValues) => {
        try {
            setLoading(true);

            // Clean up data before sending to API
            const submitData = {
                ...data,
                description: data.isParent ? null : (data.description === "" ? null : data.description),
                // Handle parentServiceId conversion
                parentServiceId: data.parentServiceId === "none" ? null : data.parentServiceId,
                // For parent services, don't send saloonIds
                saloonIds: data.isParent ? undefined : data.saloonIds,
                // Send isParent flag to API
                isParent: data.isParent,
            };

            if (initialData) {
                await axios.patch(
                    `/api/${params.storeId}/services/${params.serviceId}`,
                    submitData
                );
            } else {
                await axios.post(`/api/${params.storeId}/services`, submitData);
            }

            router.refresh();
            router.push(`/${params.storeId}/services`);
            toast.success(toastMessage);
        } catch (error) {
            toast.error("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const onDelete = async () => {
        if (!params.serviceId) return;
        try {
            setLoading(true);
            await axios.delete(
                `/api/${params.storeId}/services/${params.serviceId}`
            );
            toast.success("Service deleted successfully.");
            setOpen(false);
            setTimeout(() => {
                router.refresh();
                router.push(`/${params.storeId}/services`);
            }, 200);
        } catch (error) {
            toast.error("Failed to delete service. Please try again.");
            setOpen(false);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <AlertModal
                isOpen={open}
                onClose={() => setOpen(false)}
                onConfirm={onDelete}
                loading={loading}
            />
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <Heading title={title} description={description} />
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
            <Separator />
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 w-full">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                        <Input disabled={loading} placeholder="Service name" {...field} />
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
                                        defaultValue={field.value}
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

                        {/* Only show parent service selection if not creating a parent service */}
                        {!isParent && (
                            <FormField
                                control={form.control}
                                name="parentServiceId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Parent Service (Optional)</FormLabel>
                                        <Select
                                            disabled={loading}
                                            onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                                            value={field.value || "none"}
                                            defaultValue={field.value || "none"}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a parent service" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="none">No parent service</SelectItem>
                                                {services.map((service) => (
                                                    <SelectItem key={service.id} value={service.id}>
                                                        {service.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                        <FormDescription>
                                            Use this to create a sub-service, e.g., "Full Massage" for "Massage".
                                        </FormDescription>
                                    </FormItem>
                                )}
                            />
                        )}
                        
                        <FormField
                            control={form.control}
                            name="isPopular"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 md:col-span-2 lg:col-span-1">
                                    <FormControl>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel>
                                            Popular
                                        </FormLabel>
                                        <FormDescription>
                                            This service will be featured on the home page.
                                        </FormDescription>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        
                        <FormField
                            control={form.control}
                            name="isParent"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 md:col-span-2 lg:col-span-1">
                                    <FormControl>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel>
                                            Parent Service
                                        </FormLabel>
                                        <FormDescription>
                                            This service will be a category that contains sub-services.
                                        </FormDescription>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        
                        {/* Only show description if not a parent service */}
                        {!isParent && (
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem className="md:col-span-2 lg:col-span-3">
                                        <FormLabel>Description</FormLabel>
                                        <FormControl>
                                            <Textarea 
                                                disabled={loading} 
                                                placeholder="Service description" 
                                                value={field.value ?? ""} 
                                                onChange={field.onChange}
                                                className="min-h-[100px]"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}
                    </div>

                    {/* Multiple Saloon Selection - Only show if not a parent service */}
                    {!isParent && (
                        <FormField
                            control={form.control}
                            name="saloonIds"
                            render={() => (
                                <FormItem>
                                    <FormLabel>Saloons</FormLabel>
                                    <FormDescription>
                                        Select which saloons offer this service. You can choose multiple saloons.
                                    </FormDescription>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                                        {saloons.map((saloon) => (
                                            <FormItem
                                                key={saloon.id}
                                                className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"
                                            >
                                                <FormControl>
                                                    <Checkbox
                                                        checked={selectedSaloonIds.includes(saloon.id)}
                                                        onCheckedChange={() => toggleSaloon(saloon.id)}
                                                        disabled={loading}
                                                    />
                                                </FormControl>
                                                <div className="space-y-1 leading-none flex-1">
                                                    <FormLabel className="font-normal">
                                                        {saloon.name}
                                                    </FormLabel>
                                                    {saloon.address && (
                                                        <p className="text-sm text-muted-foreground break-words">
                                                            {saloon.address}
                                                        </p>
                                                    )}
                                                </div>
                                            </FormItem>
                                        ))}
                                    </div>
                                    <FormMessage />
                                    {selectedSaloonIds.length > 0 && (
                                        <p className="text-sm text-muted-foreground mt-2">
                                            Selected {selectedSaloonIds.length} saloon{selectedSaloonIds.length !== 1 ? 's' : ''}
                                        </p>
                                    )}
                                </FormItem>
                            )}
                        />
                    )}

                    <Button disabled={loading} className="w-full sm:w-auto sm:ml-auto" type="submit">
                        {action}
                    </Button>
                </form>
            </Form>
        </>
    );
};