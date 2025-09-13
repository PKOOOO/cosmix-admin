"use client";

import { useState } from "react";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { DataTable } from "@/components/ui/data-table";
import { BookingColumn, columns } from "./columns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface BookingClientProps {
  data: BookingColumn[];
}

// Mobile-friendly booking card component
const BookingCard: React.FC<{ booking: BookingColumn }> = ({ booking }) => {
  return (
    <Card className="mb-4 shadow-sm border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-semibold text-gray-900">{booking.user}</CardTitle>
          <Badge 
            variant={booking.isConfirmed ? "default" : "secondary"}
            className={`px-3 py-1 text-xs font-medium ${
              booking.isConfirmed 
                ? "bg-green-100 text-green-800 border-green-200" 
                : "bg-yellow-100 text-yellow-800 border-yellow-200"
            }`}
          >
            {booking.isConfirmed ? "✓ Confirmed" : "⏳ Pending"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Service and Amount Row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Service</p>
            <p className="text-sm font-semibold text-gray-900 mt-1">{booking.service}</p>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Amount</p>
            <p className="text-lg font-bold text-green-600 mt-1">
              {booking.totalAmount ? `$${booking.totalAmount.toFixed(2)}` : "N/A"}
            </p>
          </div>
        </div>
        
        {/* Date and Time Row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Date</p>
            <p className="text-sm font-semibold text-blue-900 mt-1">{booking.date}</p>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Time</p>
            <p className="text-lg font-bold text-purple-600 mt-1">{booking.time}</p>
          </div>
        </div>
        
        {/* Booked On */}
        <div className="bg-gray-50 p-3 rounded-lg">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Booked On</p>
          <p className="text-sm text-gray-700 mt-1">{booking.createdAt}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export const BookingClient: React.FC<BookingClientProps> = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "confirmed" | "pending">("all");
  
  const confirmedBookings = data.filter(booking => booking.isConfirmed).length;
  const pendingBookings = data.filter(booking => !booking.isConfirmed).length;

  // Filter data based on search term and status
  const filteredData = data.filter(booking => {
    const matchesSearch = booking.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         booking.service.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "confirmed" && booking.isConfirmed) ||
                         (statusFilter === "pending" && !booking.isConfirmed);
    
    return matchesSearch && matchesStatus;
  });

  return (
    <>
      <Heading
        title={`Bookings (${data.length})`}
        description={`Manage all bookings for your store - ${confirmedBookings} confirmed, ${pendingBookings} pending`}
      />
      <Separator />
      
      {/* Desktop Table View */}
      <div className="hidden md:block">
        <DataTable searchKey="user" columns={columns} data={data} />
      </div>
      
      {/* Mobile Card View */}
      <div className="md:hidden">
        {/* Mobile Search and Filters */}
        <div className="mb-6 space-y-4">
          <Input
            placeholder="🔍 Search bookings by customer or service..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-12 text-base border-2 border-gray-200 focus:border-blue-500 rounded-lg"
          />
          
          {/* Status Filter Buttons */}
          <div className="flex gap-2">
            <Button
              variant={statusFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("all")}
              className="flex-1"
            >
              All ({data.length})
            </Button>
            <Button
              variant={statusFilter === "confirmed" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("confirmed")}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              ✓ Confirmed ({confirmedBookings})
            </Button>
            <Button
              variant={statusFilter === "pending" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("pending")}
              className="flex-1 bg-yellow-600 hover:bg-yellow-700"
            >
              ⏳ Pending ({pendingBookings})
            </Button>
          </div>
        </div>
        
        {filteredData.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">
              {searchTerm ? "No bookings found matching your search" : "No bookings found"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredData.map((booking) => (
              <BookingCard key={booking.id} booking={booking} />
            ))}
          </div>
        )}
      </div>
    </>
  );
};