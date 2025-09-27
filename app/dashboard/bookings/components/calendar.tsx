"use client";
import React, { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek, addDays } from "date-fns";
import { ChevronLeft, ChevronRight, Clock, User, DollarSign, X, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BookingColumn } from "./columns";

interface BookingCalendarProps {
  data: BookingColumn[];
}

export const BookingCalendar: React.FC<BookingCalendarProps> = ({ data }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [isMobileView, setIsMobileView] = useState(false);

  // Check if mobile view should be used
  const checkMobileView = () => {
    if (typeof window !== 'undefined') {
      setIsMobileView(window.innerWidth < 768);
    }
  };

  // Initialize mobile view check
  useEffect(() => {
    checkMobileView();
    window.addEventListener('resize', checkMobileView);
    return () => window.removeEventListener('resize', checkMobileView);
  }, []);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // For week view
  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const getBookingsForDay = (day: Date) => {
    return data.filter(booking => isSameDay(new Date(booking.bookingTime), day));
  };

  const previousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const nextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const previousWeek = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const nextWeek = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setIsDialogOpen(true);
  };

  const getSelectedDateBookings = () => {
    if (!selectedDate) return [];
    return getBookingsForDay(selectedDate);
  };

  // Get current month's bookings for statistics
  const currentMonthBookings = data.filter(booking => isSameMonth(new Date(booking.bookingTime), currentDate));

  // Mobile Calendar View
  if (isMobileView) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold">
              Bookings Calendar
            </CardTitle>
            <div className="flex items-center space-x-1">
              <Button variant="outline" size="sm" onClick={previousMonth} className="p-2">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={nextMonth} className="p-2">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <h2 className="text-lg font-semibold text-center mt-2">
            {format(currentDate, "MMMM yyyy")}
          </h2>
        </CardHeader>
        <CardContent className="p-3">
          {/* Mobile Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {/* Day Headers */}
            {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
              <div key={index} className="p-2 text-center font-semibold text-xs text-gray-500">
                {day}
              </div>
            ))}
            {/* Calendar Days */}
            {calendarDays.map((day) => {
              const dayBookings = getBookingsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isTodayDate = isToday(day);
              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[60px] p-1 border rounded-lg transition-colors cursor-pointer ${
                    isCurrentMonth ? "bg-white hover:bg-gray-50" : "bg-gray-50 hover:bg-gray-100"
                  } ${isTodayDate ? "ring-2 ring-blue-500" : ""}`}
                  onClick={() => handleDateClick(day)}
                >
                  <div className={`text-sm font-medium mb-1 ${
                    isCurrentMonth ? "text-gray-900" : "text-gray-400"
                  } ${isTodayDate ? "text-blue-600 font-bold" : ""}`}>
                    {format(day, "d")}
                  </div>
                  {/* Bookings for this day - Mobile optimized */}
                  <div className="space-y-1">
                    {dayBookings.slice(0, 2).map((booking) => (
                      <div
                        key={booking.id}
                        className={`text-xs p-1 rounded border-l-2 transition-colors ${
                          booking.status === "confirmed" 
                            ? "bg-green-50 border-green-400 text-green-800"
                            : "bg-yellow-50 border-yellow-400 text-yellow-800"
                        }`}
                      >
                        <div className="font-medium truncate text-xs">
                          {booking.serviceName}
                        </div>
                        <div className="text-xs opacity-80">
                          {format(new Date(booking.bookingTime), "h:mm a")}
                        </div>
                      </div>
                    ))}
                    {/* Show count if more bookings exist */}
                    {dayBookings.length > 2 && (
                      <div className="text-xs text-gray-500 p-1 font-medium">
                        +{dayBookings.length - 2}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>

        {/* Mobile Dialog for showing booking details */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto mx-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2 text-lg">
                <Calendar className="w-5 h-5" />
                <span>
                  {selectedDate && format(selectedDate, "MMM do, yyyy")}
                </span>
              </DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              {getSelectedDateBookings().length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No bookings for this day
                  </h3>
                  <p className="text-gray-500 text-sm">
                    {selectedDate && isSameDay(selectedDate, new Date()) 
                      ? "You have no bookings scheduled for today." 
                      : "No appointments scheduled for this date."}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 mb-4">
                    {getSelectedDateBookings().length} booking{getSelectedDateBookings().length !== 1 ? 's' : ''} scheduled
                  </p>
                  {getSelectedDateBookings()
                    .sort((a, b) => new Date(a.bookingTime).getTime() - new Date(b.bookingTime).getTime())
                    .map((booking) => (
                      <Card key={booking.id} className="border">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center space-x-2">
                              <Badge 
                                variant={booking.status === "confirmed" ? "default" : "secondary"}
                                className={booking.status === "confirmed" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}
                              >
                                {booking.status === "confirmed" ? "Confirmed" : "Pending"}
                              </Badge>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-semibold text-green-600">
                                ${booking.totalAmount.toFixed(2)}
                              </div>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-2">{booking.serviceName}</h4>
                              <div className="space-y-1 text-sm text-gray-600">
                                <div className="flex items-center space-x-2">
                                  <User className="w-4 h-4" />
                                  <span>{booking.customerName}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Clock className="w-4 h-4" />
                                  <span>{format(new Date(booking.bookingTime), "h:mm a")}</span>
                                </div>
                              </div>
                            </div>
                            <div className="pt-2 border-t">
                              <h5 className="font-medium text-gray-700 mb-1">Booking Details</h5>
                              <div className="text-sm text-gray-600 space-y-1">
                                <div>
                                  <span className="font-medium">Created:</span> {booking.createdAt}
                                </div>
                                <div>
                                  <span className="font-medium">Status:</span>{" "}
                                  <span className={booking.status === "confirmed" ? "text-green-600" : "text-yellow-600"}>
                                    {booking.status === "confirmed" ? "Confirmed" : "Pending Confirmation"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Mobile Statistics */}
        <div className="grid grid-cols-1 gap-3 mt-4">
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-bold">{currentMonthBookings.length}</div>
                  <p className="text-xs text-gray-500">Total Bookings</p>
                </div>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">Total</Badge>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-bold">
                    {currentMonthBookings.filter(b => b.status === "confirmed").length}
                  </div>
                  <p className="text-xs text-gray-500">Confirmed</p>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-800">Confirmed</Badge>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-bold">
                    ${currentMonthBookings.reduce((sum, booking) => sum + booking.totalAmount, 0).toFixed(2)}
                  </div>
                  <p className="text-xs text-gray-500">Revenue</p>
                </div>
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      </Card>
    );
  }

  // Desktop Calendar View
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-bold">
            Bookings Calendar
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={previousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-semibold min-w-[200px] text-center">
              {format(currentDate, "MMMM yyyy")}
            </h2>
            <Button variant="outline" size="sm" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Desktop Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 mb-4">
          {/* Day Headers */}
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="p-2 text-center font-semibold text-sm text-gray-500">
              {day}
            </div>
          ))}
          {/* Calendar Days */}
          {calendarDays.map((day) => {
            const dayBookings = getBookingsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isTodayDate = isToday(day);
            return (
              <div
                key={day.toISOString()}
                className={`min-h-[120px] p-1 border rounded-lg transition-colors cursor-pointer ${
                  isCurrentMonth ? "bg-white hover:bg-gray-50" : "bg-gray-50 hover:bg-gray-100"
                } ${isTodayDate ? "ring-2 ring-blue-500" : ""}`}
                onClick={() => handleDateClick(day)}
              >
                <div className={`text-sm font-medium mb-1 ${
                  isCurrentMonth ? "text-gray-900" : "text-gray-400"
                } ${isTodayDate ? "text-blue-600 font-bold" : ""}`}>
                  {format(day, "d")}
                </div>
                {/* Bookings for this day */}
                <div className="space-y-1">
                  {dayBookings.slice(0, 3).map((booking) => (
                    <div
                      key={booking.id}
                      className={`text-xs p-1 rounded border-l-2 transition-colors hover:shadow-sm ${
                        booking.status === "confirmed" 
                          ? "bg-green-50 border-green-400 text-green-800 hover:bg-green-100"
                          : "bg-yellow-50 border-yellow-400 text-yellow-800 hover:bg-yellow-100"
                      }`}
                    >
                      <div className="font-medium truncate">
                        {booking.serviceName}
                      </div>
                      <div className="flex items-center text-xs opacity-80">
                        <Clock className="w-3 h-3 mr-1" />
                        {format(new Date(booking.bookingTime), "h:mm a")}
                      </div>
                      <div className="flex items-center text-xs opacity-80 truncate">
                        <User className="w-3 h-3 mr-1" />
                        {booking.customerName}
                      </div>
                    </div>
                  ))}
                  {/* Show count if more bookings exist */}
                  {dayBookings.length > 3 && (
                    <div className="text-xs text-gray-500 p-1 font-medium">
                      +{dayBookings.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Dialog for showing booking details */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto mx-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Calendar className="w-5 h-5" />
                <span>
                  Bookings for {selectedDate && format(selectedDate, "EEEE, MMMM do, yyyy")}
                </span>
              </DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              {getSelectedDateBookings().length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No bookings for this day
                  </h3>
                  <p className="text-gray-500">
                    {selectedDate && isSameDay(selectedDate, new Date()) 
                      ? "You have no bookings scheduled for today." 
                      : "No appointments scheduled for this date."}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 mb-4">
                    {getSelectedDateBookings().length} booking{getSelectedDateBookings().length !== 1 ? 's' : ''} scheduled
                  </p>
                  {getSelectedDateBookings()
                    .sort((a, b) => new Date(a.bookingTime).getTime() - new Date(b.bookingTime).getTime())
                    .map((booking) => (
                      <Card key={booking.id} className="border">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center space-x-2">
                              <Badge 
                                variant={booking.status === "confirmed" ? "default" : "secondary"}
                                className={booking.status === "confirmed" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}
                              >
                                {booking.status === "confirmed" ? "Confirmed" : "Pending"}
                              </Badge>
                              <span className="text-sm text-gray-500">#{booking.id.slice(-8)}</span>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-semibold text-green-600">
                                ${booking.totalAmount.toFixed(2)}
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-2">{booking.serviceName}</h4>
                              <div className="space-y-1 text-sm text-gray-600">
                                <div className="flex items-center space-x-2">
                                  <User className="w-4 h-4" />
                                  <span>{booking.customerName}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Clock className="w-4 h-4" />
                                  <span>{format(new Date(booking.bookingTime), "h:mm a")}</span>
                                </div>
                              </div>
                            </div>
                            <div>
                              <h5 className="font-medium text-gray-700 mb-1">Booking Details</h5>
                              <div className="text-sm text-gray-600 space-y-1">
                                <div>
                                  <span className="font-medium">Created:</span> {booking.createdAt}
                                </div>
                                <div>
                                  <span className="font-medium">Status:</span>{" "}
                                  <span className={booking.status === "confirmed" ? "text-green-600" : "text-yellow-600"}>
                                    {booking.status === "confirmed" ? "Confirmed" : "Pending Confirmation"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-200 border-l-2 border-green-400 rounded"></div>
            <span className="text-sm text-gray-600">Confirmed</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-200 border-l-2 border-yellow-400 rounded"></div>
            <span className="text-sm text-gray-600">Pending</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 border-2 border-blue-500 rounded"></div>
            <span className="text-sm text-gray-600">Today</span>
          </div>
        </div>

        {/* Statistics for current month */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-4 border-t">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">Total</Badge>
                <span className="text-2xl font-bold">{currentMonthBookings.length}</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Bookings in {format(currentDate, "MMMM")}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="bg-green-100 text-green-800">Confirmed</Badge>
                <span className="text-2xl font-bold">
                  {currentMonthBookings.filter(b => b.status === "confirmed").length}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Confirmed in {format(currentDate, "MMMM")}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                <span className="text-2xl font-bold">
                  ${currentMonthBookings.reduce((sum, booking) => sum + booking.totalAmount, 0).toFixed(2)}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Revenue in {format(currentDate, "MMMM")}
              </p>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
};
