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
            durationMinutes: 30,
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
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button
                    variant="outline"
                    onClick={() => router.push(`/${storeId}/saloons`)}
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Saloons
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Service Pricing for {saloonName}</CardTitle>
                    <CardDescription>
                        Set prices and availability for sub-services at this saloon.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            {/* Current Services */}
                            <div className="space-y-4">
                                {form.watch("servicePricing").map((_, index) => {
                                    const serviceId = form.watch(`servicePricing.${index}.serviceId`);
                                    const serviceInfo = getServiceInfo(serviceId);
                                    
                                    if (!serviceInfo) return null;

                                    return (
                                        <Card key={serviceId} className="relative">
                                            <CardHeader className="pb-3">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <CardTitle className="text-lg">
                                                            {serviceInfo.serviceName}
                                                        </CardTitle>
                                                        <div className="flex gap-2 mt-1">
                                                            <Badge variant="secondary">
                                                                {serviceInfo.categoryName}
                                                            </Badge>
                                                            <Badge variant="outline">
                                                                {serviceInfo.parentServiceName}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="destructive"
                                                        size="icon"
                                                        onClick={() => removeService(index)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <FormField
                                                    control={form.control}
                                                    name={`servicePricing.${index}.price`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Price ($)</FormLabel>
                                                            <FormControl>
                                                                <Input
                                                                    type="number"
                                                                    step="0.01"
                                                                    placeholder="0.00"
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
                                                            <FormLabel>Duration (Minutes)</FormLabel>
                                                            <FormControl>
                                                                <Input
                                                                    type="number"
                                                                    placeholder="30"
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
                                                        <FormItem className="flex flex-col justify-end">
                                                            <FormLabel>Availability</FormLabel>
                                                            <div className="flex items-center space-x-2">
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
                                            </CardContent>
                                            
                                            {/* Available Days Section */}
                                            <div className="border-t pt-4">
                                                <div className="flex items-center gap-2 mb-4">
                                                    <Calendar className="h-4 w-4" />
                                                    <h4 className="font-medium">Available Days</h4>
                                                </div>
                                                
                                                <div className="grid grid-cols-7 gap-2">
                                                    {[0,1,2,3,4,5,6].map(day => {
                                                        const isSelected = form.watch(`servicePricing.${index}.availableDays`)?.includes(day) || false;
                                                        return (
                                                            <Button
                                                                key={day}
                                                                type="button"
                                                                variant={isSelected ? "default" : "outline"}
                                                                size="sm"
                                                                onClick={() => toggleDay(index, day)}
                                                                className="h-10"
                                                            >
                                                                {getDayName(day).slice(0, 3)}
                                                            </Button>
                                                        );
                                                    })}
                                                </div>
                                                
                                                <div className="mt-3 p-3 bg-muted rounded-lg">
                                                    <p className="text-sm text-muted-foreground">
                                                        <strong>Time Range:</strong> 7:00 AM - 9:00 PM (30-minute intervals)
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        Users can book appointments in 30-minute slots during the selected days.
                                                    </p>
                                                </div>
                                            </div>
                                        </Card>
                                    );
                                })}
                            </div>

                            {/* Add New Service */}
                            {availableToAdd.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Add New Service</CardTitle>
                                        <CardDescription>
                                            Select a sub-service to add pricing for this saloon.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <Select onValueChange={(value) => addService(value)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a service to add..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableToAdd.map((service) => (
                                                    <SelectItem key={service.id} value={service.id}>
                                                        <div className="flex items-center gap-2">
                                                            <span>{service.name}</span>
                                                            <Badge variant="secondary" className="text-xs">
                                                                {service.categoryName}
                                                            </Badge>
                                                            <Badge variant="outline" className="text-xs">
                                                                {service.parentServiceName}
                                                            </Badge>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Submit Button */}
                            <div className="flex gap-4">
                                <Button type="submit" disabled={loading}>
                                    <Save className="h-4 w-4 mr-2" />
                                    Save Pricing
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
};