import AppShell from "@/components/AppShell";
import GarmentWizard from "@/components/GarmentWizard";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
export default async function NewGarmentPage(){const user=await requireUser();const poses=await db.pose.findMany({where:{ownerId:user.id},include:{normalizedMedia:true},orderBy:{createdAt:"asc"}});return <AppShell><GarmentWizard poses={poses.map(p=>({id:p.id,name:p.name,mediaId:p.normalizedMedia.id}))}/></AppShell>}
