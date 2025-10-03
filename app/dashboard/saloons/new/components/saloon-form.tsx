// app/(dashboard)/dashboard/saloons/new/components/saloon-form.tsx
"use client";
import * as z from "zod";
import { Saloon } from "@prisma/client";
import { Trash } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { AlertModal } from "@/components/modals/alert-modal";
import ImageUpload from "@/components/ui/image-upload";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const formSchema = z.object({
    name: z.string().min(1, "Name is required."),
    description: z.string().optional(),
    shortIntro: z.string().optional(),
    address: z.string().optional(),
    images: z.object({ url: z.string() }).array(),
    selectedServices: z.array(z.string()).optional(),
});

type SaloonFormValues = z.infer<typeof formSchema>;

interface SaloonFormProps {
    initialData: Saloon & {
        images: { url: string }[];
    } | null;
}

export const SaloonForm: React.FC<SaloonFormProps> = ({ initialData }) => {
    const router = useRouter();

    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [services, setServices] = useState<any[]>([]);
    const [loadingServices, setLoadingServices] = useState(false);

    const title = initialData ? "Edit saloon" : "Create saloon";
    const description = initialData ? "Edit saloon details" : "Add a new saloon";
    const toastMessage = initialData ? "Saloon updated successfully." : "Saloon created successfully.";
    const action = initialData ? "Save changes" : "Create";

    const form = useForm<SaloonFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: initialData ? {
            name: initialData.name,
            description: initialData.description ?? "", // normalize
            shortIntro: initialData.shortIntro ?? "",
            address: initialData.address ?? "",
            images: initialData.images || [],
            selectedServices: [],
        } : {
            name: "",
            description: "",
            shortIntro: "",
            address: "",
            images: [],
            selectedServices: [],
        },
    });

    // Fetch all sub-services for selection
    useEffect(() => {
        const fetchServices = async () => {
            try {
                setLoadingServices(true);
                const response = await axios.get('/api/services');
                // Filter only sub-services (services with parentServiceId)
                const subServices = response.data.filter((service: any) => service.parentServiceId);
                setServices(subServices);
            } catch (error) {
                console.error('Error fetching services:', error);
                toast.error("Failed to fetch services");
            } finally {
                setLoadingServices(false);
            }
        };
        fetchServices();
    }, []);

    const onSubmit = async (data: SaloonFormValues) => {
        try {
            setLoading(true);
            
            // Extract selectedServices from data
            const { selectedServices, ...saloonData } = data;
            
            if (initialData) {
                await axios.patch(
                    `/api/saloons/${initialData.id}`,
                    { ...saloonData, selectedServices }
                );
            } else {
                await axios.post(`/api/saloons`, { ...saloonData, selectedServices });
            }
    
            router.refresh();
            router.push('/dashboard/saloons');
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
            const response = await axios.delete(
                `/api/saloons/${initialData.id}`
            );
            
            // Check if user has remaining salons
            if (!response.data.hasRemainingSaloons) {
                // No remaining salons, navigate to create new salon
                toast.success("Saloon deleted. Please create a new salon to continue.");
                // Close modal and navigate to salon creation page
                setOpen(false);
                setTimeout(() => {
                    router.push('/dashboard/saloons/new');
                }, 200);
            } else {
                // Has remaining saloons, navigate normally
                toast.success("Saloon deleted successfully.");
                setOpen(false);
                setTimeout(() => {
                    router.refresh();
                    router.push('/dashboard/saloons');
                }, 100);
            }
        } catch (error) {
            toast.error("Failed to delete saloon. Please try again.");
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
                        Delete Saloon
                    </Button>
                )}
            </div>
            
            <Separator className="mb-6" />
            
            {/* Main content container with proper bottom padding for mobile */}
            <div className="pb-20 md:pb-0">
                <Form {...form}>
                    <form
                        id="saloon-form"
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-6 w-full"
                    >
                        {/* Image Upload Section */}
                        <FormField
                            control={form.control}
                            name="images"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Images</FormLabel>
                                    <FormControl>
                                        <ImageUpload
                                            value={field.value.map((image) => image.url)}
                                            disabled={loading}
                                            onChange={(url) => field.onChange([...field.value, { url }])}
                                            onRemove={(url) => field.onChange([...field.value.filter((current) => current.url !== url)])}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        
                        {/* Form Fields Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Name</FormLabel>
                                        <FormControl>
                                            <Input
                                                disabled={loading}
                                                placeholder="Enter saloon name"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            
                            <FormField
                                control={form.control}
                                name="shortIntro"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Short Introduction</FormLabel>
                                        <FormControl>
                                            <Input
                                                disabled={loading}
                                                placeholder="Enter short introduction"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            
                            <FormField
                                control={form.control}
                                name="address"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Address</FormLabel>
                                        <FormControl>
                                            <Input
                                                disabled={loading}
                                                placeholder="Enter address"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem className="md:col-span-3">
                                        <FormLabel>Description</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                disabled={loading}
                                                placeholder="Enter description"
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

                        {/* Service Selection */}
                        <div className="md:col-span-4">
                            <FormField
                                control={form.control}
                                name="selectedServices"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Available Services</FormLabel>
                                        <FormDescription>
                                            Select which sub-services will be available in this saloon
                                        </FormDescription>
                                        <FormControl>
                                            <div className="space-y-4">
                                                {loadingServices ? (
                                                    <div className="text-center py-4">
                                                        <p className="text-sm text-muted-foreground">Loading services...</p>
                                                    </div>
                                                ) : services.length === 0 ? (
                                                    <div className="text-center py-4">
                                                        <p className="text-sm text-muted-foreground">No sub-services available. Admins need to create sub-services first.</p>
                                                    </div>
                                                ) : (
                                                    <div className="grid gap-3 max-h-60 overflow-y-auto border rounded-md p-4">
                                                        {services.map((service) => (
                                                            <div key={service.id} className="flex items-start space-x-3">
                                                                <Checkbox
                                                                    id={service.id}
                                                                    checked={field.value?.includes(service.id) || false}
                                                                    onCheckedChange={(checked) => {
                                                                        const currentValues = field.value || [];
                                                                        if (checked) {
                                                                            field.onChange([...currentValues, service.id]);
                                                                        } else {
                                                                            field.onChange(currentValues.filter((id: string) => id !== service.id));
                                                                        }
                                                                    }}
                                                                />
                                                                <div className="flex-1 space-y-1">
                                                                    <label
                                                                        htmlFor={service.id}
                                                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                                                    >
                                                                        {service.name}
                                                                    </label>
                                                                    {service.description && (
                                                                        <p className="text-xs text-muted-foreground">
                                                                            {service.description}
                                                                        </p>
                                                                    )}
                                                                    <p className="text-xs text-blue-600">
                                                                        Category: {service.category?.name} • Parent: {service.parentService?.name}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
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
                <Button disabled={loading} className="w-full" type="submit" form="saloon-form">
                    {action}
                </Button>
            </div>
        </div>
    );
};
