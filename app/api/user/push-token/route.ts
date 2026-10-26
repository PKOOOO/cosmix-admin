import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { getEndUser } from "@/lib/admin-access";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-User-Token",
};

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: Request) {
    try {
        // A push token belongs to one device of one human — the shared bearer
        // key alone must not be enough to write it, or it lands on the service
        // row. Requires a verified Clerk user (X-User-Token).
        const user = await getEndUser();
        if (!user) return new NextResponse("Unauthorized", { status: 401, headers: corsHeaders });

        const body = await req.json();
        const { pushToken } = body;

        if (!pushToken || typeof pushToken !== "string") {
            return new NextResponse("pushToken is required", { status: 400 });
        }

        // One row per device: a second phone adds a token instead of
        // overwriting the first. A device that signs in as another account
        // moves its token there (upsert on the unique token).
        await prismadb.pushToken.upsert({
            where: { token: pushToken },
            create: { token: pushToken, userId: user.id },
            update: { userId: user.id },
        });
        // Keep the legacy column on the latest device, and take this device
        // away from any other account still holding it there.
        await prismadb.user.updateMany({
            where: { pushToken, NOT: { id: user.id } },
            data: { pushToken: null },
        });
        await prismadb.user.update({
            where: { id: user.id },
            data: { pushToken },
        });

        return NextResponse.json({ success: true }, { headers: corsHeaders });
    } catch (error) {
        console.log("[PUSH_TOKEN_POST]", error);
        return new NextResponse("Internal error", { status: 500 });
    }
}
