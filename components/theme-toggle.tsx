"use client";

import * as React from "react";
import { Moon, Sun, Laptop } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Toggle theme">
          {mounted && theme === "dark" ? <Moon size={16} /> : mounted && theme === "light" ? <Sun size={16} /> : <Laptop size={16} />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")} active={theme === "light"}>
          <Sun size={14} /> Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")} active={theme === "dark"}>
          <Moon size={14} /> Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")} active={theme === "system"}>
          <Laptop size={14} /> System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
