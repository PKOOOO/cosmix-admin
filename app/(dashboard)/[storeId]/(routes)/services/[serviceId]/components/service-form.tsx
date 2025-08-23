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

const formSchema = z.object({
    name: z.string().min(1, "Name is required."),
    description: z.string().nullable().optional(),
    price: z.coerce.number().min(1, "Price must be at least 1."),
    durationMinutes: z.coerce.number().nullable().optional(),
    isPopular: z.boolean(),
    categoryId: z.string().min(1, "Category is required."),
    parentServiceId: z.string().nullable().optional(),
});

type ServiceFormValues = z.infer<typeof formSchema>;

interface ServiceFormProps {
    initialData: (Service & {
        parentService: Service | null;
        category: Category | null;
    }) | null;
    categories: Category[];
    services: Service[];
}

export const ServiceForm: React.FC<ServiceFormProps> = ({ initialData, categories, services }) => {
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
                price: parseFloat(String(initialData.price)),
                description: initialData.description,
                durationMinutes: initialData.durationMinutes,
                parentServiceId: initialData.parentServiceId,
            }
            : {
                name: "",
                description: null,
                price: 0,
                durationMinutes: null,
                isPopular: false,
                categoryId: "",
                parentServiceId: null,
            },
    });

    const onSubmit = async (data: ServiceFormValues) => {
        try {
            setLoading(true);

            // Clean up data before sending to API
            const submitData = {
                ...data,
                description: data.description === "" ? null : data.description,
                // Ensure durationMinutes is not sent as 0 if it was originally null
                durationMinutes: data.durationMinutes === 0 ? null : data.durationMinutes,
                // Handle parentServiceId conversion
                parentServiceId: data.parentServiceId === "none" ? null : data.parentServiceId,
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
            router.refresh();
            router.push(`/${params.storeId}/services`);
            toast.success("Service deleted successfully.");
        } catch (error) {
            toast.error("Ensure all bookings and sub-services are removed first.");
        } finally {
            setLoading(false);
            setOpen(false);
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
            <div className="flex items-center justify-between">
                <Heading title={title} description={description} />
                {initialData && (
                    <Button
                        disabled={loading}
                        variant="destructive"
                        size="icon"
                        onClick={() => setOpen(true)}
                    >
                        <Trash className="h-4 w-4" />
                    </Button>
                )}
            </div>
            <Separator />
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full">
                    <div className="grid grid-cols-3 gap-8">
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
                            name="price"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Price ($)</FormLabel>
                                    <FormControl>
                                        <Input type="number" disabled={loading} placeholder="19.99" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="durationMinutes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Duration (minutes)</FormLabel>
                                    <FormControl>
                                        <Input 
                                            type="number" 
                                            disabled={loading} 
                                            placeholder="60" 
                                            value={field.value ?? ""} 
                                            onChange={field.onChange} 
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
                        <FormField
                            control={form.control}
                            name="isPopular"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
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
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Textarea 
                                            disabled={loading} 
                                            placeholder="Service description" 
                                            value={field.value ?? ""} 
                                            onChange={field.onChange} 
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <Button disabled={loading} className="ml-auto" type="submit">
                        {action}
                    </Button>
                </form>
            </Form>
        </>
    );
};