"use client";

import { useState, useEffect } from "react";
import axios from "@/lib/axios";
import { ChevronLeft, Building2, Calendar, MapPin, User, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import toast from "react-hot-toast";

interface Saloon {
    id: string;
    name: string;
    address: string | null;
    createdAt: string;
    user: {
        name: string | null;
        email: string;
    };
    _count: {
        images: number;
        bookings: number;
        reviews: number;
    };
}

interface AdminSaloonsListClientProps {
    onBack: () => void;
}

export const AdminSaloonsListClient = ({ onBack }: AdminSaloonsListClientProps) => {
    const [saloons, setSaloons] = useState<Saloon[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        fetchSaloons();
    }, []);

    const fetchSaloons = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/admin/saloons');
            setSaloons(response.data);
        } catch (error) {
            console.error('Error fetching saloons:', error);
            toast.error("Failed to fetch saloons");
        } finally {
            setLoading(false);
        }
    };

    const filteredSaloons = saloons.filter(saloon =>
        saloon.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (saloon.user?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('fi-FI', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-muted-foreground">Loading saloons...</div>
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
                    <h3 className="text-lg font-semibold">All Saloons</h3>
                    <p className="text-xs text-muted-foreground">
                        Total: <span className="font-bold text-foreground">{saloons.length}</span>
                    </p>
                </div>
            </div>

            {/* Search */}
            <Input
                placeholder="Search saloons..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-md"
            />

            {/* Saloons List */}
            <div className="space-y-3">
                {filteredSaloons.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-8">
                            <Building2 className="h-8 w-8 text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">No saloons found</p>
                        </CardContent>
                    </Card>
                ) : (
                    filteredSaloons.map((saloon) => (
                        <div key={saloon.id} className="p-3 border rounded-lg bg-card hover:bg-muted/30 transition-colors">
                            <div className="flex justify-between items-start gap-2">
                                <div className="min-w-0 flex-1 space-y-1">
                                    <h4 className="text-sm font-semibold truncate flex items-center gap-2">
                                        {saloon.name}
                                    </h4>



                                    {saloon.address && (
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <MapPin className="h-3 w-3 flex-shrink-0" />
                                            <span className="truncate">{saloon.address}</span>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Calendar className="h-3 w-3 flex-shrink-0" />
                                        <span>Created {formatDate(saloon.createdAt)}</span>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground flex-shrink-0">
                                    <div className="px-2 py-0.5 bg-muted rounded-full">
                                        {saloon._count.bookings} bookings
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <ImageIcon className="h-3 w-3" />
                                        {saloon._count.images}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
