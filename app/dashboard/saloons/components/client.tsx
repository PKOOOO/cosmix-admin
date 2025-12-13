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
import { UserButton, useClerk } from "@clerk/nextjs";

interface SaloonClientProps {
    data: SaloonColumn[]
}

export const SaloonClient: React.FC<SaloonClientProps> = ({
    data
}) => {
    const router = useRouter();
    const { signOut } = useClerk();
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


            {data.length === 0 ? (
                <div className="fixed inset-0 flex items-center justify-center">
                    <Card className="mx-4">
                        <CardContent className="flex flex-col items-center justify-center py-12 px-8">
                            <Button
                                onClick={() => router.push('/dashboard/saloons/new')}
                                size="lg"
                                className="text-lg px-8 py-6"
                            >
                                <Plus className="mr-2 h-5 w-5" />
                                Luo Saloon
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            ) : (
                <>
                    <div className="flex justify-center">
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 w-full max-w-6xl">
                            {data.map((saloon) => (
                                <Card key={saloon.id} className="overflow-hidden flex flex-col">

                                    <CardContent className="space-y-4 flex-1 flex flex-col">
                                        {/* Rating - Always show 5 stars */}
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-0.5">
                                                {[1, 2, 3, 4, 5].map((star) => {
                                                    const rating = saloon.averageRating || 0;
                                                    const isFilled = star <= Math.round(rating);
                                                    return (
                                                        <Star
                                                            key={star}
                                                            className={`h-4 w-4 ${rating > 0 && isFilled
                                                                ? 'fill-amber-800 text-amber-800'
                                                                : 'fill-gray-300 text-gray-300'
                                                                }`}
                                                        />
                                                    );
                                                })}
                                            </div>
                                            {saloon.averageRating && saloon.averageRating > 0 ? (
                                                <>
                                                    <span className="text-sm font-medium">
                                                        {saloon.averageRating.toFixed(1)}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        ({saloon.ratingsCount} {saloon.ratingsCount === 1 ? 'review' : 'reviews'})
                                                    </span>
                                                </>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">
                                                    Ei vielä arvosteluja
                                                </span>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex flex-col md:flex-row gap-2 pt-4 border-t">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => router.push(`/dashboard/saloons/${saloon.id}`)}
                                                className="w-full md:w-auto py-8 md:py-2"
                                            >
                                                <Edit className="mr-2 h-4 w-4" />
                                                muokkaa salonki
                                            </Button>
                                            {saloon.subServices.length > 0 && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => router.push(`/dashboard/saloons/${saloon.id}/pricing`)}
                                                    className="w-full md:w-auto py-8 md:py-2"
                                                >
                                                    <DollarSign className="mr-2 h-4 w-4" />
                                                    Aseta Salon hinta
                                                </Button>
                                            )}
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => handleDeleteClick(saloon.id)}
                                                className="w-full md:w-auto py-8 md:py-2"
                                            >
                                                <Trash className="mr-2 h-4 w-4" />
                                                Poista salonki
                                            </Button>

                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
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
