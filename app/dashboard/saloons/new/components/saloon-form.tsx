// app/(dashboard)/dashboard/saloons/new/components/saloon-form.tsx
"use client";
import * as z from "zod";
import { Saloon } from "@prisma/client";
import { Trash } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
import React from "react";
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
import { MapboxLocationPicker } from "@/components/ui/mapbox-location-picker";
import { Search, ChevronDown, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
    const [searchQuery, setSearchQuery] = useState("");
    const [currentStep, setCurrentStep] = useState(1);
    const [canSubmit, setCanSubmit] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const [selectedLocation, setSelectedLocation] = useState<{
        latitude: number;
        longitude: number;
        address: string;
    } | null>(null);

    const nextStep = async () => {
        let fieldsToValidate: any[] = [];

        switch (currentStep) {
            case 1:
                fieldsToValidate = ['name'];
                break;
            case 2:
                fieldsToValidate = ['shortIntro'];
                break;
            case 3:
                fieldsToValidate = ['images'];
                break;
            case 4:
                fieldsToValidate = ['address', 'latitude', 'longitude'];
                break;
            case 5:
                // Final step, no next step
                return;
        }

        const isValid = await form.trigger(fieldsToValidate);
        if (isValid) {
            setCurrentStep((prev) => prev + 1);
        }
    };

    const prevStep = () => {
        setCurrentStep((prev) => prev - 1);
        setCanSubmit(false);
    };


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
                router.refresh();
                router.push('/dashboard/saloons');
                toast.success(toastMessage);
            } else {
                const response = await axios.post(`/api/saloons`, { ...saloonData, selectedServices });
                const newSaloonId = response.data.id;

                router.refresh();
                router.push(`/dashboard/saloons/${newSaloonId}/pricing`);
                toast.success(toastMessage);
            }
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



            {/* Main content container with proper bottom padding for mobile */}
            <div className="pb-20 md:pb-0">
                <Form {...form}>
                    <form
                        id="saloon-form"
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (currentStep === 5 && canSubmit) {
                                form.handleSubmit(onSubmit)(e);
                                setCanSubmit(false);
                            }
                        }}
                        className="space-y-4 md:space-y-6 w-full max-w-full"
                    >

                        {/* Step 1: Name */}
                        {currentStep === 1 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                <Heading title="Mikä on salooninne nimi?" />
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Input
                                                    disabled={loading}
                                                    placeholder="salongin nimi"
                                                    className="text-lg text-gray-500 py-6"
                                                    autoFocus
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        )}

                        {/* Step 2: Short Intro */}
                        {currentStep === 2 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                <Heading title="Kerro lyhyt esittely yrityksestäsi." />
                                <FormField
                                    control={form.control}
                                    name="shortIntro"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Input
                                                    disabled={loading}
                                                    placeholder="esim. Premium-hius- ja kauneuspalvelut Helsingissä"
                                                    className="text-lg py-6"
                                                    autoFocus
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        )}

                        {/* Step 3: Images */}
                        {currentStep === 3 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                <Heading title="Lisää salonkikuva" />
                                <FormField
                                    control={form.control}
                                    name="images"
                                    render={({ field }) => (
                                        <FormItem>
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
                            </div>
                        )}

                        {/* Step 4: Address & Map */}
                        {currentStep === 4 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                <Heading title="Missä sijaitset?" />

                                <div className="mt-4">
                                    <MapboxLocationPicker
                                        onLocationSelect={handleLocationSelect}
                                        initialLocation={selectedLocation || undefined}
                                        disabled={loading}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Step 5: Services */}
                        {currentStep === 5 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">

                                <FormField
                                    control={form.control}
                                    name="selectedServices"
                                    render={({ field }) => {
                                        // Group services by category and parent
                                        const groupedServices = services.reduce((acc: any, service: any) => {
                                            const categoryName = service.category?.name || 'Uncategorized';
                                            const parentName = service.parentService?.name || 'No Parent';
                                            const key = `${categoryName}::${parentName}`;

                                            if (!acc[key]) {
                                                acc[key] = {
                                                    category: categoryName,
                                                    parent: parentName,
                                                    services: []
                                                };
                                            }
                                            acc[key].services.push(service);
                                            return acc;
                                        }, {});

                                        // Filter services based on search
                                        const filteredGroups = Object.entries(groupedServices).filter(([key, group]: [string, any]) => {
                                            if (!searchQuery) return true;
                                            const query = searchQuery.toLowerCase();
                                            return group.services.some((s: any) =>
                                                s.name.toLowerCase().includes(query) ||
                                                s.description?.toLowerCase().includes(query) ||
                                                group.category.toLowerCase().includes(query) ||
                                                group.parent.toLowerCase().includes(query)
                                            );
                                        }).map(([key, group]: [string, any]) => ({
                                            key,
                                            ...group,
                                            services: group.services.filter((s: any) => {
                                                if (!searchQuery) return true;
                                                const query = searchQuery.toLowerCase();
                                                return s.name.toLowerCase().includes(query) ||
                                                    s.description?.toLowerCase().includes(query) ||
                                                    group.category.toLowerCase().includes(query) ||
                                                    group.parent.toLowerCase().includes(query);
                                            })
                                        }));

                                        const toggleGroup = (key: string) => {
                                            const newExpanded = new Set(expandedGroups);
                                            if (newExpanded.has(key)) {
                                                newExpanded.delete(key);
                                            } else {
                                                newExpanded.add(key);
                                            }
                                            setExpandedGroups(newExpanded);
                                        };

                                        const toggleAllInGroup = (groupServices: any[], checked: boolean) => {
                                            const currentValues = field.value || [];
                                            if (checked) {
                                                const newIds = groupServices
                                                    .map((s: any) => s.id)
                                                    .filter((id: string) => !currentValues.includes(id));
                                                field.onChange([...currentValues, ...newIds]);
                                            } else {
                                                const groupIds = groupServices.map((s: any) => s.id);
                                                field.onChange(currentValues.filter((id: string) => !groupIds.includes(id)));
                                            }
                                        };

                                        const isGroupAllSelected = (groupServices: any[]) => {
                                            const currentValues = field.value || [];
                                            return groupServices.every((s: any) => currentValues.includes(s.id));
                                        };

                                        return (
                                            <FormItem>
                                                <FormControl>
                                                    <div className="space-y-4">
                                                        {/* Search Bar */}
                                                        <div className="relative">
                                                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                            <Input
                                                                placeholder="valitse tai etsi palveluita"
                                                                value={searchQuery}
                                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        e.preventDefault();
                                                                    }
                                                                }}
                                                                className="pl-10"
                                                            />
                                                        </div>

                                                        {loadingServices ? (
                                                            <div className="text-center py-8">
                                                                <p className="text-sm text-muted-foreground">Loading services...</p>
                                                            </div>
                                                        ) : services.length === 0 ? (
                                                            <div className="text-center py-8">
                                                                <p className="text-sm text-muted-foreground">No sub-services available. Admins need to create sub-services first.</p>
                                                            </div>
                                                        ) : filteredGroups.length === 0 ? (
                                                            <div className="text-center py-8">
                                                                <p className="text-sm text-muted-foreground">No services match your search.</p>
                                                            </div>
                                                        ) : (
                                                            <div className="border rounded-md overflow-hidden">
                                                                {/* Desktop Table View */}
                                                                <div className="hidden md:block max-h-[500px] overflow-y-auto">
                                                                    <table className="w-full">
                                                                        <thead className="bg-muted sticky top-0 z-10">
                                                                            <tr>
                                                                                <th className="text-left p-3 text-sm font-medium w-12">
                                                                                    <Checkbox
                                                                                        checked={services.length > 0 && (field.value || []).length === services.length}
                                                                                        onCheckedChange={(checked) => {
                                                                                            if (checked) {
                                                                                                field.onChange(services.map((s: any) => s.id));
                                                                                            } else {
                                                                                                field.onChange([]);
                                                                                            }
                                                                                        }}
                                                                                    />
                                                                                </th>
                                                                                <th className="text-left p-3 text-sm font-medium">Service Name</th>
                                                                                <th className="text-left p-3 text-sm font-medium">Description</th>
                                                                                <th className="text-left p-3 text-sm font-medium">Category</th>
                                                                                <th className="text-left p-3 text-sm font-medium">Parent Service</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {filteredGroups.map((group) => (
                                                                                <React.Fragment key={group.key}>
                                                                                    <tr className="bg-muted/50 border-t">
                                                                                        <td colSpan={5} className="p-2">
                                                                                            <div className="flex items-center justify-between">
                                                                                                <div className="flex items-center gap-2">
                                                                                                    <button
                                                                                                        type="button"
                                                                                                        onClick={() => toggleGroup(group.key)}
                                                                                                        className="p-1 hover:bg-background rounded"
                                                                                                    >
                                                                                                        {expandedGroups.has(group.key) ? (
                                                                                                            <ChevronDown className="h-4 w-4" />
                                                                                                        ) : (
                                                                                                            <ChevronRight className="h-4 w-4" />
                                                                                                        )}
                                                                                                    </button>
                                                                                                    <span className="text-sm font-semibold">
                                                                                                        {group.category} → {group.parent}
                                                                                                    </span>
                                                                                                    <span className="text-xs text-muted-foreground">
                                                                                                        ({group.services.length} {group.services.length === 1 ? 'service' : 'services'})
                                                                                                    </span>
                                                                                                </div>
                                                                                                <Checkbox
                                                                                                    checked={isGroupAllSelected(group.services)}
                                                                                                    onCheckedChange={(checked) => toggleAllInGroup(group.services, checked as boolean)}
                                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                                />
                                                                                            </div>
                                                                                        </td>
                                                                                    </tr>
                                                                                    {expandedGroups.has(group.key) && group.services.map((service: any) => (
                                                                                        <tr key={service.id} className="border-t hover:bg-muted/30">
                                                                                            <td className="p-3">
                                                                                                <Checkbox
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
                                                                                            </td>
                                                                                            <td className="p-3">
                                                                                                <label
                                                                                                    htmlFor={service.id}
                                                                                                    className="text-sm font-medium cursor-pointer"
                                                                                                >
                                                                                                    {service.name}
                                                                                                </label>
                                                                                            </td>
                                                                                            <td className="p-3">
                                                                                                <p className="text-xs text-muted-foreground line-clamp-2">
                                                                                                    {service.description || '—'}
                                                                                                </p>
                                                                                            </td>
                                                                                            <td className="p-3">
                                                                                                <span className="text-xs text-muted-foreground">
                                                                                                    {group.category}
                                                                                                </span>
                                                                                            </td>
                                                                                            <td className="p-3">
                                                                                                <span className="text-xs text-muted-foreground">
                                                                                                    {group.parent}
                                                                                                </span>
                                                                                            </td>
                                                                                        </tr>
                                                                                    ))}
                                                                                </React.Fragment>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>

                                                                {/* Mobile Card View */}
                                                                <div className="md:hidden max-h-[500px] overflow-y-auto p-4 space-y-3">
                                                                    {filteredGroups.map((group) => (
                                                                        <Collapsible
                                                                            key={group.key}
                                                                            open={expandedGroups.has(group.key)}
                                                                            onOpenChange={() => toggleGroup(group.key)}
                                                                        >
                                                                            <CollapsibleTrigger className="w-full">
                                                                                <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                                                                                    <div className="flex items-center gap-2 flex-1">
                                                                                        {expandedGroups.has(group.key) ? (
                                                                                            <ChevronDown className="h-4 w-4" />
                                                                                        ) : (
                                                                                            <ChevronRight className="h-4 w-4" />
                                                                                        )}
                                                                                        <div className="text-left">
                                                                                            <p className="text-sm font-semibold">{group.category}</p>
                                                                                            <p className="text-xs text-muted-foreground">{group.parent}</p>
                                                                                            <p className="text-xs text-muted-foreground mt-1">
                                                                                                {group.services.length} {group.services.length === 1 ? 'service' : 'services'}
                                                                                            </p>
                                                                                        </div>
                                                                                    </div>
                                                                                    <Checkbox
                                                                                        checked={isGroupAllSelected(group.services)}
                                                                                        onCheckedChange={(checked) => toggleAllInGroup(group.services, checked as boolean)}
                                                                                        onClick={(e) => e.stopPropagation()}
                                                                                    />
                                                                                </div>
                                                                            </CollapsibleTrigger>
                                                                            <CollapsibleContent>
                                                                                <div className="space-y-2 mt-2 pl-4">
                                                                                    {group.services.map((service: any) => (
                                                                                        <div key={service.id} className="flex items-start gap-3 p-2 border rounded-md">
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
                                                                                            <div className="flex-1 min-w-0">
                                                                                                <label
                                                                                                    htmlFor={service.id}
                                                                                                    className="text-sm font-medium cursor-pointer block"
                                                                                                >
                                                                                                    {service.name}
                                                                                                </label>
                                                                                                {service.description && (
                                                                                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                                                                                        {service.description}
                                                                                                    </p>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            </CollapsibleContent>
                                                                        </Collapsible>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        );
                                    }}
                                />
                            </div>
                        )}

                        {/* Desktop Buttons */}
                        <div className="hidden md:flex w-full md:w-auto md:ml-auto gap-4">
                            {currentStep > 1 && (
                                <Button
                                    disabled={loading}
                                    variant="outline"
                                    type="button"
                                    onClick={prevStep}
                                >
                                    Back
                                </Button>
                            )}
                            <Button
                                disabled={loading}
                                type={currentStep === 5 ? "submit" : "button"}
                                onClick={currentStep === 5 ? () => setCanSubmit(true) : nextStep}
                            >
                                {currentStep === 5 ? action : "Continue"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </div>

            {/* Mobile Sticky Bottom Button - Fixed positioning */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-t border-gray-200 p-4 shadow-lg flex gap-3">
                {currentStep > 1 && (
                    <Button
                        disabled={loading}
                        variant="outline"
                        type="button"
                        onClick={prevStep}
                        className="flex-1"
                    >
                        Back
                    </Button>
                )}
                <Button
                    disabled={loading}
                    className="flex-1"
                    type={currentStep === 5 ? "submit" : "button"}
                    form={currentStep === 5 ? "saloon-form" : undefined}
                    onClick={currentStep === 5 ? () => setCanSubmit(true) : nextStep}
                >
                    {currentStep === 5 ? action : "Continue"}
                </Button>
            </div>
        </div>
    );
};
