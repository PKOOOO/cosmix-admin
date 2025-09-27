// app/(dashboard)/bookings/[bookingId]/components/booking-details.tsx
"use client";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, User, Mail, Phone, DollarSign, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { AlertModal } from "@/components/modals/alert-modal";

interface BookingDetailsProps {
    booking: {
        id: string;
        bookingTime: Date;
        status: string;
        customerName: string | null;
        customerPhone: string | null;
        customerEmail: string | null;
        notes: string | null;
        totalAmount: number | null;
        createdAt: Date;
        service: {
            name: string;
            category: {
                name: string;
            };
        };
        user: {
            name: string | null;
            email: string;
        };
        saloon: {
            name: string;
            address: string | null;
        };
    };
}

export const BookingDetails: React.FC<BookingDetailsProps> = ({ booking }) => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

    const onStatusChange = async (newStatus: string) => {
        try {
            setLoading(true);
            await axios.patch(`/api/bookings/${booking.id}`, {
                status: newStatus
            });
            
            toast.success(`Booking ${newStatus} successfully.`, {
                style: {
                    borderRadius: "10px",
                    background: "#333",
                    color: "#fff",
                },
            });
            router.refresh();
        } catch (error) {
            toast.error("Failed to update booking status. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const onDelete = async () => {
        try {
            setLoading(true);
            await axios.delete(`/api/bookings/${booking.id}`);
            
            toast.success("Booking deleted successfully.", {
                style: {
                    borderRadius: "10px",
                    background: "#333",
                    color: "#fff",
                },
            });
            setOpen(false);
            setTimeout(() => {
                router.push('/dashboard/bookings');
            }, 200);
        } catch (error) {
            toast.error("Failed to delete booking. Please try again.");
            setOpen(false);
        } finally {
            setLoading(false);
        }
    };

    const getStatusVariant = (status: string) => {
        switch (status) {
            case "confirmed":
                return "default";
            case "pending":
                return "secondary";
            case "cancelled":
                return "destructive";
            default:
                return "outline";
        }
    };

    return (
        <div className="space-y-6">
            <AlertModal
                isOpen={open}
                onClose={() => setOpen(false)}
                onConfirm={onDelete}
                loading={loading}
            />

            {/* Header */}
            <div className="flex items-center justify-between">
                <Heading title="Booking Details" />
                <div className="flex space-x-2">
                    {booking.status === "pending" && (
                        <Button onClick={() => onStatusChange("confirmed")} disabled={loading}>
                            Confirm Booking
                        </Button>
                    )}
                    {booking.status === "confirmed" && (
                        <Button 
                            variant="destructive" 
                            onClick={() => onStatusChange("cancelled")} 
                            disabled={loading}
                        >
                            Cancel Booking
                        </Button>
                    )}
                    <Button 
                        variant="destructive" 
                        onClick={() => setOpen(true)} 
                        disabled={loading}
                    >
                        Delete
                    </Button>
                </div>
            </div>

            <Separator />

            <div className="grid gap-6 md:grid-cols-2">
                {/* Booking Information */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <Calendar className="h-5 w-5" />
                            <span>Booking Information</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Status:</span>
                            <Badge variant={getStatusVariant(booking.status)}>
                                {booking.status}
                            </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Booking Time:</span>
                            <span className="text-sm">
                                {new Date(booking.bookingTime).toLocaleString()}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Created:</span>
                            <span className="text-sm">
                                {new Date(booking.createdAt).toLocaleDateString()}
                            </span>
                        </div>
                        {booking.totalAmount && (
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Total Amount:</span>
                                <span className="text-sm font-semibold">
                                    ${booking.totalAmount}
                                </span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Service Information */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <FileText className="h-5 w-5" />
                            <span>Service Information</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Service:</span>
                            <span className="text-sm">{booking.service.name}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Category:</span>
                            <span className="text-sm">{booking.service.category.name}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Saloon:</span>
                            <span className="text-sm">{booking.saloon.name}</span>
                        </div>
                        {booking.saloon.address && (
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Address:</span>
                                <span className="text-sm">{booking.saloon.address}</span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Customer Information */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <User className="h-5 w-5" />
                            <span>Customer Information</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Name:</span>
                            <span className="text-sm">
                                {booking.customerName || booking.user.name || "Not provided"}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Email:</span>
                            <span className="text-sm">
                                {booking.customerEmail || booking.user.email}
                            </span>
                        </div>
                        {booking.customerPhone && (
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Phone:</span>
                                <span className="text-sm">{booking.customerPhone}</span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Notes */}
                {booking.notes && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                                <FileText className="h-5 w-5" />
                                <span>Notes</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                {booking.notes}
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
};
