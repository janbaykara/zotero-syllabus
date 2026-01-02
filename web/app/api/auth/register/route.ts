import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { zoteroUserId, email } = body;

    if (!zoteroUserId || !email) {
      return NextResponse.json(
        { error: "zoteroUserId and email are required" },
        { status: 400 }
      );
    }

    // Basic email validation
    if (!email.includes("@") || !email.includes(".")) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    const payload = await getPayload({ config });

    // Check if user already exists
    const existingUsers = await payload.find({
      collection: "users",
      where: {
        zoteroUserId: { equals: zoteroUserId },
      },
      limit: 1,
    });

    if (existingUsers.docs.length > 0) {
      const existingUser = existingUsers.docs[0];
      // Return existing API key if user exists
      // Note: Payload doesn't expose API keys after creation, 
      // so we need to generate a new one
      const updatedUser = await payload.update({
        collection: "users",
        id: existingUser.id,
        data: {
          email,
          enableAPIKey: true,
        },
      });

      return NextResponse.json({
        userId: updatedUser.id,
        apiKey: updatedUser.apiKey,
        message: "User already exists, API key regenerated",
      });
    }

    // Create new user with a random password (they'll use API key auth)
    const randomPassword = crypto.randomUUID() + crypto.randomUUID();
    
    const newUser = await payload.create({
      collection: "users",
      data: {
        email,
        password: randomPassword,
        zoteroUserId,
        role: "user",
        enableAPIKey: true,
      },
    });

    return NextResponse.json({
      userId: newUser.id,
      apiKey: newUser.apiKey,
      message: "User created successfully",
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Registration failed" },
      { status: 500 }
    );
  }
}

