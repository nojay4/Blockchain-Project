"use client"

import { useEffect, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { buttonVariants } from "@/components/ui/button"
import { Calendar, Clock } from "lucide-react"
import { SportIcon } from "@/components/ui/sport-icon"
import { cn } from "@/lib/utils"

interface EventCountdownCardProps {
  title?: string
  date?: Date
  /** Optional image URL; when omitted and sportSlug is set, a sport icon is shown instead. */
  image?: string
  /** Sport slug for icon (e.g. "basketball", "american-football"). When set and no image, icon is shown. */
  sportSlug?: string
  /** League/sport line (e.g. "USA - NBA · Basketball") */
  subtitle?: string
  onJoin?: () => void
  enableAnimations?: boolean
  className?: string
}

export function EventCountdownCard({
  title = "React & AI Workshop",
  date,
  image,
  sportSlug,
  subtitle,
  onJoin,
  enableAnimations = true,
  className,
}: EventCountdownCardProps) {
  const [eventDate] = useState(() =>
    date || new Date(Date.now() + 2 * 24 * 3600 * 1000 + 5 * 3600 * 1000 + 30 * 60 * 1000)
  )

  const [timeLeft, setTimeLeft] = useState(() => {
    const targetDate = date || eventDate
    return Math.max(0, Math.floor((+targetDate - Date.now()) / 1000))
  })
  const shouldReduceMotion = useReducedMotion()
  const shouldAnimate = enableAnimations && !shouldReduceMotion

  useEffect(() => {
    const targetDate = date || eventDate

    const update = () => {
      const remaining = Math.max(0, Math.floor((+targetDate - Date.now()) / 1000))
      setTimeLeft(remaining)
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [date, eventDate])

  const getTimeUnits = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return { days, hours, minutes, seconds: secs }
  }

  const { days, hours, minutes, seconds } = getTimeUnits(timeLeft)

  const containerVariants = {
    hidden: {
      opacity: 0,
      y: 40,
      scale: 0.95,
      filter: "blur(8px)",
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: "blur(0px)",
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
        mass: 0.8,
        staggerChildren: 0.08,
        delayChildren: 0.1,
      }
    },
    rest: {
      scale: 1,
      y: 0,
      filter: "blur(0px)",
    },
    hover: shouldAnimate ? {
      scale: 1.03,
      y: -6,
      filter: "blur(0px)",
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
        mass: 0.8,
      }
    } : {},
  }

  const numberVariants = {
    initial: { scale: 1, opacity: 1 },
    pulse: shouldAnimate ? {
      scale: [1, 1.15, 1],
      opacity: [1, 0.7, 1],
      transition: {
        duration: 1,
        repeat: Infinity,
        ease: "easeInOut"
      }
    } : {},
  }

  const childVariants = {
    hidden: {
      opacity: 0,
      y: 20,
      scale: 0.95,
      filter: "blur(4px)",
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: "blur(0px)",
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 28,
        mass: 0.6,
      },
    },
  }

  const buttonVariants_motion = {
    hidden: {
      opacity: 0,
      y: 15,
      scale: 0.9,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 25,
        mass: 0.7,
      },
    },
    rest: { scale: 1, y: 0 },
    hover: shouldAnimate ? {
      scale: 1.05,
      y: -2,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 25
      }
    } : {},
    tap: shouldAnimate ? { scale: 0.95 } : {},
  }

  return (
    <motion.div
      data-slot="event-countdown-card"
      initial={shouldAnimate ? "hidden" : "visible"}
      animate="visible"
      whileHover="hover"
      variants={containerVariants}
      className={cn(
        "relative w-80 rounded-2xl bg-card text-card-foreground overflow-hidden",
        "shadow-lg shadow-black/5 cursor-pointer group",
        className
      )}
    >
      <motion.div
        className="relative overflow-hidden"
        variants={shouldAnimate ? childVariants : {}}
      >
        {image ? (
          <motion.img
            src={image}
            alt={title}
            className="h-36 w-full object-cover"
            initial={{ scale: 1 }}
            whileHover={{ scale: 1.1 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        ) : (
          <div className="flex h-36 w-full items-center justify-center bg-muted/60">
            <motion.div
              initial={{ scale: 1 }}
              whileHover={{ scale: 1.1 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="flex items-center justify-center"
            >
              <SportIcon sportSlug={sportSlug} className="h-20 w-20 text-muted-foreground/70" />
            </motion.div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        {timeLeft > 0 && timeLeft < 86400 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold"
          >
            Starts Soon!
          </motion.div>
        )}
      </motion.div>

      <div className="p-6 space-y-4">
        <motion.div
          className="space-y-2"
          variants={shouldAnimate ? childVariants : {}}
        >
          <motion.h3
            className="text-xl font-bold leading-tight tracking-tight"
            initial={{ opacity: 0.9 }}
            whileHover={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {title}
          </motion.h3>

          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4 shrink-0" />
              <span>{(date || eventDate).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</span>
            </div>
            {subtitle ? (
              <div className="truncate" title={subtitle}>
                <span className="truncate">{subtitle}</span>
              </div>
            ) : null}
          </div>
        </motion.div>

        {timeLeft > 0 ? (
          <motion.div
            className="space-y-3"
            variants={shouldAnimate ? childVariants : {}}
          >
            <div className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Event starts in:</span>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {[
                { value: days, label: "Days" },
                { value: hours, label: "Hours" },
                { value: minutes, label: "Min" },
                { value: seconds, label: "Sec" },
              ].map((unit, index) => (
                <motion.div
                  key={unit.label}
                  variants={index === 3 ? numberVariants : {}}
                  initial="initial"
                  animate={index === 3 ? "pulse" : "initial"}
                  className="bg-muted/50 rounded-xl p-3 text-center border border-border/30"
                >
                  <div className="text-lg font-bold tabular-nums">
                    {unit.value.toString().padStart(2, "0")}
                  </div>
                  <div className="text-xs text-muted-foreground font-medium">
                    {unit.label}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            variants={shouldAnimate ? childVariants : {}}
            className="text-center py-4"
          >
            <div className="text-lg font-bold text-green-600">Event Started!</div>
            <div className="text-sm text-muted-foreground">Join now to participate</div>
          </motion.div>
        )}

        <motion.button
          onClick={onJoin}
          variants={buttonVariants_motion}
          initial={shouldAnimate ? "hidden" : "visible"}
          animate="visible"
          whileHover="hover"
          whileTap="tap"
          className={cn(
            buttonVariants({ variant: "default", size: "sm" }),
            "w-full h-10 rounded-md font-medium",
            "bg-green-600 text-white hover:bg-green-700",
            "focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
          )}
        >
          Place bet
        </motion.button>
      </div>
    </motion.div>
  )
}
