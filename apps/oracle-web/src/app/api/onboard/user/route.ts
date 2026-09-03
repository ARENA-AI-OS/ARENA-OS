import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import * as bmoni from "@/lib/bmoni";
import { createSession } from "@/lib/db";
import { setSessionCookie } from "@/lib/session";

const Input = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phoneNumber: z.string().min(10), // E.164
});

export async function POST(req: NextRequest) {
  const parsed = Input.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const user = await bmoni.createUser(parsed.data);
    createSession({
      bmoniUserId: user.bmoniUserId,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      email: parsed.data.email,
      phoneNumber: parsed.data.phoneNumber,
    });
    await setSessionCookie(user.bmoniUserId);
    return NextResponse.json({ bmoniUserId: user.bmoniUserId });
  } catch (err) {
    if (err instanceof bmoni.BmoniError) {
      return NextResponse.json({ error: err.body }, { status: err.status });
    }
    throw err;
  }
}
