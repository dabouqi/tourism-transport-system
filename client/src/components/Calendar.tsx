import React from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { formatDate } from "@/lib/dateFormatter";
import { useEffect, useState, useMemo } from "react";

interface CalendarBooking {
  id: number;
  bookingNumber: string;
  pickupDateTime: Date;
  customerName: string;
  fare: string;
  status: string;
  programDays?: number;
}

interface CalendarProps {
  bookings: CalendarBooking[];
  onBookingClick?: (booking: CalendarBooking) => void;
  onDateClick?: (date: Date, hasBookings: boolean) => void;
  onCancelBooking?: (bookingId: number) => void;
}

export function Calendar({ bookings, onBookingClick, onDateClick, onCancelBooking }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [, navigate] = useLocation();
  const [, forceUpdate] = useState({});

  useEffect(() => {
    const checkMidnight = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const timeUntilMidnight = tomorrow.getTime() - now.getTime();
      const timer = setTimeout(() => {
        forceUpdate({});
        checkMidnight();
      }, timeUntilMidnight);
      return timer;
    };
    const timer = checkMidnight();
    return () => clearTimeout(timer);
  }, []);

  const daysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const firstDayOfMonth = (date: Date) => {
    // JavaScript getDay() returns 0 for Sunday, 1 for Monday, etc.
    // Arabic week order: Sunday (0), Monday (1), Tuesday (2), Wednesday (3), Thursday (4), Friday (5), Saturday (6)
    // This matches JavaScript's getDay() so no conversion needed
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const monthYear = currentDate.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  const bookingsByDay = useMemo(() => {
    const map = new Map<number, CalendarBooking[]>();
    bookings.forEach((booking) => {
      const bookingDate = new Date(booking.pickupDateTime);
      if (
        bookingDate.getMonth() === currentDate.getMonth() &&
        bookingDate.getFullYear() === currentDate.getFullYear()
      ) {
        const day = bookingDate.getDate();
        if (!map.has(day)) {
          map.set(day, []);
        }
        map.get(day)!.push(booking);
      }
    });
    // Sort bookings by time (earliest to latest)
    map.forEach((dayBookings) => {
      dayBookings.sort((a, b) => {
        const timeA = new Date(a.pickupDateTime).getTime();
        const timeB = new Date(b.pickupDateTime).getTime();
        return timeA - timeB;
      });
    });
    return map;
  }, [bookings, currentDate]);

  const dayNames = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  
  const days: (number | null | { type: string; dayName: string })[] = [];
  const totalDays = daysInMonth(currentDate);
  const firstDay = firstDayOfMonth(currentDate);

  // Add day name headers for first row
  for (let i = 0; i < 7; i++) {
    days.push({ type: "header", dayName: dayNames[i] });
  }

  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  // Add cells for each day of the month
  for (let day = 1; day <= totalDays; day++) {
    days.push(day);
  }

  const previousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1)
    );
  };

  const nextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1)
    );
  };

  const isRecurringBooking = (bookingNumber: string) => {
    return /^BK-.*-D\d+$/.test(bookingNumber);
  };

  const getRecurringBookingInfo = (bookingNumber: string) => {
    const match = bookingNumber.match(/^(BK-.*)-D(\d+)$/);
    if (match) {
      const baseNumber = match[1];
      const dayNumber = parseInt(match[2]);
      return { baseNumber, dayNumber };
    }
    return null;
  };

  const countRecurringBookings = (baseNumber: string, programDays?: number) => {
    if (programDays && programDays > 0) {
      return programDays;
    }
    return bookings.filter((b) => b.bookingNumber.startsWith(baseNumber + "-D")).length;
  };

  const getBookingColor = (index: number) => {
    const colors = [
      "bg-blue-100 border-blue-300 hover:bg-blue-200",
      "bg-green-100 border-green-300 hover:bg-green-200",
      "bg-purple-100 border-purple-300 hover:bg-purple-200",
      "bg-pink-100 border-pink-300 hover:bg-pink-200",
      "bg-yellow-100 border-yellow-300 hover:bg-yellow-200",
    ];
    return colors[index % colors.length];
  };

  const formatTime = (date: Date) => {
    const d = new Date(date);
    const hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  const isToday = (day: number | null) => {
    if (day === null) return false;
    const today = new Date();
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  const isPastDay = (day: number | null) => {
    if (day === null) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
  };

  return (
    <Card className="p-2 sm:p-3 md:p-6 bg-card">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg md:text-2xl font-bold text-card-foreground">{monthYear}</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={previousMonth}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={nextMonth}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Horizontal scroll wrapper for mobile - calendar grid only */}
        <div className="overflow-x-auto md:overflow-x-visible">
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5 md:gap-2 min-w-max md:min-w-full auto-rows-max">
            {days.map((day, index) => {
              // Render header cells for day names
              if (typeof day === "object" && day !== null && "type" in day && day.type === "header") {
                return (
                  <div
                    key={`header-${index}`}
                    className="text-center font-semibold text-xs sm:text-sm md:text-sm text-muted-foreground py-1 sm:py-2 md:py-3 h-8 sm:h-10 flex items-center justify-center"
                  >
                    {day.dayName}
                  </div>
                );
              }

              // Render regular date cells
              return (
                <div
                  key={index}
                  className={`min-h-24 sm:min-h-28 md:min-h-24 border-2 rounded-lg p-1 sm:p-2 md:p-3 transition-all ${
                    day === null
                      ? "bg-muted border-muted"
                      : isToday(day as number)
                      ? "bg-orange-900 border-orange-700 shadow-md"
                      : isPastDay(day as number)
                      ? "bg-slate-900 border-slate-800 hover:bg-slate-800 cursor-pointer"
                      : "bg-background border-border hover:bg-muted/50 cursor-pointer"
                  }`}
                  onClick={() => {
                    if (day !== null && typeof day === "number" && onDateClick) {
                      const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                      const hasBookings = (bookingsByDay.get(day)?.length || 0) > 0;
                      onDateClick(selectedDate, hasBookings);
                    }
                  }}
                >
                  {day !== null && typeof day === "number" && (
                    <div className="space-y-1 h-full flex flex-col">
                      <div className={`font-bold text-base md:text-lg ${
                    isPastDay(day as number) ? 'text-slate-300' : isToday(day as number) ? 'text-orange-100' : 'text-foreground'
                  }`}>{day}</div>
                      <div className="space-y-1 flex-1 overflow-y-auto">
                        {bookingsByDay.get(day)?.map((booking, bookingIndex) => {
                          const isRecurring = isRecurringBooking(booking.bookingNumber);
                          const recurringInfo = isRecurring ? getRecurringBookingInfo(booking.bookingNumber) : null;
                          const totalRecurring = recurringInfo ? countRecurringBookings(recurringInfo.baseNumber, booking.programDays) : 0;
                          return (
                            <button
                              key={booking.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onBookingClick) {
                                  onBookingClick(booking);
                                } else {
                                  navigate(`/bookings?id=${booking.id}`);
                                }
                              }}
                              className={`w-full text-left text-xs md:text-sm p-2 md:p-2 rounded border-2 md:border cursor-pointer transition-all relative ${
                                booking.status === 'cancelled'
                                  ? "bg-red-100 border-red-400 hover:bg-red-200 opacity-60"
                                  : isRecurring
                                  ? "bg-blue-50 border-l-4 border-l-blue-500 border-blue-300 hover:bg-blue-100"
                                  : getBookingColor(bookingIndex)
                              }`}
                              title={`${booking.customerName} - ${booking.bookingNumber}${booking.status === 'cancelled' ? ' (ملغى)' : ''}`}
                            >
                              {booking.status === 'cancelled' && (
                                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                                  <line x1="0" y1="0" x2="100" y2="100" stroke="#dc2626" strokeWidth="8" strokeLinecap="round" />
                                  <line x1="100" y1="0" x2="0" y2="100" stroke="#dc2626" strokeWidth="8" strokeLinecap="round" />
                                </svg>
                              )}
                              <div className="font-bold text-xs md:text-sm text-foreground line-clamp-1">
                                {booking.bookingNumber}
                              </div>
                              <div className="text-xs md:text-sm text-foreground font-semibold line-clamp-1">
                                {formatTime(new Date(booking.pickupDateTime))}
                              </div>
                              <div className="text-xs md:text-sm text-foreground/90 line-clamp-1">
                                {booking.customerName}
                              </div>
                              <div className="font-bold text-xs md:text-sm text-foreground line-clamp-1">
                                {booking.fare} د.ا
                              </div>
                              {isRecurring && recurringInfo && (
                                <div className="text-xs md:text-sm text-blue-700 font-bold mt-1">
                                  حجز واحد ({recurringInfo.dayNumber} من {totalRecurring})
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}
