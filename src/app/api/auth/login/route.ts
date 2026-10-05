import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";

export async function POST(request: Request) {
  const { email, password } = await request.json().catch(() => ({}));
  if (typeof email !== "string" || typeof password !== "string") return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return NextResponse.json({ error: "Email o contraseña incorrectos" }, { status: 401 });
  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
