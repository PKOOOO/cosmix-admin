// app/api/public/saloons/[saloonId]/available-slots/route.ts
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

// Providers are bookable around the clock: there are no opening hours, so every
// slot in the customer's calendar day is offered unless it's past or booked.
// (SaloonTimeSlot rows may still exist from older salons — they are ignored.)

const MINUTE_MS = 60_000;
const DAY_MINUTES = 24 * 60;
// Start times sit on a fixed half-hour grid (09:00, 09:30, …) whatever the
// service length, so customers see tidy times instead of 00:55, 01:50…
const STEP_MINUTES = 30;
const DEFAULT_DURATION = 60;
const FALLBACK_TIME_ZONE = "Europe/Helsinki";

const pad2 = (n: number) => n.toString().padStart(2, "0");

// Minutes to ADD to local time to get UTC — the same sign as JS getTimezoneOffset().
// Used for old app builds that don't send `tz`.
function fallbackOffsetMinutes(at: Date): number {
    const part = new Intl.DateTimeFormat("en-US", {
        timeZone: FALLBACK_TIME_ZONE,
        timeZoneName: "shortOffset",
    }).formatToParts(at).find(p => p.type === "timeZoneName")?.value ?? "GMT";
    const m = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(part);
    if (!m) return 0;
    const minutes = Number(m[2]) * 60 + Number(m[3] ?? 0);
    return m[1] === "+" ? -minutes : minutes;
}

export async function GET(
    req: Request,
    { params }: { params: { saloonId: string } }
) {
    try {
        const { saloonId } = params;
        const { searchParams } = new URL(req.url);
        const serviceId = searchParams.get('serviceId');
        const date = searchParams.get('date');
        const tzParam = searchParams.get('tz');

        if (!saloonId) {
            return new NextResponse("Saloon ID is required", { status: 400 });
        }

        if (!serviceId) {
            return new NextResponse("Service ID is required", { status: 400 });
        }

        const dateMatch = date ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(date) : null;
        if (!date || !dateMatch) {
            return new NextResponse("Date is required (YYYY-MM-DD)", { status: 400 });
        }

        // `date` is the customer's local calendar day. Build its boundaries in
        // UTC using their offset, so slot times match their clock rather than
        // the server's (Vercel runs in UTC).
        const utcMidnight = Date.UTC(Number(dateMatch[1]), Number(dateMatch[2]) - 1, Number(dateMatch[3]));
        const parsedTz = tzParam != null ? Number(tzParam) : NaN;
        const offsetMinutes = Number.isFinite(parsedTz) && Math.abs(parsedTz) <= 14 * 60
            ? parsedTz
            : fallbackOffsetMinutes(new Date(utcMidnight + 12 * 60 * MINUTE_MS));
        const dayStart = new Date(utcMidnight + offsetMinutes * MINUTE_MS);
        const dayEnd = new Date(dayStart.getTime() + DAY_MINUTES * MINUTE_MS);

        // Durations of everything this salon offers — a provider can't do two
        // treatments at once, so every booking at the salon blocks its time.
        const salonServices = await prismadb.saloonService.findMany({
            where: { saloonId },
            select: { serviceId: true, durationMinutes: true },
        });
        const durationOf = new Map(salonServices.map(s => [s.serviceId, s.durationMinutes || DEFAULT_DURATION]));
        const serviceDuration = durationOf.get(serviceId) ?? DEFAULT_DURATION;

        // Include the evening before so a late booking running past midnight still blocks.
        const existingBookings = await prismadb.booking.findMany({
            where: {
                saloonId,
                bookingTime: { gte: new Date(dayStart.getTime() - DAY_MINUTES * MINUTE_MS), lt: dayEnd },
                status: { not: 'cancelled' },
            },
            select: { bookingTime: true, serviceId: true },
        });
        const busy = existingBookings.map(b => {
            const start = new Date(b.bookingTime).getTime();
            return { start, end: start + (durationOf.get(b.serviceId) ?? DEFAULT_DURATION) * MINUTE_MS };
        });

        const now = Date.now();
        const availableSlots: { time: string; datetime: string }[] = [];

        for (let minute = 0; minute + serviceDuration <= DAY_MINUTES; minute += STEP_MINUTES) {
            const slotStart = dayStart.getTime() + minute * MINUTE_MS;
            if (slotStart <= now) continue;

            // Taken if it overlaps any existing booking at this salon.
            const slotEnd = slotStart + serviceDuration * MINUTE_MS;
            if (busy.some(b => slotStart < b.end && b.start < slotEnd)) continue;

            availableSlots.push({
                time: `${pad2(Math.floor(minute / 60))}:${pad2(minute % 60)}`,
                datetime: new Date(slotStart).toISOString(),
            });
        }

        return NextResponse.json({
            availableSlots,
            date,
            saloonId,
            serviceId,
        });

    } catch (error) {
        console.log('[AVAILABLE_SLOTS_GET]', error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

export const runtime = "nodejs";
