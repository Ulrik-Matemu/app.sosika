import { useEffect, useState } from "react";

export interface DropCountdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isLive: boolean;
}

/**
 * Countdown to the next occurrence of `targetDayOfWeek` (0=Sun..6=Sat) at
 * `targetHour`. Extracted from BiryaniPage's Friday-drop countdown so any
 * "drop" surface (Home teaser, Search teaser, the drop screen itself) can
 * share one implementation instead of re-deriving the target date per page.
 */
export function useDropCountdown(targetDayOfWeek = 5, targetHour = 12): DropCountdown {
  const [countdown, setCountdown] = useState<DropCountdown>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isLive: false,
  });

  useEffect(() => {
    const getNextTarget = (): Date => {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const target = new Date(now);

      if (dayOfWeek === targetDayOfWeek && now.getHours() < 22) {
        return now;
      }

      let daysUntil = (targetDayOfWeek - dayOfWeek + 7) % 7;
      if (daysUntil === 0) daysUntil = 7;

      target.setDate(now.getDate() + daysUntil);
      target.setHours(targetHour, 0, 0, 0);
      return target;
    };

    const update = () => {
      const now = new Date();
      if (now.getDay() === targetDayOfWeek) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0, isLive: true });
        return;
      }

      const diffMs = getNextTarget().getTime() - now.getTime();
      if (diffMs <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0, isLive: true });
        return;
      }

      setCountdown({
        days: Math.floor(diffMs / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diffMs / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diffMs / (1000 * 60)) % 60),
        seconds: Math.floor((diffMs / 1000) % 60),
        isLive: false,
      });
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetDayOfWeek, targetHour]);

  return countdown;
}
