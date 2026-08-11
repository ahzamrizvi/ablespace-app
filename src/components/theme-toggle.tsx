"use client";

import { MoonStar, SunMedium } from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Button } from "./ui/button";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = resolvedTheme ?? theme;

  if (!mounted) {
    return <Button type="button" variant="secondary" size="sm" aria-hidden="true" disabled>Theme</Button>;
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={() => setTheme(currentTheme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
    >
      {currentTheme === "dark" ? <SunMedium size={16} /> : <MoonStar size={16} />}
      {currentTheme === "dark" ? "Light" : "Dark"}
    </Button>
  );
}
