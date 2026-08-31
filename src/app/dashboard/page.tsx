import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { DashboardClient } from "@/components/dashboard-client";
export default async function DashboardPage() { const user = await currentUser(); if (!user) redirect("/login"); return <DashboardClient email={user.email} />; }
