import { NextResponse } from "next/server";

export async function GET(req) {
    // 1. Call PHP logout to clear PHP session
    await fetch("https://api.cnergy.site/logout.php", {
        method: "GET",
        credentials: "include",
    });

    // 2. Prepare redirect response
    const response = NextResponse.redirect(new URL("/login", req.url));

    // 3. Force delete 'user_role' cookie by matching all relevant attributes
    response.cookies.set("user_role", "", {
        path: "/",
        expires: new Date(0),
        httpOnly: true, // Match the original if set this way
        secure: false,  // If running on HTTP in dev, must be false
        sameSite: "lax", // Match what was used on login
    });

    return response;
}
