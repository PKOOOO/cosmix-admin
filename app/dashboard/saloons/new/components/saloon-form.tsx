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
import { ChevronsUpDown, Check, Search, ChevronDown, ChevronRight } from "lucide-react";
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
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedParentServiceId, setSelectedParentServiceId] = useState<string | null>(null);

    // Detect keyboard using visualViewport API for accurate height
    useEffect(() => {
        if (typeof window === 'undefined' || !window.visualViewport) return;

        const viewport = window.visualViewport;

        const handleResize = () => {
            // Calculate keyboard height from viewport difference
            const windowHeight = window.innerHeight;
            const viewportHeight = viewport.height;
            const calculatedKeyboardHeight = windowHeight - viewportHeight;

            // Only set if keyboard is actually open (height > 100px threshold)
            if (calculatedKeyboardHeight > 100) {
                setKeyboardHeight(calculatedKeyboardHeight);
            } else {
                setKeyboardHeight(0);
            }
        };

        viewport.addEventListener('resize', handleResize);
        viewport.addEventListener('scroll', handleResize);

        // Initial check
        handleResize();

        return () => {
            viewport.removeEventListener('resize', handleResize);
            viewport.removeEventListener('scroll', handleResize);
        };
    }, []);

    const nextStep = async () => {
        let fieldsToValidate: any[] = [];

        switch (currentStep) {
            case 1:
                fieldsToValidate = ['name'];
                break;
            case 2:
                fieldsToValidate = ['shortIntro', 'description'];
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
    const toastMessage = initialData ? "Salonkki päivitetty." : "Salonin luominen onnistui.";
    const action = initialData ? "Save changes" : "Luoda";

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
    // Removed 'form' from dependencies to prevent infinite loops if form object reference changes
    useEffect(() => {
        const fetchServices = async () => {
            try {
                setLoadingServices(true);
                const response = await axios.get('/api/services');
                // Filter only sub-services (services with parentServiceId)
                const subServices = response.data.filter((service: any) => service.parentServiceId);
                setServices(subServices);

                // Set first category as selected initially
                if (subServices.length > 0) {
                    const groups = subServices.reduce((groups: any, service: any) => {
                        // FIX: Handle both string and object categories robustly
                        let categoryName = 'Other';
                        if (service.category) {
                            if (typeof service.category === 'object') {
                                categoryName = service.category.name || 'Other';
                            } else {
                                categoryName = String(service.category);
                            }
                        }

                        // Prevent [object Object] if something slipped through
                        if (categoryName === '[object Object]') categoryName = 'Other';

                        if (!groups[categoryName]) {
                            groups[categoryName] = [];
                        }
                        groups[categoryName].push(service);
                        return groups;
                    }, {});
                    const categories = Object.keys(groups);
                    if (categories.length > 0) {
                        setSelectedCategory(categories[0]);
                    }
                }

                // If editing, fetch existing salon services
                if (initialData) {
                    try {
                        const saloonServicesResponse = await axios.get(`/api/saloons/${initialData.id}/services`);
                        const selectedServiceIds = saloonServicesResponse.data.map((saloonService: any) => saloonService.service.id);
                        // Access setValue directly from form closure, strictly internal
                        form.setValue('selectedServices', selectedServiceIds);
                    } catch (err) {
                        console.error("Error fetching existing services", err);
                    }
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

    // Watch form values for validation
    const watchedName = form.watch("name");
    const watchedIntro = form.watch("shortIntro");
    const watchedImages = form.watch("images");
    const watchedLat = form.watch("latitude");
    const watchedServices = form.watch("selectedServices");

    // Check if current step is valid
    const isStepValid = () => {
        switch (currentStep) {
            case 1:
                return !!watchedName && watchedName.length > 0;
            case 2:
                return !!watchedIntro && watchedIntro.length > 0;
            case 3:
                return watchedImages && watchedImages.length > 0;
            case 4:
                return !!watchedLat;
            case 5:
                return watchedServices && watchedServices.length > 0;
            default:
                return true;
        }
    };

    // Group services by category
    const groupedServices = React.useMemo(() => {
        return services.reduce((groups, service) => {
            const categoryName = (typeof service.category === 'object' && service.category !== null)
                ? service.category.name
                : service.category;
            const category = categoryName || 'Other';

            if (!groups[category]) {
                groups[category] = [];
            }
            groups[category].push(service);
            return groups;
        }, {} as Record<string, any[]>);
    }, [services]);

    // Get all unique categories
    const allCategories = React.useMemo(() => Object.keys(groupedServices), [groupedServices]);

    // Filter categories based on search
    const categories = React.useMemo(() => {
        if (!searchQuery) return allCategories;

        return allCategories.filter(category => {
            const categoryServices = groupedServices[category];
            return categoryServices.some((service: any) =>
                service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (service.description && service.description.toLowerCase().includes(searchQuery.toLowerCase()))
            );
        });
    }, [allCategories, groupedServices, searchQuery]);

    // Ensure selected category is valid
    const effectiveSelectedCategory = React.useMemo(() => {
        if (selectedCategory && categories.includes(selectedCategory)) {
            return selectedCategory;
        }
        return categories.length > 0 ? categories[0] : null;
    }, [selectedCategory, categories]);

    // Group services by parent service within the selected category
    const parentServicesInCategory = React.useMemo(() => {
        if (!effectiveSelectedCategory) return [];
        const categoryServices = groupedServices[effectiveSelectedCategory];
        if (!categoryServices) return [];

        // Group sub-services by their parentService
        const parentMap = new Map<string, { parent: any; subServices: any[] }>();

        categoryServices.forEach((service: any) => {
            if (service.parentService) {
                const parentId = service.parentService.id;
                if (!parentMap.has(parentId)) {
                    parentMap.set(parentId, {
                        parent: service.parentService,
                        subServices: []
                    });
                }
                parentMap.get(parentId)!.subServices.push(service);
            }
        });

        // Convert to array and filter based on search
        let parentServices = Array.from(parentMap.values());

        if (searchQuery) {
            parentServices = parentServices.filter(({ parent, subServices }) => {
                // Check if parent name matches
                const parentMatches = parent.name?.toLowerCase().includes(searchQuery.toLowerCase());
                // Check if any sub-service matches
                const subServiceMatches = subServices.some((service: any) =>
                    service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (service.description && service.description.toLowerCase().includes(searchQuery.toLowerCase()))
                );
                return parentMatches || subServiceMatches;
            });
        }

        return parentServices;
    }, [effectiveSelectedCategory, groupedServices, searchQuery]);

    // Get sub-services for selected parent service
    const subServicesForSelectedParent = React.useMemo(() => {
        if (!selectedParentServiceId || !effectiveSelectedCategory) return [];

        const categoryServices = groupedServices[effectiveSelectedCategory];
        if (!categoryServices) return [];

        let subServices = categoryServices.filter((service: any) =>
            service.parentService?.id === selectedParentServiceId
        );

        if (searchQuery) {
            subServices = subServices.filter((service: any) =>
                service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (service.description && service.description.toLowerCase().includes(searchQuery.toLowerCase()))
            );
        }

        return subServices;
    }, [selectedParentServiceId, effectiveSelectedCategory, groupedServices, searchQuery]);

    // Get selected parent service name
    const selectedParentServiceName = React.useMemo(() => {
        if (!selectedParentServiceId) return null;
        const parentEntry = parentServicesInCategory.find(p => p.parent.id === selectedParentServiceId);
        return parentEntry?.parent.name || null;
    }, [selectedParentServiceId, parentServicesInCategory]);

    // Get services for current view (vertical list) - DEPRECATED, kept for backward compatibility
    const displayServices = React.useMemo(() => {
        if (!effectiveSelectedCategory) return [];
        const categoryServices = groupedServices[effectiveSelectedCategory];

        if (!searchQuery) return categoryServices;

        return categoryServices.filter((service: any) =>
            service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (service.description && service.description.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }, [effectiveSelectedCategory, groupedServices, searchQuery]);

    return (
        <div className="relative">
            <AlertModal
                isOpen={open}
                onClose={() => setOpen(false)}
                onConfirm={onDelete}
                loading={loading}
            />

            {/* Header Section - Hidden on fullscreen steps (map and services) */}
            {currentStep !== 4 && currentStep !== 5 && (
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
            )}



            {/* Main content container with proper bottom padding for mobile */}
            <div
                className={`transition-all duration-200 ${currentStep === 4 ? 'pb-20' : 'pb-24 md:pb-0'}`}
                style={{ paddingBottom: keyboardHeight > 0 ? `${keyboardHeight + 80}px` : undefined }}
            >
                <Form {...form}>
                    <form
                        id="saloon-form"
                        autoComplete="off"
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (currentStep === 5 && canSubmit) {
                                form.handleSubmit(onSubmit)(e);
                                setCanSubmit(false);
                            }
                        }}
                        className={currentStep === 4 ? "w-full max-w-full" : "space-y-4 md:space-y-6 w-full max-w-full"}
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

                        {/* Step 2: Description & Short Intro */}
                        {currentStep === 2 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                <Heading title="Kerro yrityksestäsi." />
                                <FormField
                                    control={form.control}
                                    name="shortIntro"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Lyhyt esittely</FormLabel>
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
                                                    onChange={(url) => {
                                                        const current = form.getValues('images') || [];
                                                        field.onChange([...current, { url }]);
                                                    }}
                                                    onRemove={(url) => {
                                                        const current = form.getValues('images') || [];
                                                        field.onChange(current.filter((current) => current.url !== url));
                                                    }}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        )}

                        {/* Step 4: Map */}
                        {currentStep === 4 && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-300 -mx-4 sm:-mx-8 -mt-[72px] md:-mt-6">
                                <MapboxLocationPicker
                                    onLocationSelect={handleLocationSelect}
                                    initialLocation={selectedLocation || undefined}
                                    disabled={loading}
                                />
                            </div>
                        )}

                        {/* Step 5: Services */}
                        {currentStep === 5 && (
                            // Main container: Fixed height (viewport - offset), Flex column
                            // -mt-[72px] preserves the top alignment user likes
                            // h-[calc(100vh-90px)] extends lower to close gap above buttons
                            <div className="animate-in fade-in slide-in-from-right-4 duration-300 -mx-4 sm:-mx-8 -mt-[72px] md:-mt-6 h-[calc(100vh-50px)] flex flex-col">

                                <FormField
                                    control={form.control}
                                    name="selectedServices"
                                    render={({ field }) => {
                                        const toggleService = (serviceId: string, currentValues: string[]) => {
                                            if (currentValues.includes(serviceId)) {
                                            }
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
                                            if (!groupServices || groupServices.length === 0) return false;
                                            const currentValues = field.value || [];
                                            return groupServices.every((s: any) => currentValues.includes(s.id));
                                        };

                                        return (
                                            <FormItem className="flex flex-col h-full">
                                                <FormControl>
                                                    <div className="flex flex-col h-full">

                                                        {/* FIXED HEADER SECTION (Non-scrollable) */}
                                                        <div className="flex-none z-30 bg-background/95 backdrop-blur-sm border-b border-border/40">

                                                            {/* Search Bar */}
                                                            <div className="pt-4 px-4 pb-2">
                                                                <div className="max-w-md mx-auto">
                                                                    <div
                                                                        className="flex items-center bg-white rounded-full border-2 border-[#423120] px-4 py-3 shadow-lg"
                                                                        style={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)' }}
                                                                    >
                                                                        <Search className="h-6 w-6 text-[#423120] mr-3 flex-shrink-0" />
                                                                        <input
                                                                            type="text"
                                                                            placeholder="Valitse tai etsi palveluita..."
                                                                            value={searchQuery}
                                                                            onChange={(e) => setSearchQuery(e.target.value)}
                                                                            className="flex-1 bg-transparent border-none outline-none text-lg placeholder:text-gray-400 text-[#423120]"
                                                                            autoComplete="off"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Categories Pills */}
                                                            {categories.length > 0 && (
                                                                <div className="py-3 px-4 mb-0">
                                                                    <div className="flex gap-2 overflow-x-auto no-scrollbar p-1">
                                                                        {categories.map((category) => {
                                                                            const isSelected = effectiveSelectedCategory === category;
                                                                            return (
                                                                                <button
                                                                                    key={category}
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        setSelectedCategory(category);
                                                                                        setSelectedParentServiceId(null);
                                                                                    }}
                                                                                    className={`
                                                                                        whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all
                                                                                        ${isSelected
                                                                                            ? 'bg-[#423120] text-white shadow-md scale-105'
                                                                                            : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                                                                                        }
                                                                                    `}
                                                                                >
                                                                                    {category}
                                                                                </button>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* SCROLLABLE CONTENT SECTION (Flex-1) */}
                                                        {/* overscroll-contain prevents the parent page from scrolling when this list hits the bottom */}
                                                        <div className="flex-1 overflow-y-auto overscroll-contain px-4 p-5 pb-20">
                                                            {loadingServices ? (
                                                                <div className="text-center py-8">
                                                                    <p className="text-sm text-muted-foreground">Loading services...</p>
                                                                </div>
                                                            ) : services.length === 0 ? (
                                                                <div className="text-center py-8">
                                                                    <p className="text-sm text-muted-foreground">No sub-services available. Admins need to create sub-services first.</p>
                                                                </div>
                                                            ) : categories.length === 0 ? (
                                                                <div className="text-center py-8">
                                                                    <p className="text-sm text-muted-foreground">No services match your search.</p>
                                                                </div>
                                                            ) : !effectiveSelectedCategory ? (
                                                                <div className="text-center py-8">
                                                                    <p className="text-sm text-muted-foreground">Select a category to view services.</p>
                                                                </div>
                                                            ) : selectedParentServiceId ? (
                                                                /* Sub-services view for selected parent */
                                                                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                                                    {/* Back button and parent service header */}
                                                                    <div className="flex items-center gap-3 mb-4">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setSelectedParentServiceId(null)}
                                                                            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                                                                        >
                                                                            <ChevronRight className="h-5 w-5 rotate-180" />
                                                                            <span className="text-sm">Takaisin</span>
                                                                        </button>
                                                                    </div>

                                                                    {/* Parent service title and select all */}
                                                                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50">
                                                                        <div>
                                                                            <h3 className="font-semibold text-lg">{selectedParentServiceName}</h3>
                                                                            <p className="text-xs text-muted-foreground">
                                                                                {subServicesForSelectedParent.length} {subServicesForSelectedParent.length === 1 ? 'palvelu' : 'palvelua'}
                                                                            </p>
                                                                        </div>
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-sm text-muted-foreground">Valitse Kaikki</span>
                                                                            <Checkbox
                                                                                checked={isGroupAllSelected(subServicesForSelectedParent)}
                                                                                onCheckedChange={(checked) => toggleAllInGroup(subServicesForSelectedParent, checked as boolean)}
                                                                            />
                                                                        </div>
                                                                    </div>

                                                                    {/* List of Sub-Services */}
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                        {subServicesForSelectedParent.map((service: any) => {
                                                                            const isChecked = field.value?.includes(service.id) || false;
                                                                            return (
                                                                                <div
                                                                                    key={service.id}
                                                                                    className={`
                                                                                        flex items-start gap-3 p-3 border rounded-xl transition-all cursor-pointer min-h-[88px]
                                                                                        ${isChecked ? 'bg-[#423120]/5 border-[#423120]/20' : 'bg-card border-border hover:border-[#423120]/30'}
                                                                                    `}
                                                                                    onClick={(e) => {
                                                                                        e.preventDefault();
                                                                                        toggleService(service.id, field.value || []);
                                                                                    }}
                                                                                >
                                                                                    <div
                                                                                        className={`
                                                                                            mr-3 h-5 w-5 rounded-sm border flex items-center justify-center transition-colors flex-shrink-0 mt-0.5
                                                                                            ${isChecked ? 'bg-[#423120] border-[#423120]' : 'border-neutral-400 bg-transparent'}
                                                                                        `}
                                                                                    >
                                                                                        {isChecked && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
                                                                                    </div>
                                                                                    <div className="flex-1 select-none">
                                                                                        <h4 className={`text-base font-semibold ${isChecked ? 'text-[#423120]' : 'text-foreground'}`}>
                                                                                            {service.name}
                                                                                        </h4>
                                                                                        {service.description && (
                                                                                            <p className="text-xs text-muted-foreground line-clamp-3">
                                                                                                {service.description}
                                                                                            </p>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            ) : parentServicesInCategory.length > 0 ? (
                                                                /* Parent services view */
                                                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                                    {/* Category Header with total count */}
                                                                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50">
                                                                        <div>
                                                                            <h3 className="font-semibold text-lg">{effectiveSelectedCategory}</h3>
                                                                            <p className="text-xs text-muted-foreground">
                                                                                {parentServicesInCategory.length} {parentServicesInCategory.length === 1 ? 'palvelu' : 'palvelua'}
                                                                            </p>
                                                                        </div>
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-sm text-muted-foreground">Valitse Kaikki</span>
                                                                            <Checkbox
                                                                                checked={isGroupAllSelected(displayServices)}
                                                                                onCheckedChange={(checked) => toggleAllInGroup(displayServices, checked as boolean)}
                                                                            />
                                                                        </div>
                                                                    </div>

                                                                    {/* List of Parent Services as clickable boxes */}
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                        {parentServicesInCategory.map(({ parent, subServices }) => {
                                                                            // Count how many sub-services in this parent are selected
                                                                            const selectedCount = subServices.filter((s: any) => field.value?.includes(s.id)).length;
                                                                            const allSelected = selectedCount === subServices.length;
                                                                            const someSelected = selectedCount > 0 && !allSelected;

                                                                            return (
                                                                                <div
                                                                                    key={parent.id}
                                                                                    className={`
                                                                                        flex items-center justify-between p-4 border rounded-xl transition-all cursor-pointer
                                                                                        ${allSelected ? 'bg-[#423120]/10 border-[#423120]/30' : someSelected ? 'bg-[#423120]/5 border-[#423120]/20' : 'bg-card border-border hover:border-[#423120]/30'}
                                                                                    `}
                                                                                    onClick={() => setSelectedParentServiceId(parent.id)}
                                                                                >
                                                                                    <div className="flex-1">
                                                                                        <h4 className={`text-base font-semibold ${allSelected || someSelected ? 'text-[#423120]' : 'text-foreground'}`}>
                                                                                            {parent.name}
                                                                                        </h4>
                                                                                        <p className="text-xs text-muted-foreground">
                                                                                            {selectedCount > 0 ? `${selectedCount}/${subServices.length} valittu` : `${subServices.length} palvelua`}
                                                                                        </p>
                                                                                    </div>
                                                                                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                /* Fallback: show services directly if no parent services */
                                                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                                    {/* Category Header (Select All) for Mobile/Desktop */}
                                                                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50">
                                                                        <div>
                                                                            <h3 className="font-semibold text-lg">{effectiveSelectedCategory}</h3>
                                                                            <p className="text-xs text-muted-foreground">
                                                                                {displayServices.length} {displayServices.length === 1 ? 'palvelu' : 'palvelua'}
                                                                            </p>
                                                                        </div>
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-sm text-muted-foreground">Valitse Kaikki</span>
                                                                            <Checkbox
                                                                                checked={isGroupAllSelected(displayServices)}
                                                                                onCheckedChange={(checked) => toggleAllInGroup(displayServices, checked as boolean)}
                                                                            />
                                                                        </div>
                                                                    </div>

                                                                    {/* List of Services */}
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                        {displayServices.map((service: any) => {
                                                                            const isChecked = field.value?.includes(service.id) || false;
                                                                            return (
                                                                                <div
                                                                                    key={service.id}
                                                                                    className={`
                                                                                        flex items-start gap-3 p-3 border rounded-xl transition-all cursor-pointer min-h-[88px]
                                                                                        ${isChecked ? 'bg-[#423120]/5 border-[#423120]/20' : 'bg-card border-border hover:border-[#423120]/30'}
                                                                                    `}
                                                                                    onClick={(e) => {
                                                                                        e.preventDefault(); // Prevent default to avoid double toggles
                                                                                        toggleService(service.id, field.value || []);
                                                                                    }}
                                                                                >
                                                                                    <div
                                                                                        className={`
                                                                                            mr-3 h-5 w-5 rounded-sm border flex items-center justify-center transition-colors flex-shrink-0 mt-0.5
                                                                                            ${isChecked ? 'bg-[#423120] border-[#423120]' : 'border-neutral-400 bg-transparent'}
                                                                                        `}
                                                                                    >
                                                                                        {isChecked && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
                                                                                    </div>
                                                                                    <div className="flex-1 select-none">
                                                                                        <h4 className={`text-base font-semibold ${isChecked ? 'text-[#423120]' : 'text-foreground'}`}>
                                                                                            {service.name}
                                                                                        </h4>
                                                                                        {service.parentService?.name && (
                                                                                            <p className="text-xs text-muted-foreground mb-1">{service.parentService.name}</p>
                                                                                        )}
                                                                                        {service.description && (
                                                                                            <p className="text-xs text-muted-foreground line-clamp-3">
                                                                                                {service.description}
                                                                                            </p>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
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
                                    Takaisin
                                </Button>
                            )}
                            <Button
                                disabled={loading || !isStepValid()}
                                type={currentStep === 5 ? "submit" : "button"}
                                onClick={currentStep === 5 ? () => setCanSubmit(true) : nextStep}
                            >
                                {currentStep === 5 ? action : "Seuraavaksi"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </div>

            {/* Mobile Sticky Bottom Button - Fixed positioning */}
            <div
                className="md:hidden fixed left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-t border-gray-200 p-4 shadow-lg flex gap-3 transition-all duration-200"
                style={{ bottom: keyboardHeight > 0 ? `${keyboardHeight}px` : '0px' }}
            >
                {currentStep > 1 && (
                    <Button
                        disabled={loading}
                        variant="outline"
                        type="button"
                        onClick={prevStep}
                        className="flex-1"
                    >
                        Edellinen
                    </Button>
                )}
                <Button
                    disabled={loading || !isStepValid()}
                    className="flex-1"
                    type={currentStep === 5 ? "submit" : "button"}
                    form={currentStep === 5 ? "saloon-form" : undefined}
                    onClick={currentStep === 5 ? () => setCanSubmit(true) : nextStep}
                >
                    {currentStep === 5 ? action : "Jatkaa"}
                </Button>
            </div>
        </div >
    );
};
