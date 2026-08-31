import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getStockData } from "@/lib/market-data";
export async function GET(request: Request) {
  if (!(await currentUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ stock: await getStockData(new URL(request.url).searchParams.get("symbol") ?? "AAPL") });
}
