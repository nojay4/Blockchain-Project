"use client";

import { useEffect, useState } from "react";
import { Trophy, LayoutList } from "lucide-react";
import { getSports } from "@/lib/api";
import type { Sport } from "@/types/sports";
import type { MenuItem } from "@/components/ui/shadcnblocks-com-navbar1";
import { Navbar1 } from "@/components/ui/shadcnblocks-com-navbar1";

const defaultLeaguesItems: MenuItem[] = [
  { title: "NFL", description: "National Football League", icon: <LayoutList className="size-5 shrink-0" />, url: "#" },
  { title: "NBA", description: "National Basketball Association", icon: <LayoutList className="size-5 shrink-0" />, url: "#" },
  { title: "MLB", description: "Major League Baseball", icon: <LayoutList className="size-5 shrink-0" />, url: "#" },
];

function buildMenu(sports: Sport[] | null): MenuItem[] {
  const sportsItems: MenuItem[] =
    sports === null
      ? [{ title: "Loading…", icon: <Trophy className="size-5 shrink-0" />, url: "#" }]
      : sports.map((s) => ({
          title: s.name,
          url: `#sport-${s.slug}`,
          icon: <Trophy className="size-5 shrink-0" />,
        }));

  return [
    { title: "Home", url: "/" },
    { title: "Sports", url: "#", items: sportsItems },
    { title: "Leagues", url: "#", items: defaultLeaguesItems },
  ];
}

export function AppNavbar() {
  const [sports, setSports] = useState<Sport[] | null>(null);

  useEffect(() => {
    getSports()
      .then(setSports)
      .catch(() => setSports([]));
  }, []);

  const menu = buildMenu(sports);

  return <Navbar1 menu={menu} />;
}
