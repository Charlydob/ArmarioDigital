import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const email = process.env.INITIAL_USER_EMAIL;
const password = process.env.INITIAL_USER_PASSWORD;

if (!email || !password || password.length < 10) {
  throw new Error("INITIAL_USER_EMAIL and INITIAL_USER_PASSWORD (10+ chars) are required");
}

await db.user.upsert({
  where: { email: email.toLowerCase() },
  update: { passwordHash: await bcrypt.hash(password, 12) },
  create: { email: email.toLowerCase(), passwordHash: await bcrypt.hash(password, 12) },
});
console.log(`Initial user ready: ${email}`);
await db.$disconnect();
