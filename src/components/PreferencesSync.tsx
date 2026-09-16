import { useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme, ThemeMode, SurfaceStyle } from "../context/ThemeContext";

const THEME_MODES: ThemeMode[] = ["system", "light", "dark"];
const SURFACES: SurfaceStyle[] = ["glass", "solid"];

/**
 * Pulls saved appearance preferences down onto a newly signed-in device.
 *
 * Preferences always live in localStorage, so they work for guests. When
 * someone signs in, the account's stored choice is the one they last made
 * deliberately, so it wins once per session — but only once, or it would fight
 * any change they make afterwards on this device.
 *
 * Renders nothing; it exists so ThemeProvider (which sits above the router and
 * knows nothing about auth) stays independent of Firebase.
 */
export default function PreferencesSync() {
  const { user, profile } = useAuth();
  const { setMode, setSurface } = useTheme();
  const appliedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      appliedFor.current = null;
      return;
    }
    if (!profile?.prefs || appliedFor.current === user.uid) return;

    appliedFor.current = user.uid;
    const { theme, surface } = profile.prefs;
    if (theme && THEME_MODES.includes(theme as ThemeMode)) setMode(theme as ThemeMode);
    if (surface && SURFACES.includes(surface as SurfaceStyle)) setSurface(surface as SurfaceStyle);
  }, [user, profile, setMode, setSurface]);

  return null;
}
