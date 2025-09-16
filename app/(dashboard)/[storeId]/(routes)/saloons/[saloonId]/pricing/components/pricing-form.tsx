// app/(dashboard)/[storeId]/(routes)/saloons/[saloonId]/pricing/components/pricing-form.tsx
"use client";

import * as z from "zod";
import axios from "axios";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Trash2, Plus, Save, ArrowLeft, Clock, Calendar } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

// Schema for individual service pricing
const servicePricingSchema = z.object({
    serviceId: z.string(),
    price: z.coerce.number().min(0, "Price must be positive"),
    durationMinutes: z.coerce.number().min(1, "Duration must be at least 1 minute"),
    isAvailable: z.boolean(),
    availableDays: z.array(z.number().min(0).max(6)).optional(), // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
});

// Schema for the entire form
const pricingFormSchema = z.object({
    servicePricing: z.array(servicePricingSchema),
});

type PricingFormValues = z.infer<typeof pricingFormSchema>;

interface CurrentPricing {
    serviceId: string;
    serviceName: string;
    categoryName: string;
    parentServiceName: string;
    price: number;
    durationMinutes: number;
    isAvailable: boolean;
    availableDays?: number[];
}

interface AvailableService {
    id: string;
    name: string;
    categoryName: string;
    parentServiceName: string;
}

interface PricingFormProps {
    saloonId: string;
    storeId: string;
    saloonName: string;
    currentPricing: CurrentPricing[];
    availableSubServices: AvailableService[];
}

export const PricingForm: React.FC<PricingFormProps> = ({
    saloonId,
    storeId,
    saloonName,
    currentPricing,
    availableSubServices,
}) => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const form = useForm<PricingFormValues>({
        resolver: zodResolver(pricingFormSchema),
        defaultValues: {
            servicePricing: currentPricing.map(pricing => ({
                serviceId: pricing.serviceId,
                price: pricing.price,
                durationMinutes: pricing.durationMinutes,
                isAvailable: pricing.isAvailable,
                availableDays: pricing.availableDays || [],
            })),
        },
    });

    const addService = (serviceId: string) => {
        const currentServices = form.getValues("servicePricing");
        const newService = {
            serviceId,
            price: 0,
            durationMinutes: 90,
            isAvailable: true,
            availableDays: [],
        };
        form.setValue("servicePricing", [...currentServices, newService]);
    };

    const removeService = (index: number) => {
        const currentServices = form.getValues("servicePricing");
        const updatedServices = currentServices.filter((_, i) => i !== index);
        form.setValue("servicePricing", updatedServices);
    };

    const toggleDay = (serviceIndex: number, dayOfWeek: number) => {
        const currentServices = form.getValues("servicePricing");
        const service = currentServices[serviceIndex];
        const currentDays = service.availableDays || [];
        
        const updatedDays = currentDays.includes(dayOfWeek)
            ? currentDays.filter(day => day !== dayOfWeek)
            : [...currentDays, dayOfWeek];
        
        const updatedService = {
            ...service,
            availableDays: updatedDays,
        };
        const updatedServices = [...currentServices];
        updatedServices[serviceIndex] = updatedService;
        form.setValue("servicePricing", updatedServices);
    };

    const onSubmit = async (data: PricingFormValues) => {
        try {
            setLoading(true);
            await axios.patch(`/api/${storeId}/saloons/${saloonId}/pricing`, data);
            router.refresh();
            router.push(`/${storeId}/saloons`);
            toast.success("Pricing updated successfully", {
                style: {
                    borderRadius: "10px",
                    background: "#333",
                    color: "#fff",
                },
            });
        } catch (error) {
            toast.error("Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    const getServiceInfo = (serviceId: string) => {
        const current = currentPricing.find(p => p.serviceId === serviceId);
        if (current) return current;
        
        const available = availableSubServices.find(s => s.id === serviceId);
        return available ? {
            serviceName: available.name,
            categoryName: available.categoryName,
            parentServiceName: available.parentServiceName,
        } : null;
    };

    const getDayName = (dayOfWeek: number) => {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[dayOfWeek];
    };

    const currentServiceIds = form.watch("servicePricing").map(sp => sp.serviceId);
    const availableToAdd = availableSubServices.filter(service => 
        !currentServiceIds.includes(service.id)
    );

    return (
        <div className="min-h-screen pb-20 md:pb-6">
            <div className=" sm:px-4 md:px-6 space-y-4 md:space-y-6 max-w-full">
                {/* Header */}
                <div className="flex items-center gap-2 md:gap-4 pt-4 md:pt-0">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/${storeId}/saloons`)}
                        className="shrink-0"
                    >
                        <ArrowLeft className="h-4 w-4 md:mr-2" />
                        <span className="hidden sm:inline">Back to Saloons</span>
                    </Button>
                </div>

                <Card className="w-full mx-1 sm:mx-0">
                    <CardHeader className="px-2 sm:px-4 md:px-6 py-4 md:py-6">
                        <CardTitle className="text-lg md:text-xl">
                            Service Pricing for {saloonName} Saloon
                        </CardTitle>
                        <CardDescription className="text-sm md:text-base">
                            Set prices and availability for sub-services at this saloon.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="px-2 sm:px-4 md:px-6">
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">
                                {/* Current Services */}
                                <div className="space-y-4">
                                    {form.watch("servicePricing").map((_, index) => {
                                        const serviceId = form.watch(`servicePricing.${index}.serviceId`);
                                        const serviceInfo = getServiceInfo(serviceId);
                                        
                                        if (!serviceInfo) return null;

                                        return (
                                            <Card key={serviceId} className="relative w-full">
                                                <CardHeader className="px-2 sm:px-4 md:px-6 pb-3">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex-1 min-w-0">
                                                            <CardTitle className="text-base md:text-lg truncate">
                                                                {serviceInfo.serviceName}
                                                            </CardTitle>
                                                            <div className="flex flex-wrap gap-1 md:gap-2 mt-2">
                                                                <Badge variant="secondary" className="text-xs">
                                                                    {serviceInfo.categoryName}
                                                                </Badge>
                                                                <Badge variant="outline" className="text-xs">
                                                                    {serviceInfo.parentServiceName}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            variant="destructive"
                                                            size="icon"
                                                            className="shrink-0 h-8 w-8 md:h-10 md:w-10"
                                                            onClick={() => removeService(index)}
                                                        >
                                                            <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                                                        </Button>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="px-2 sm:px-4 md:px-6 space-y-4">
                                                    {/* Price and Duration Fields */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                        <FormField
                                                            control={form.control}
                                                            name={`servicePricing.${index}.price`}
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel className="text-sm">Price ($)</FormLabel>
                                                                    <FormControl>
                                                                        <Input
                                                                            type="number"
                                                                            step="0.01"
                                                                            placeholder="0.00"
                                                                            className="text-sm"
                                                                            {...field}
                                                                        />
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                        <FormField
                                                            control={form.control}
                                                            name={`servicePricing.${index}.durationMinutes`}
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel className="text-sm">Duration (Minutes)</FormLabel>
                                                                    <FormControl>
                                                                        <Input
                                                                            type="number"
                                                                            placeholder="30"
                                                                            className="text-sm"
                                                                            {...field}
                                                                        />
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                        <FormField
                                                            control={form.control}
                                                            name={`servicePricing.${index}.isAvailable`}
                                                            render={({ field }) => (
                                                                <FormItem className="flex flex-col justify-end sm:col-span-2 lg:col-span-1">
                                                                    <FormLabel className="text-sm">Availability</FormLabel>
                                                                    <div className="flex items-center space-x-2 h-10">
                                                                        <FormControl>
                                                                            <Checkbox
                                                                                checked={field.value}
                                                                                onCheckedChange={field.onChange}
                                                                            />
                                                                        </FormControl>
                                                                        <span className="text-sm">Available</span>
                                                                    </div>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </div>
                                                    
                                                    {/* Available Days Section */}
                                                    <div className="border-t pt-4">
                                                        <div className="flex items-center gap-2 mb-4">
                                                            <Calendar className="h-4 w-4" />
                                                            <h4 className="font-medium text-sm md:text-base">Available Days</h4>
                                                        </div>
                                                        
                                                        <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
                                                            {[0,1,2,3,4,5,6].map(day => {
                                                                const isSelected = form.watch(`servicePricing.${index}.availableDays`)?.includes(day) || false;
                                                                return (
                                                                    <Button
                                                                        key={day}
                                                                        type="button"
                                                                        variant={isSelected ? "default" : "outline"}
                                                                        size="sm"
                                                                        onClick={() => toggleDay(index, day)}
                                                                        className="h-8 md:h-10 text-xs md:text-sm"
                                                                    >
                                                                        <span className="sm:hidden">
                                                                            {getDayName(day).slice(0, 2)}
                                                                        </span>
                                                                        <span className="hidden sm:inline">
                                                                            {getDayName(day).slice(0, 3)}
                                                                        </span>
                                                                    </Button>
                                                                );
                                                            })}
                                                        </div>
                                                        
                                                        <div className="mt-3 p-3 bg-muted rounded-lg">
                                                            <p className="text-xs md:text-sm text-muted-foreground">
                                                                <strong>Time Range:</strong> 7:00 AM - 9:00 PM (1.5-hour intervals)
                                                            </p>
                                                            <p className="text-xs text-muted-foreground mt-1">
                                                                Users can book appointments in 1.5-hour slots during the selected days.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>

                                {/* Add New Service */}
                                {availableToAdd.length > 0 && (
                                    <Card className="w-full">
                                        <CardHeader className="px-2 sm:px-4 md:px-6">
                                            <CardTitle className="text-base md:text-lg">Add New Service</CardTitle>
                                            <CardDescription className="text-sm md:text-base">
                                                Select a sub-service to add pricing for this saloon.
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="px-2 sm:px-4 md:px-6">
                                            <Select onValueChange={(value) => addService(value)}>
                                                <SelectTrigger className="text-sm">
                                                    <SelectValue placeholder="Select a service to add..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {availableToAdd.map((service) => (
                                                        <SelectItem key={service.id} value={service.id}>
                                                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                                                <span className="text-sm font-medium">{service.name}</span>
                                                                <div className="flex gap-1">
                                                                    <Badge variant="secondary" className="text-xs">
                                                                        {service.categoryName}
                                                                    </Badge>
                                                                    <Badge variant="outline" className="text-xs">
                                                                        {service.parentServiceName}
                                                                    </Badge>
                                                                </div>
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </CardContent>
                                    </Card>
                                )}
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </div>

            {/* Sticky Save Button */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t shadow-lg md:hidden">
                <Button 
                    type="submit" 
                    disabled={loading}
                    onClick={form.handleSubmit(onSubmit)}
                    className="w-full h-12 text-base font-medium"
                    size="lg"
                >
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? "Saving..." : "Save Pricing"}
                </Button>
            </div>

            {/* Desktop Save Button */}
            <div className="hidden md:block px-2 sm:px-4 md:px-6 pb-6">
                <Button 
                    type="submit" 
                    disabled={loading}
                    onClick={form.handleSubmit(onSubmit)}
                    className="h-12 px-8 text-base font-medium"
                    size="lg"
                >
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? "Saving..." : "Save Pricing"}
                </Button>
            </div>
        </div>
    );
};