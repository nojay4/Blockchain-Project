"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Trophy, LayoutList } from "lucide-react";
import { getSports, getLeagues } from "@/lib/api";
import type { Sport, League } from "@/types/sports";
import { getDefaultLeagueForSport } from "@/lib/sports-defaults";
import type { MenuItem } from "@/components/ui/shadcnblocks-com-navbar1";
import { Navbar1 } from "@/components/ui/shadcnblocks-com-navbar1";
import { SportIcon } from "@/components/ui/sport-icon";

function getCurrentSportFromPath(pathname: string | null): string | null {
  if (!pathname || !pathname.startsWith("/sports/")) return null;
  const segments = pathname.slice("/sports/".length).split("/").filter(Boolean);
  return segments[0] ?? null;
}

export function AppNavbar() {
  const pathname = usePathname();
  const currentSportSlug = getCurrentSportFromPath(pathname);

  const [sports, setSports] = useState<Sport[] | null>(null);
  const [leagues, setLeagues] = useState<League[] | null>(null);
  const [leaguesLoading, setLeaguesLoading] = useState(false);

  useEffect(() => {
    getSports()
      .then(setSports)
      .catch(() => setSports([]));
  }, []);

  useEffect(() => {
    if (!currentSportSlug) {
      setLeagues(null);
      return;
    }
    setLeaguesLoading(true);
    setLeagues(null);
    getLeagues(currentSportSlug)
      .then(setLeagues)
      .catch(() => setLeagues([]))
      .finally(() => setLeaguesLoading(false));
  }, [currentSportSlug]);

  const sportsItems: MenuItem[] =
    sports === null
      ? [{ title: "Loading…", icon: <Trophy className="size-5 shrink-0" />, url: "#" }]
      : sports.map((s) => {
          const defaultLeague = getDefaultLeagueForSport(s.slug);
          const url = defaultLeague
            ? `/sports/${s.slug}/${defaultLeague}`
            : `/sports/${s.slug}`;
          return {
            title: s.name,
            url,
            icon: <SportIcon sportSlug={s.slug} className="size-5 shrink-0" />,
          };
        });

  const leaguesItems: MenuItem[] = (() => {
    if (!currentSportSlug) {
      return [];
    }
    const allLeaguesItem: MenuItem = {
      title: "All leagues",
      description: "Show all leagues for this sport",
      icon: <LayoutList className="size-5 shrink-0" />,
      url: `/sports/${currentSportSlug}`,
    };
    if (leaguesLoading || leagues === null) {
      return [{ title: "Loading…", icon: <LayoutList className="size-5 shrink-0" />, url: "#" }];
    }
    const leagueLinks: MenuItem[] = leagues.map((l) => ({
      title: l.name,
      description: l.slug,
      icon: <LayoutList className="size-5 shrink-0" />,
      url: `/sports/${currentSportSlug}/${l.slug}`,
    }));
    return [allLeaguesItem, ...leagueLinks];
  })();

  const leaguesMenuItem: MenuItem = {
    title: "Leagues",
    url: "#",
    items: currentSportSlug ? leaguesItems : [],
    disabled: !currentSportSlug,
  };

  const menu: MenuItem[] = [
    { title: "Home", url: "/" },
    { title: "Sports", url: "#", items: sportsItems },
    leaguesMenuItem,
  ];

  return <Navbar1 menu={menu} />;
}
