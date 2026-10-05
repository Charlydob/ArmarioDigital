"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Shirt,
  Sparkles,
  Images,
  UserRound,
  LogOut,
  CalendarDays,
} from "lucide-react";

const links = [
  ["/", "Inicio", Home],
  ["/armario", "Armario", Shirt],
  ["/probar", "Probar", Sparkles],
  ["/conjuntos", "Conjuntos", Images],
  ["/calendario", "Agenda", CalendarDays],
  ["/poses", "Poses", UserRound],
] as const;
export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  };
  return (
    <div className="shell">
      <aside className="side">
        <Link href="/" className="brand">
          armario
          <br />
          <i>digital</i>
        </Link>
        <nav className="nav">
          {links.map(([href, label, Icon]) => (
            <Link
              key={href}
              href={href}
              className={
                path === href || (href !== "/" && path.startsWith(href))
                  ? "active"
                  : ""
              }
            >
              <Icon />
              {label}
            </Link>
          ))}
        </nav>
        <button className="btn btn-ghost logout" onClick={logout}>
          <LogOut size={18} /> Salir
        </button>
      </aside>
      <main className="main">{children}</main>
      <nav className="mobile-nav">
        {links.map(([href, label, Icon]) => (
          <Link key={href} href={href}>
            <Icon
              color={
                path === href || (href !== "/" && path.startsWith(href))
                  ? "#7a3f49"
                  : undefined
              }
            />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
