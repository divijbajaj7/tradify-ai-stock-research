import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { createConversation, getMessages, listConversations, conversationBelongsToUser } from "@/lib/db";

export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (id && conversationBelongsToUser(Number(id), user.id)) return NextResponse.json({ messages: getMessages(Number(id)) });
  return NextResponse.json({ conversations: listConversations(user.id) });
}
export async function POST() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = createConversation(user.id);
  return NextResponse.json({ id, conversations: listConversations(user.id) }, { status: 201 });
}
