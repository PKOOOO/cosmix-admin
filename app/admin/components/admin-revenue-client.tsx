"use client";

import { useState, useEffect } from "react";
import axios from "@/lib/axios";
import { ChevronRight, ChevronLeft, Euro, User, Calendar, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import toast from "react-hot-toast";

interface Booking {
    id: string;
    totalAmount: number | null;
    status: string;
    bookingTime: string;
    customerName: string | null;
    service: { name: string };
    user: { name: string | null; email: string };
}

interface SaloonRevenue {
    id: string;
    name: string;
    ownerName: string;
    ownerEmail: string;
    totalRevenue: number;
    bookingsCount: number;
    bookings: Booking[];
}

interface RevenueData {
    grandTotal: number;
    saloons: SaloonRevenue[];
}

interface AdminRevenueClientProps {
    onBack: () => void;
}

export const AdminRevenueClient = ({ onBack }: AdminRevenueClientProps) => {
    const [data, setData] = useState<RevenueData | null>(null);
    const [loading, setLoading] = useState(true);
    const [expandedSaloonId, setExpandedSaloonId] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/admin/revenue');
            setData(response.data);
        } catch (error) {
            console.error('Error fetching revenue data:', error);
            toast.error("Failed to fetch revenue data");
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('fi-FI', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return 'text-blue-600 bg-blue-50';
            case 'completed': return 'text-green-600 bg-green-50';
            case 'cancelled': return 'text-red-600 bg-red-50';
            case 'no_show': return 'text-orange-600 bg-orange-50';
            default: return 'text-gray-600 bg-gray-50';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-muted-foreground">Loading revenue data...</div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <div className="text-muted-foreground mb-4">Failed to load revenue data</div>
                <Button variant="outline" onClick={onBack}>
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={onBack} className="p-2">
                    <ChevronLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1">
                    <h3 className="text-lg font-semibold">Revenue Details</h3>
                    <p className="text-xs text-muted-foreground">
                        Total: <span className="font-bold text-foreground">€{data.grandTotal.toFixed(2)}</span>
                    </p>
                </div>
            </div>

            {/* Saloons List */}
            <div className="space-y-3">
                {data.saloons.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-8">
                            <Building2 className="h-8 w-8 text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">No saloons with bookings yet</p>
                        </CardContent>
                    </Card>
                ) : (
                    data.saloons.map((saloon) => {
                        const isExpanded = expandedSaloonId === saloon.id;

                        return (
                            <div key={saloon.id} className="space-y-2">
                                {/* Saloon Card */}
                                <div
                                    className={`
                    flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-all
                    ${isExpanded ? 'bg-[#423120]/5 border-[#423120]/30' : 'bg-card border-border hover:border-[#423120]/30'}
                  `}
                                    onClick={() => setExpandedSaloonId(isExpanded ? null : saloon.id)}
                                >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`} />
                                        <div className="min-w-0 flex-1">
                                            <h4 className="text-sm font-semibold truncate">{saloon.name}</h4>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {saloon.ownerName} • {saloon.bookingsCount} bookings
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0 ml-2">
                                        <div className="text-sm font-bold text-green-600">
                                            €{saloon.totalRevenue.toFixed(2)}
                                        </div>
                                    </div>
                                </div>

                                {/* Bookings List (Expandable) */}
                                {isExpanded && (
                                    <div className="ml-6 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                        {saloon.bookings.length === 0 ? (
                                            <div className="p-3 bg-muted/30 rounded-lg text-center">
                                                <p className="text-xs text-muted-foreground">No bookings yet</p>
                                            </div>
                                        ) : (
                                            saloon.bookings.map((booking) => (
                                                <div
                                                    key={booking.id}
                                                    className="flex items-center justify-between p-2.5 bg-muted/30 rounded-lg border border-border/50"
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        <h5 className="text-sm font-medium truncate">{booking.service.name}</h5>
                                                        <div className="flex flex-col gap-1 mt-1">
                                                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                                                <User className="h-3 w-3 flex-shrink-0" />
                                                                <span className="truncate">{booking.customerName || booking.user?.name || 'Guest'}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                                                <Calendar className="h-3 w-3 flex-shrink-0" />
                                                                <span>{formatDate(booking.bookingTime)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right flex-shrink-0 ml-2 flex flex-col items-end gap-1">
                                                        <div className="text-sm font-semibold">
                                                            €{(booking.totalAmount || 0).toFixed(2)}
                                                        </div>
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${getStatusColor(booking.status)}`}>
                                                            {booking.status.replace('_', ' ')}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
