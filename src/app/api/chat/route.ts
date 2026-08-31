import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { addMessage, conversationBelongsToUser, createConversation, getMessages, setConversationTitle } from "@/lib/db";
import { answerStockQuestion } from "@/lib/agent";

const schema = z.object({ message: z.string().trim().min(2).max(1500), conversationId: z.number().int().positive().optional() });
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = schema.safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: "Please enter a short stock research question." }, { status: 400 });
  let conversationId = body.data.conversationId;
  if (!conversationId || !conversationBelongsToUser(conversationId, user.id)) conversationId = createConversation(user.id, body.data.message.slice(0, 48));
  const history = getMessages(conversationId);
  addMessage(conversationId, "user", body.data.message);
  if (history.length === 0) setConversationTitle(conversationId, body.data.message.slice(0, 48));
  const { answer, stock } = await answerStockQuestion(body.data.message, history, conversationId);
  const id = addMessage(conversationId, "assistant", answer);
  return NextResponse.json({ conversationId, message: { id, role: "assistant", content: answer, createdAt: new Date().toISOString() }, stock });
}
