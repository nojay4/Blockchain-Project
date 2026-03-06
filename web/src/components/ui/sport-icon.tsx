"use client"

import { Icon, type IconNode, Trophy, HandFist } from "lucide-react"
import {
  soccerBall,
  basketball,
  tennisBall,
  volleyball,
  hockey,
  iceHockey,
  football,
} from "@lucide/lab"
import { cn } from "@/lib/utils"

/** Sport icon: either a Lucide React component or a Lab iconNode (for <Icon iconNode={...} />). */
type SportIconType = React.ComponentType<{ className?: string }> | IconNode

/**
 * Sport slug -> icon. Football = soccer (soccer ball). Basketball, tennis, etc. from @lucide/lab.
 * Boxing/MMA/fighting use HandFist; default Trophy.
 */
const SPORT_ICONS: Record<string, SportIconType> = {
  soccer: soccerBall,
  "soccer-ball": soccerBall,
  football: soccerBall,
  basketball,
  tennis: tennisBall,
  "tennis-ball": tennisBall,
  volleyball,
  hockey,
  "ice-hockey": iceHockey,
  "american-football": football,
  "football-helmet": football,
  fighting: HandFist,
  mma: HandFist,
  boxing: HandFist,
}

function getSportIcon(sportSlug: string | undefined): SportIconType {
  if (!sportSlug) return Trophy
  return SPORT_ICONS[sportSlug] ?? Trophy
}

function isIconNode(icon: SportIconType): icon is IconNode {
  return Array.isArray(icon)
}

export interface SportIconProps {
  sportSlug?: string
  className?: string
}

/** Renders the same sport icon used in event cards; Trophy when slug is missing or unknown. */
export function SportIcon({ sportSlug, className }: SportIconProps) {
  const icon = getSportIcon(sportSlug)
  const iconClassName = cn("shrink-0", className)
  if (isIconNode(icon)) {
    return <Icon iconNode={icon} className={iconClassName} />
  }
  const Comp = icon as React.ComponentType<{ className?: string }>
  return <Comp className={iconClassName} />
}
