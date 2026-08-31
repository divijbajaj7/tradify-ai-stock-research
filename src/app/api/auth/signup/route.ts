import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { createUser, findUser } from "@/lib/db";
import { createSession } from "@/lib/auth";

const schema = z.object({ email: z.email(), password: z.string().min(8, "Use at least 8 characters.") });
export async function POST(request: Request) {
  const data = schema.safeParse(await request.json());
  if (!data.success) return NextResponse.json({ error: data.error.issues[0]?.message ?? "Invalid details." }, { status: 400 });
  const email = data.data.email.trim().toLowerCase();
  if (findUser(email)) return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
  const id = createUser(email, await bcrypt.hash(data.data.password, 12));
  await createSession(id, email);
  return NextResponse.json({ user: { id, email } }, { status: 201 });
}
