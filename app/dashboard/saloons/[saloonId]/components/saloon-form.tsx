// app/(dashboard)/dashboard/saloons/[saloonId]/components/saloon-form.tsx
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
import { MapboxLocationPicker } from "@/components/ui/mapbox-location-picker";

const formSchema = z.object({
    name: z.string().min(1, "Name is required."),
    description: z.string().optional(),
    shortIntro: z.string().optional(),
    address: z.string().optional(),
    images: z.object({ url: z.string() }).array(),
    selectedServices: z.array(z.string()).optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
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
    const [selectedLocation, setSelectedLocation] = useState<{
        latitude: number;
        longitude: number;
        address: string;
    } | null>(null);

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
            latitude: initialData.latitude || undefined,
            longitude: initialData.longitude || undefined,
        } : {
            name: "",
            description: "",
            shortIntro: "",
            address: "",
            images: [],
            selectedServices: [],
            latitude: undefined,
            longitude: undefined,
        },
    });

    // Fetch all sub-services for selection and existing salon services
    useEffect(() => {
        const fetchServices = async () => {
            try {
                setLoadingServices(true);
                
                // Fetch all available sub-services
                const servicesResponse = await axios.get('/api/services');
                const subServices = servicesResponse.data.filter((service: any) => service.parentServiceId);
                setServices(subServices);
                
                // If editing, fetch existing salon services
                if (initialData) {
                    const saloonServicesResponse = await axios.get(`/api/saloons/${initialData.id}/services`);
                    const selectedServiceIds = saloonServicesResponse.data.map((saloonService: any) => saloonService.service.id);
                    form.setValue('selectedServices', selectedServiceIds);
                }
            } catch (error) {
                console.error('Error fetching services:', error);
                toast.error("Failed to fetch services");
            } finally {
                setLoadingServices(false);
            }
        };
        fetchServices();
    }, [initialData, form]);

    // Initialize selected location from initial data
    useEffect(() => {
        if (initialData && initialData.latitude && initialData.longitude) {
            setSelectedLocation({
                latitude: initialData.latitude,
                longitude: initialData.longitude,
                address: initialData.address || 'Selected location'
            });
        }
    }, [initialData]);

    const handleLocationSelect = (location: { latitude: number; longitude: number; address: string }) => {
        setSelectedLocation(location);
        form.setValue('latitude', location.latitude);
        form.setValue('longitude', location.longitude);
        form.setValue('address', location.address);
    };

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

                        {/* Location Selection */}
                        <div className="md:col-span-4">
                            <MapboxLocationPicker
                                onLocationSelect={handleLocationSelect}
                                initialLocation={selectedLocation || undefined}
                                disabled={loading}
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
                                                                    <p className="text-xs text-brand-dark">
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
            
            {/* Mobile Floating Buttons */}
            <div className="md:hidden fixed bottom-20 right-4 z-[60] flex flex-col gap-3">
                {initialData && (
                    <Button
                        disabled={loading}
                        variant="destructive"
                        size="sm"
                        onClick={() => setOpen(true)}
                        className="w-16 h-16 rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                        <Trash className="h-4 w-4" />
                    </Button>
                )}
                <Button 
                    disabled={loading} 
                    className="w-16 h-16 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 bg-brand-dark hover:bg-brand-dark/90 text-white" 
                    type="submit" 
                    form="saloon-form"
                >
                    <span className="text-sm font-medium">Save</span>
                </Button>
            </div>
        </div>
    );
};
