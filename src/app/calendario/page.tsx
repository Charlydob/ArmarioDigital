import AppShell from "@/components/AppShell";
import CalendarView from "@/components/CalendarView";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function CalendarPage() {
  const user = await requireUser();
  const outfits = await db.outfit.findMany({
    where: { ownerId: user.id },
    select: { id: true, name: true, previewMediaId: true, realPhotoMediaId: true },
    orderBy: { updatedAt: "desc" },
  });
  return (
    <AppShell>
      <header className="page-head compact-head">
        <div>
          <div className="eyebrow">Tu agenda</div>
          <h1>Calendario</h1>
          <p className="subtle">
            Planea lo que te pondrás y registra lo que llevaste.
          </p>
        </div>
      </header>
      <section className="card calendar-card">
        <CalendarView outfits={outfits.map((outfit) => ({ id: outfit.id, name: outfit.name, previewMediaId: outfit.realPhotoMediaId || outfit.previewMediaId }))} />
      </section>
    </AppShell>
  );
}
