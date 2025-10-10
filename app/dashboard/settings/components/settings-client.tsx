// app/(dashboard)/dashboard/settings/components/settings-client.tsx
"use client";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { User, Bell, Shield, Palette } from "lucide-react";
import { useState } from "react";
import { useTheme } from "next-themes";
import toast from "react-hot-toast";
import { UserButton } from "@clerk/nextjs";

export const SettingsClient = () => {
    const [notifications, setNotifications] = useState(true);
    const [emailUpdates, setEmailUpdates] = useState(true);
    const [smsUpdates, setSmsUpdates] = useState(false);
    const { theme, setTheme } = useTheme();

    const handleSave = () => {
        toast.success("Settings saved successfully!");
    };

    const handleThemeChange = (newTheme: string) => {
        setTheme(newTheme);
        toast.success(`Theme changed to ${newTheme}`);
    };

    return (
        <div className="space-y-6">
            <div className="mt-6 md:mt-8">
                <Heading title="Settings" description="Manage your account settings and preferences" />
            </div>
            <Separator />
            
            <div className="grid gap-6">
                {/* Profile Settings */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center space-x-2">
                            <User className="h-5 w-5" />
                            <CardTitle>Profile Settings</CardTitle>
                        </div>
                        <CardDescription>
                            Update your personal information and profile details
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Mobile Profile Section */}
                        <div className="md:hidden">
                            <div className="flex flex-col items-center space-y-4 p-4 border rounded-lg bg-brand-cream">
                                <div className="text-center">
                                    <h3 className="text-lg font-semibold text-brand-dark">Your Profile</h3>
                                    <p className="text-sm text-muted-foreground">Manage your account settings</p>
                                </div>
                                <UserButton 
                                    afterSignOutUrl="/"
                                    appearance={{
                                        elements: {
                                            avatarBox: "w-20 h-20",
                                            userButtonPopoverCard: "bg-white border border-gray-200 shadow-lg",
                                            userButtonPopoverActionButton: "hover:bg-brand-hover",
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        {/* Desktop Profile Form */}
                        <div className="hidden md:block space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Full Name</Label>
                                    <Input id="name" placeholder="Enter your full name" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email Address</Label>
                                    <Input id="email" type="email" placeholder="Enter your email" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="bio">Bio</Label>
                                <Textarea id="bio" placeholder="Tell us about yourself" />
                            </div>
                            <Button onClick={handleSave}>Save Profile</Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Notification Settings */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center space-x-2">
                            <Bell className="h-5 w-5" />
                            <CardTitle>Notification Settings</CardTitle>
                        </div>
                        <CardDescription>
                            Choose how you want to be notified about bookings and updates
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Push Notifications</Label>
                                <p className="text-sm text-muted-foreground">
                                    Receive notifications for new bookings and updates
                                </p>
                            </div>
                            <Switch
                                checked={notifications}
                                onCheckedChange={setNotifications}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Email Updates</Label>
                                <p className="text-sm text-muted-foreground">
                                    Get email notifications for important updates
                                </p>
                            </div>
                            <Switch
                                checked={emailUpdates}
                                onCheckedChange={setEmailUpdates}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>SMS Updates</Label>
                                <p className="text-sm text-muted-foreground">
                                    Receive SMS notifications for urgent matters
                                </p>
                            </div>
                            <Switch
                                checked={smsUpdates}
                                onCheckedChange={setSmsUpdates}
                            />
                        </div>
                        <Button onClick={handleSave}>Save Notifications</Button>
                    </CardContent>
                </Card>

                {/* Security Settings */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center space-x-2">
                            <Shield className="h-5 w-5" />
                            <CardTitle>Security Settings</CardTitle>
                        </div>
                        <CardDescription>
                            Manage your account security and privacy settings
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="current-password">Current Password</Label>
                            <Input id="current-password" type="password" placeholder="Enter current password" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="new-password">New Password</Label>
                            <Input id="new-password" type="password" placeholder="Enter new password" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirm-password">Confirm New Password</Label>
                            <Input id="confirm-password" type="password" placeholder="Confirm new password" />
                        </div>
                        <Button onClick={handleSave}>Update Password</Button>
                    </CardContent>
                </Card>

                {/* Appearance Settings */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center space-x-2">
                            <Palette className="h-5 w-5" />
                            <CardTitle>Appearance</CardTitle>
                        </div>
                        <CardDescription>
                            Customize the look and feel of your dashboard
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Theme</Label>
                            <div className="flex space-x-2">
                                <Button 
                                    variant={theme === "light" ? "default" : "outline"} 
                                    size="sm"
                                    onClick={() => handleThemeChange("light")}
                                >
                                    Light
                                </Button>
                                <Button 
                                    variant={theme === "dark" ? "default" : "outline"} 
                                    size="sm"
                                    onClick={() => handleThemeChange("dark")}
                                >
                                    Dark
                                </Button>
                                <Button 
                                    variant={theme === "system" ? "default" : "outline"} 
                                    size="sm"
                                    onClick={() => handleThemeChange("system")}
                                >
                                    System
                                </Button>
                            </div>
                        </div>
                        <Button onClick={handleSave}>Save Appearance</Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
