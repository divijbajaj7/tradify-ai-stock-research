import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { findUser } from "@/lib/db";
import { createSession } from "@/lib/auth";

const schema = z.object({ email: z.email(), password: z.string().min(1) });
export async function POST(request: Request) {
  const data = schema.safeParse(await request.json());
  if (!data.success) return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  const user = findUser(data.data.email.trim().toLowerCase());
  if (!user || !(await bcrypt.compare(data.data.password, user.password_hash))) return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
  await createSession(user.id, user.email);
  return NextResponse.json({ user: { id: user.id, email: user.email } });
}
