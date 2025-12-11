// app/dashboard/saloons/[saloonId]/pricing/components/pricing-client.tsx
"use client";
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, Clock, DollarSign, Calendar, Settings, Users, Star, MapPin, Phone, Mail } from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";
import { useRouter } from "next/navigation";

interface Service {
    id: string;
    name: string;
    description?: string;
    category: {
        id: string;
        name: string;
    };
}

interface SaloonService {
    serviceId: string;
    price: number;
    durationMinutes: number;
    isAvailable: boolean;
    availableDays: number[];
    service: Service;
}

interface Saloon {
    id: string;
    name: string;
    saloonServices: SaloonService[];
}

interface PricingClientProps {
    saloon: Saloon;
    availableServices: Service[];
}

export const PricingClient: React.FC<PricingClientProps> = ({
    saloon,
    availableServices
}) => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [editingService, setEditingService] = useState<string | null>(null);
    const [updatingServices, setUpdatingServices] = useState<Set<string>>(new Set());

    const [saloonSettings, setSaloonSettings] = useState({
        operatingHours: {
            monday: { open: "09:00", close: "20:00", isOpen: true },
            tuesday: { open: "09:00", close: "20:00", isOpen: true },
            wednesday: { open: "09:00", close: "20:00", isOpen: true },
            thursday: { open: "09:00", close: "20:00", isOpen: true },
            friday: { open: "09:00", close: "20:00", isOpen: true },
            saturday: { open: "10:00", close: "18:00", isOpen: true },
            sunday: { open: "10:00", close: "18:00", isOpen: false }
        },
        breakTime: 15, // minutes between appointments
        maxBookingsPerSlot: 1
    });

    const [timeSlots, setTimeSlots] = useState<any[]>([]);
    const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);

    // Load time slots from database
    const loadTimeSlots = async () => {
        try {
            setLoadingTimeSlots(true);
            const response = await axios.get(`/api/saloons/${saloon.id}/time-slots`);
            const slots = response.data;

            // Convert database format to UI format
            const operatingHours: any = {};
            const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

            days.forEach((day, index) => {
                const slot = slots.find((s: any) => s.dayOfWeek === index);
                if (slot) {
                    operatingHours[day] = {
                        open: slot.startTime,
                        close: slot.endTime,
                        isOpen: slot.isOpen
                    };
                } else {
                    operatingHours[day] = {
                        open: "09:00",
                        close: "20:00",
                        isOpen: index === 0 ? false : true // Sunday closed by default
                    };
                }
            });

            setSaloonSettings(prev => ({
                ...prev,
                operatingHours,
                breakTime: slots[0]?.breakTimeMinutes || 15,
                maxBookingsPerSlot: slots[0]?.maxBookingsPerSlot || 1
            }));

            setTimeSlots(slots);
        } catch (error) {
            console.error('Failed to load time slots:', error);
        } finally {
            setLoadingTimeSlots(false);
        }
    };

    // Save time slots to database
    const saveTimeSlots = async () => {
        try {
            setLoadingTimeSlots(true);

            const timeSlotsToSave = Object.entries(saloonSettings.operatingHours).map(([day, hours], index) => ({
                dayOfWeek: index,
                startTime: hours.open,
                endTime: hours.close,
                isOpen: hours.isOpen,
                slotDurationMinutes: 60, // 1 hour
                breakTimeMinutes: saloonSettings.breakTime,
                maxBookingsPerSlot: saloonSettings.maxBookingsPerSlot
            }));

            await axios.post(`/api/saloons/${saloon.id}/time-slots`, {
                timeSlots: timeSlotsToSave
            });

            toast.success("Time slots saved successfully");
            await loadTimeSlots(); // Reload to get updated data
        } catch (error) {
            console.error('Failed to save time slots:', error);
            toast.error("Failed to save time slots");
        } finally {
            setLoadingTimeSlots(false);
        }
    };

    // Load time slots on component mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
    React.useEffect(() => {
        loadTimeSlots();
    }, []);

    const handleUpdateService = async (serviceId: string, updates: Partial<SaloonService>) => {
        try {
            setUpdatingServices(prev => new Set(prev).add(serviceId));
            await axios.patch(`/api/saloons/${saloon.id}/services/${serviceId}`, updates);

            router.refresh();
        } catch (error) {
            toast.error("Failed to update service");
        } finally {
            setUpdatingServices(prev => {
                const newSet = new Set(prev);
                newSet.delete(serviceId);
                return newSet;
            });
        }
    };

    const handleDeleteService = async (serviceId: string) => {
        if (!confirm("Are you sure you want to remove this service from the saloon?")) {
            return;
        }

        try {
            setLoading(true);
            await axios.delete(`/api/saloons/${saloon.id}/services/${serviceId}`);
            toast.success("Service removed successfully");
            router.refresh();
        } catch (error) {
            toast.error("Failed to remove service");
        } finally {
            setLoading(false);
        }
    };


    const formatDuration = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0) {
            return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
        }
        return `${mins}m`;
    };

    const getDayName = (day: number) => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return days[day];
    };

    const generateTimeSlots = (startTime: string, endTime: string, duration: number) => {
        const slots = [];
        const start = new Date(`2000-01-01T${startTime}`);
        const end = new Date(`2000-01-01T${endTime}`);

        while (start < end) {
            slots.push(start.toTimeString().slice(0, 5));
            start.setMinutes(start.getMinutes() + duration);
        }
        return slots;
    };

    const getServiceStats = () => {
        const totalServices = saloon.saloonServices.length;
        const availableServices = saloon.saloonServices.filter(s => s.isAvailable).length;
        const totalRevenue = saloon.saloonServices.reduce((sum, s) => sum + s.price, 0);
        return { totalServices, availableServices, totalRevenue };
    };

    const stats = getServiceStats();

    return (
        <div className="space-y-6">
            {/* Header with Stats */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <Heading
                        title={`${saloon.name} - Pricing`}

                    />
                </div>

            </div>

            {/* Main Content with Tabs */}
            <Tabs defaultValue="services" className="space-y-6">


                {/* Services & Pricing Tab */}
                <TabsContent value="services" className="space-y-6">


                    {/* Current Services */}
                    <div className="space-y-4">

                        {saloon.saloonServices.length === 0 ? (
                            <Card>
                                <CardContent className="py-12 text-center">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                                            <Settings className="h-8 w-8 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold">No services added yet</h4>
                                            <p className="text-sm text-muted-foreground">Add your first service above to get started</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid gap-4">
                                {saloon.saloonServices.map((saloonService) => (
                                    <Card key={saloonService.serviceId} className="hover:shadow-md transition-shadow">
                                        <CardContent className="p-4 lg:p-6">
                                            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                                                <div className="space-y-3 flex-1">
                                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                                                        <h4 className="font-semibold text-base lg:text-lg">{saloonService.service.name}</h4>
                                                        <div className="flex flex-wrap gap-2">
                                                            <Badge variant="secondary" className="text-xs">{saloonService.service.category.name}</Badge>

                                                        </div>
                                                    </div>

                                                    {saloonService.service.description && (
                                                        <p className="text-sm text-muted-foreground">
                                                            {saloonService.service.description}
                                                        </p>
                                                    )}

                                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4">
                                                        <div className="flex items-center gap-2 p-2 lg:p-3 bg-brand-cream rounded-lg">
                                                            <div>
                                                                <div className="font-semibold text-brand-dark text-sm lg:text-base">${saloonService.price}</div>
                                                                <div className="text-xs text-muted-foreground">Price</div>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2 p-2 lg:p-3 bg-brand-cream rounded-lg">
                                                            <div>
                                                                <div className="font-semibold text-brand-dark text-sm lg:text-base">0</div>
                                                                <div className="text-xs text-muted-foreground">Bookings</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 lg:ml-4">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setEditingService(
                                                            editingService === saloonService.serviceId ? null : saloonService.serviceId
                                                        )}
                                                        className="flex-1 lg:flex-none"
                                                    >
                                                        <Edit className="h-3 w-3 lg:h-4 lg:w-4 mr-1 lg:mr-0" />
                                                        <span className="lg:hidden text-xs">Edit</span>
                                                    </Button>
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => handleDeleteService(saloonService.serviceId)}
                                                        disabled={loading}
                                                        className="flex-1 lg:flex-none"
                                                    >
                                                        <Trash2 className="h-3 w-3 lg:h-4 lg:w-4 mr-1 lg:mr-0" />
                                                        <span className="lg:hidden text-xs">Delete</span>
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Edit Form */}
                                            {editingService === saloonService.serviceId && (
                                                <div className="mt-4 lg:mt-6 pt-4 lg:pt-6 border-t space-y-4">
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                        <div>
                                                            <Label htmlFor={`price-${saloonService.serviceId}`}>
                                                                Price ($)
                                                                {updatingServices.has(saloonService.serviceId) && (
                                                                    <span className="text-xs text-brand-dark ml-2">Saving...</span>
                                                                )}
                                                            </Label>
                                                            <Input
                                                                id={`price-${saloonService.serviceId}`}
                                                                type="number"
                                                                step="0.01"
                                                                min="0"
                                                                defaultValue={saloonService.price}
                                                                disabled={updatingServices.has(saloonService.serviceId)}
                                                                onBlur={(e) => {
                                                                    const newPrice = parseFloat(e.target.value) || 0;
                                                                    if (newPrice !== saloonService.price) {
                                                                        handleUpdateService(saloonService.serviceId, { price: newPrice });
                                                                    }
                                                                }}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        const newPrice = parseFloat(e.currentTarget.value) || 0;
                                                                        if (newPrice !== saloonService.price) {
                                                                            handleUpdateService(saloonService.serviceId, { price: newPrice });
                                                                        }
                                                                        e.currentTarget.blur();
                                                                    }
                                                                }}
                                                            />
                                                        </div>

                                                    </div>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                </TabsContent>

                {/* Time Slots Tab */}
                <TabsContent value="scheduling" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Calendar className="h-5 w-5" />
                                Time Slot Management
                            </CardTitle>
                            <CardDescription>
                                Configure available time slots for your services
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Operating Hours Section */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold">Operating Hours</h3>
                                <div className="space-y-3">
                                    {Object.entries(saloonSettings.operatingHours).map(([day, hours]) => (
                                        <div key={day} className="flex flex-col gap-3 p-3 border rounded-lg">
                                            <div className="flex items-center justify-between">
                                                <div className="text-sm font-medium capitalize">
                                                    {day}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Switch
                                                        checked={hours.isOpen}
                                                        onCheckedChange={(checked) => {
                                                            setSaloonSettings(prev => ({
                                                                ...prev,
                                                                operatingHours: {
                                                                    ...prev.operatingHours,
                                                                    [day]: { ...hours, isOpen: checked }
                                                                }
                                                            }));
                                                        }}
                                                    />
                                                    <span className="text-xs text-muted-foreground">
                                                        {hours.isOpen ? 'Open' : 'Closed'}
                                                    </span>
                                                </div>
                                            </div>
                                            {hours.isOpen && (
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <Input
                                                        type="time"
                                                        value={hours.open}
                                                        onChange={(e) => {
                                                            setSaloonSettings(prev => ({
                                                                ...prev,
                                                                operatingHours: {
                                                                    ...prev.operatingHours,
                                                                    [day]: { ...hours, open: e.target.value }
                                                                }
                                                            }));
                                                        }}
                                                        className="w-20 text-xs [&::-webkit-calendar-picker-indicator]:hidden"
                                                    />
                                                    <span className="text-xs text-muted-foreground">to</span>
                                                    <Input
                                                        type="time"
                                                        value={hours.close}
                                                        onChange={(e) => {
                                                            setSaloonSettings(prev => ({
                                                                ...prev,
                                                                operatingHours: {
                                                                    ...prev.operatingHours,
                                                                    [day]: { ...hours, close: e.target.value }
                                                                }
                                                            }));
                                                        }}
                                                        className="w-20 text-xs [&::-webkit-calendar-picker-indicator]:hidden"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Settings Section */}
                            <div className="space-y-4">
                                <h3 className="text-base lg:text-lg font-semibold">Scheduling Settings</h3>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="breakTime" className="text-sm">Break Time Between Appointments</Label>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                id="breakTime"
                                                type="number"
                                                min="0"
                                                max="60"
                                                value={saloonSettings.breakTime}
                                                onChange={(e) => setSaloonSettings(prev => ({ ...prev, breakTime: parseInt(e.target.value) || 0 }))}
                                                className="w-16 text-sm"
                                            />
                                            <span className="text-xs text-muted-foreground">minutes</span>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="maxBookings" className="text-sm">Max Bookings Per Time Slot</Label>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                id="maxBookings"
                                                type="number"
                                                min="1"
                                                max="10"
                                                value={saloonSettings.maxBookingsPerSlot}
                                                onChange={(e) => setSaloonSettings(prev => ({ ...prev, maxBookingsPerSlot: parseInt(e.target.value) || 1 }))}
                                                className="w-16 text-sm"
                                            />
                                            <span className="text-xs text-muted-foreground">bookings</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Save Button */}
                            <div className="flex justify-center sm:justify-end pt-4 border-t">
                                <Button
                                    onClick={saveTimeSlots}
                                    disabled={loadingTimeSlots}
                                    className="w-full sm:w-auto min-w-[120px]"
                                >
                                    {loadingTimeSlots ? "Saving..." : "Save Settings"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>


                {/* Saloon Settings Tab */}
                <TabsContent value="settings" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Saloon Settings
                            </CardTitle>
                            <CardDescription>
                                Configure general settings for your saloon
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div>
                                    <Label className="text-sm">Saloon Information</Label>
                                    <div className="space-y-3 mt-2">
                                        <div className="flex items-center gap-2">
                                            <MapPin className="h-3 w-3 lg:h-4 lg:w-4" />
                                            <span className="text-xs lg:text-sm">Address: Not set</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Phone className="h-3 w-3 lg:h-4 lg:w-4" />
                                            <span className="text-xs lg:text-sm">Phone: Not set</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Mail className="h-3 w-3 lg:h-4 lg:w-4" />
                                            <span className="text-xs lg:text-sm">Email: Not set</span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <Label className="text-sm">Booking Settings</Label>
                                    <div className="space-y-3 mt-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs lg:text-sm">Allow online booking</span>
                                            <Switch defaultChecked />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs lg:text-sm">Require advance booking</span>
                                            <Switch />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs lg:text-sm">Send booking confirmations</span>
                                            <Switch defaultChecked />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};
