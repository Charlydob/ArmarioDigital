import Link from "next/link";
import {
  CalendarDays,
  Heart,
  Images,
  Shirt,
  Sparkles,
  UserRound,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isoDate } from "@/lib/calendar";

export default async function HomePage() {
  const user = await requireUser();
  const now = new Date();
  const today = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
  );
  const start = new Date(today);
  start.setUTCDate(today.getUTCDate() - ((today.getUTCDay() + 6) % 7));
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  const [garments, poses, outfits, wishlist, recent, week] = await Promise.all([
    db.garment.count({ where: { ownerId: user.id } }),
    db.pose.count({ where: { ownerId: user.id } }),
    db.outfit.count({ where: { ownerId: user.id } }),
    db.garment.count({ where: { ownerId: user.id, status: "WISHLIST" } }),
    db.outfit.findFirst({
      where: { ownerId: user.id },
      include: { previewMedia: true, _count: { select: { items: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    db.outfitCalendarEntry.findMany({
      where: { userId: user.id, date: { gte: start, lte: end } },
      include: { outfit: { include: { previewMedia: true } } },
    }),
  ]);
  const weekMap = new Map(week.map((entry) => [isoDate(entry.date), entry]));
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    return date;
  });
  return (
    <AppShell>
      <section className="hero card">
        <div>
          <div className="eyebrow">Tu vestidor personal</div>
          <h1>¿Qué te apetece ponerte hoy?</h1>
          <p className="subtle">Combina lo que tienes con lo que te inspira.</p>
          <div className="toolbar">
            <Link className="btn btn-primary" href="/probar">
              <Sparkles size={17} />
              Crear conjunto
            </Link>
            <Link className="btn btn-ghost" href="/armario/nueva">
              <Shirt size={17} />
              Añadir prenda
            </Link>
          </div>
        </div>
        <div className="hero-art">
          <div className="hero-figure" />
        </div>
      </section>
      <div className="stats">
        <Link href="/armario" className="card stat">
          <Shirt />
          <b>{garments}</b>
          <span>prendas</span>
        </Link>
        <Link href="/conjuntos" className="card stat">
          <Images />
          <b>{outfits}</b>
          <span>conjuntos</span>
        </Link>
        <Link href="/poses" className="card stat">
          <UserRound />
          <b>{poses}</b>
          <span>poses</span>
        </Link>
      </div>
      <div className="section-head">
        <h2>Esta semana</h2>
        <Link href="/calendario" className="subtle">
          Abrir calendario →
        </Link>
      </div>
      <div className="week-strip">
        {weekDays.map((day) => {
          const entry = weekMap.get(isoDate(day));
          return (
            <Link
              href="/calendario"
              key={isoDate(day)}
              className={`week-day ${isoDate(day) === isoDate(today) ? "today" : ""}`}
            >
              <small>
                {new Intl.DateTimeFormat("es", {
                  weekday: "short",
                  timeZone: "UTC",
                }).format(day)}
              </small>
              <b>{day.getUTCDate()}</b>
              {entry?.outfit.previewMedia ? (
                <img
                  src={`/api/media/${entry.outfit.previewMedia.id}`}
                  alt=""
                />
              ) : (
                <i />
              )}
              <span>{entry?.outfit.name || "Libre"}</span>
            </Link>
          );
        })}
      </div>
      {recent ? (
        <>
          <div className="section-head">
            <h2>Último conjunto</h2>
            <Link href="/conjuntos" className="subtle">
              Ver todos →
            </Link>
          </div>
          <Link href={`/conjuntos/${recent.id}`} className="card recent-look">
            {recent.previewMedia && (
              <img src={`/api/media/${recent.previewMedia.id}`} alt="" />
            )}
            <div className="card-body">
              <span className="pill">{recent._count.items} prendas</span>
              <h2>{recent.name}</h2>
              <p className="subtle">
                Editado{" "}
                {new Intl.DateTimeFormat("es", { dateStyle: "medium" }).format(
                  recent.updatedAt,
                )}
              </p>
            </div>
          </Link>
        </>
      ) : (
        <div className="empty">
          <Sparkles />
          <h2>Tu primer look empieza aquí</h2>
          <p>Añade una pose y algunas prendas para comenzar.</p>
          <Link className="btn btn-primary" href="/poses">
            Crear pose
          </Link>
        </div>
      )}
      <div className="section-head">
        <h2>Accesos rápidos</h2>
      </div>
      <div className="quick-grid">
        <Link className="card card-body" href="/calendario">
          <CalendarDays />
          <h3>Planificar looks</h3>
          <p className="subtle">Tu agenda de conjuntos</p>
        </Link>
        <Link className="card card-body" href="/armario?status=WISHLIST">
          <Heart />
          <h3>Lista de deseos</h3>
          <p className="subtle">{wishlist} prendas guardadas</p>
        </Link>
      </div>
    </AppShell>
  );
}
