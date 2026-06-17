"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, CheckSquare, Upload, BarChart2, Settings } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Dashboard", icon: Activity },
  { href: "/checklist", label: "Checklist", icon: CheckSquare },
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Nav() {
  const path = usePathname();
  return (
    <>
      <header className="bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 border-b border-border sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2">
              <span className="text-primary font-bold text-lg">🏃</span>
              <span className="font-bold text-sm tracking-tight">Sub-50 Project</span>
            </div>
            <div className="flex items-center gap-1">
              <nav className="hidden sm:flex items-center gap-1">
                {links.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                      path === href
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                  >
                    <Icon size={15} />
                    {label}
                  </Link>
                ))}
              </nav>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
        <div className="grid grid-cols-5">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2.5 text-xs font-medium transition-colors",
                path === href ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
