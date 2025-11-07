// app/dashboard/saloons/components/client.tsx
"use client";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Plus, Edit, Trash, DollarSign, MapPin, Star, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { SaloonColumn } from "./columns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { AlertModal } from "@/components/modals/alert-modal";
import axios from "axios";
import toast from "react-hot-toast";

interface SaloonClientProps {
    data: SaloonColumn[]
}

export const SaloonClient: React.FC<SaloonClientProps> = ({
    data 
}) => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const onDelete = async () => {
        if (!deleteId) return;
        
        try {
            setLoading(true);
            const response = await axios.delete(`/api/saloons/${deleteId}`);
            
            if (!response.data.hasRemainingSaloons) {
                toast.success("Saloon deleted. Please create a new salon to continue.");
                setOpen(false);
                setTimeout(() => {
                    router.push('/dashboard/saloons/new');
                }, 200);
            } else {
                toast.success("Saloon deleted successfully.");
                setOpen(false);
                setTimeout(() => {
                    router.refresh();
                    router.push('/dashboard/saloons');
                }, 200);
            }
        } catch (error) {
            toast.error("Failed to delete saloon. Please try again.");
            setOpen(false);
        } finally {
            setLoading(false);
            setDeleteId(null);
        }
    };

    const handleDeleteClick = (id: string) => {
        setDeleteId(id);
        setOpen(true);
    };

    return (
        <div className="relative min-h-screen">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-6 md:mt-8 gap-4 mb-6">
                <Heading title={`Saloons (${data.length})`} />
                <Button onClick={() => router.push('/dashboard/saloons/new')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add New Saloon
                </Button>
            </div>
            
            {data.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <p className="text-muted-foreground mb-4">No saloons yet</p>
                        <Button onClick={() => router.push('/dashboard/saloons/new')}>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Your First Saloon
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <>
                    <div className="flex justify-center pb-24 md:pb-0">
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 w-full max-w-6xl">
                            {data.map((saloon) => (
                                <Card key={saloon.id} className="overflow-hidden flex flex-col">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-start gap-4 flex-1 min-w-0">
                                                {saloon.imageUrl && (
                                                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-lg overflow-hidden border">
                                                        <Image
                                                            src={saloon.imageUrl}
                                                            alt={saloon.name}
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <CardTitle className="text-lg sm:text-xl mb-1 truncate">
                                                        {saloon.name}
                                                    </CardTitle>
                                                    {saloon.shortIntro && (
                                                        <CardDescription className="line-clamp-2 text-sm">
                                                            {saloon.shortIntro}
                                                        </CardDescription>
                                                    )}
                                                    {saloon.address && (
                                                        <div className="flex items-center gap-1 mt-2 text-xs sm:text-sm text-muted-foreground">
                                                            <MapPin className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                                                            <span className="truncate">{saloon.address}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4 flex-1 flex flex-col">
                                        {/* Rating */}
                                        {(saloon.averageRating && saloon.averageRating > 0) && (
                                            <div className="flex items-center gap-2">
                                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                                <span className="text-sm font-medium">
                                                    {saloon.averageRating.toFixed(1)}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    ({saloon.ratingsCount} {saloon.ratingsCount === 1 ? 'review' : 'reviews'})
                                                </span>
                                            </div>
                                        )}

                                        {/* Sub-Services */}
                                        <div className="flex-1">
                                            <h4 className="text-sm font-semibold mb-3">
                                                Sub-Services ({saloon.subServices.length})
                                            </h4>
                                            {saloon.subServices.length === 0 ? (
                                                <p className="text-sm text-muted-foreground italic">
                                                    No sub-services configured
                                                </p>
                                            ) : (
                                                <div className="space-y-2 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-3 md:space-y-0">
                                                    {saloon.subServices.map((service, serviceIndex) => (
                                                        <div
                                                            key={`${service.name}-${serviceIndex}`}
                                                            className={`p-3 rounded-lg border ${
                                                                !service.isAvailable 
                                                                    ? 'bg-muted opacity-60' 
                                                                    : 'bg-background'
                                                            }`}
                                                        >
                                                            <div className="flex flex-col gap-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm font-medium truncate">
                                                                        {service.name}
                                                                    </span>
                                                                    {!service.isAvailable && (
                                                                        <Badge variant="secondary" className="text-xs flex-shrink-0">
                                                                            Unavailable
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                                    <span className="flex items-center gap-1">
                                                                        <DollarSign className="h-3 w-3" />
                                                                        {service.price.toFixed(2)}€
                                                                    </span>
                                                                    <span className="flex items-center gap-1">
                                                                        <Clock className="h-3 w-3" />
                                                                        {service.duration} min
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions - Desktop only */}
                                        <div className="hidden md:flex flex-wrap gap-2 pt-4 border-t">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => router.push(`/dashboard/saloons/${saloon.id}`)}
                                            >
                                                <Edit className="mr-2 h-4 w-4" />
                                                Edit
                                            </Button>
                                            {saloon.subServices.length > 0 && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => router.push(`/dashboard/saloons/${saloon.id}/pricing`)}
                                                >
                                                    <DollarSign className="mr-2 h-4 w-4" />
                                                    Pricing
                                                </Button>
                                            )}
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => handleDeleteClick(saloon.id)}
                                            >
                                                <Trash className="mr-2 h-4 w-4" />
                                                Delete
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>

                    {/* Mobile Sticky Buttons - Only for first saloon */}
                    {data.length > 0 && (
                        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 shadow-lg z-50 md:hidden">
                            <div className="flex gap-2 max-w-screen-sm mx-auto">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => router.push(`/dashboard/saloons/${data[0].id}`)}
                                    className="flex-1"
                                >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                </Button>
                                {data[0].subServices.length > 0 && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => router.push(`/dashboard/saloons/${data[0].id}/pricing`)}
                                        className="flex-1"
                                    >
                                        <DollarSign className="mr-2 h-4 w-4" />
                                        Pricing
                                    </Button>
                                )}
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleDeleteClick(data[0].id)}
                                    className="flex-1"
                                >
                                    <Trash className="mr-2 h-4 w-4" />
                                    Delete
                                </Button>
                            </div>
                        </div>
                    )}
                </>
            )}

            <AlertModal
                isOpen={open}
                onClose={() => {
                    setOpen(false);
                    setDeleteId(null);
                }}
                onConfirm={onDelete}
                loading={loading}
            />
        </div>
    )
}
