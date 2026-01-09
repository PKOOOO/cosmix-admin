"use client";

import { useState, useEffect } from "react";
import axios from "@/lib/axios";
import { ChevronLeft, Users, Calendar, Shield, Mail, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import toast from "react-hot-toast";

interface User {
    id: string;
    name: string | null;
    email: string;
    isAdmin: boolean;
    createdAt: string;
    _count: {
        saloons: number;
        bookings: number;
        reviews: number;
    };
}

interface AdminUsersListClientProps {
    onBack: () => void;
}

export const AdminUsersListClient = ({ onBack }: AdminUsersListClientProps) => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/admin/users');
            setUsers(response.data);
        } catch (error) {
            console.error('Error fetching users:', error);
            toast.error("Failed to fetch users");
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = users.filter(user =>
        (user.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
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
                <div className="text-muted-foreground">Loading users...</div>
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
                    <h3 className="text-lg font-semibold">All Users</h3>
                    <p className="text-xs text-muted-foreground">
                        Total: <span className="font-bold text-foreground">{users.length}</span>
                    </p>
                </div>
            </div>

            {/* Search */}
            <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-md"
            />

            {/* Users List */}
            <div className="space-y-3">
                {filteredUsers.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-8">
                            <Users className="h-8 w-8 text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">No users found</p>
                        </CardContent>
                    </Card>
                ) : (
                    filteredUsers.map((user) => (
                        <div key={user.id} className="p-3 border rounded-lg bg-card hover:bg-muted/30 transition-colors">
                            <div className="flex justify-between items-start gap-2">
                                <div className="min-w-0 flex-1 space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-sm font-semibold truncate">
                                            {user.name || 'Unknown'}
                                        </h4>
                                        {user.isAdmin && (
                                            <span className="px-1.5 py-0.5 text-[10px] bg-purple-100 text-purple-700 rounded-full font-medium flex items-center gap-1">
                                                <Shield className="h-3 w-3" />
                                                Admin
                                            </span>
                                        )}
                                    </div>



                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Calendar className="h-3 w-3 flex-shrink-0" />
                                        <span>Joined {formatDate(user.createdAt)}</span>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground flex-shrink-0">
                                    {user._count.saloons > 0 && (
                                        <div className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                                            {user._count.saloons} saloons
                                        </div>
                                    )}
                                    {user._count.bookings > 0 && (
                                        <div className="px-2 py-0.5 bg-green-50 text-green-700 rounded-full">
                                            {user._count.bookings} bookings
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
