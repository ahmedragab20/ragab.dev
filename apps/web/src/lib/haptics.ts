import { useCallback, useEffect, useMemo, useRef } from "react";
import type { HapticInput } from "web-haptics";
import { useWebHaptics } from "web-haptics/react";
import type { ShellSettings } from "@ragab/ui";

/**
 * Settings-gated haptic facade over web-haptics.
 *
 * Every trigger is a silent no-op when the setting is off or the device
 * doesn't support vibration (desktop macOS / iOS Safari), so callers can
 * fire freely. Presets map to iOS-style feedback generators:
 * light/medium = impact, selection = selection change, success/warning/error = notifications.
 */
export function useHaptics(settings: ShellSettings) {
  // debug:true enables web-haptics' audio fallback — desktop (no navigator.vibrate)
  // and iOS Safari otherwise render every trigger a silent no-op. Vibration still
  // fires where the platform supports it; the sound is the desktop equivalent.
  const { trigger, isSupported } = useWebHaptics({ debug: true });

  // Read the latest setting without invalidating the stable fire callback
  const enabledRef = useRef(settings.haptics);
  const volumeRef = useRef(settings.volume);
  useEffect(() => {
    enabledRef.current = settings.haptics;
    volumeRef.current = settings.volume;
  }, [settings.haptics, settings.volume]);

  const fire = useCallback(
    (input: HapticInput) => {
      if (!enabledRef.current) return;
      // intensity (0-1) drives both the audio gain and vibration strength
      void trigger(input, { intensity: volumeRef.current / 100 });
    },
    [trigger],
  );

  /** Trigger at an explicit level (0-1) — e.g. arrow-key volume scrubbing. */
  const fireAt = useCallback(
    (input: HapticInput, intensity: number) => {
      if (!enabledRef.current) return;
      void trigger(input, { intensity });
    },
    [trigger],
  );

  return useMemo(
    () => ({
      /** Minor impact — plain taps, running commands, clearing. */
      tap: () => fire("light"),
      /** Selection change — completion picks, vim mode switches. */
      select: () => fire("selection"),
      /** Per-keystroke micro-tap while typing. */
      type: () => fire("selection"),
      /** Moderate impact — opening posts / leaving the site. */
      nav: () => fire("medium"),
      /** Positive outcome — settings/theme commits, copy success. */
      success: () => fire("success"),
      /** Attention — no matches, ambiguous input. */
      warn: () => fire("warning"),
      /** Failure — unknown command, bad argument. */
      error: () => fire("error"),
      /** Does this browser/device expose the vibration API? */
      supported: isSupported,
      fireAt,
    }),
    [fire, fireAt, isSupported],
  );
}
