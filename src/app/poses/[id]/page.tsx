import { notFound } from "next/navigation";
import AppShell from "@/components/AppShell";
import PoseWizard from "@/components/PoseWizard";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseAnchors } from "@/lib/labels";

export default async function EditPosePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const pose = await db.pose.findFirst({ where: { id, ownerId: user.id } });
  if (!pose) notFound();
  return (
    <AppShell>
      <PoseWizard pose={{ ...pose, anchors: parseAnchors(pose.anchors) }} />
    </AppShell>
  );
}
