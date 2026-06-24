import { gooeyToast } from "goey-toast";
import { Loader2Icon } from "lucide-react";
import React from "react";

const playNotificationSound = () => {
  if (typeof window === "undefined") return;
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = audioCtx.currentTime;

    // Pleasant high-quality synthesizer chime sound (C5 -> E5 -> G5)
    const playNote = (freq: number, start: number, duration: number, volume: number) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);
      
      gain.gain.setValueAtTime(volume, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start(start);
      osc.stop(start + duration);
    };

    playNote(523.25, now, 0.15, 0.05); // C5
    playNote(659.25, now + 0.06, 0.15, 0.04); // E5
    playNote(783.99, now + 0.12, 0.25, 0.03); // G5
  } catch (e) {
    // Ignore audio issues
  }
};

export const toast = {
  success: (message: string, options?: any) => {
    playNotificationSound();
    return gooeyToast.success(message, { preset: "bouncy", ...options });
  },
  error: (message: string, options?: any) => {
    playNotificationSound();
    return gooeyToast.error(message, { preset: "bouncy", ...options });
  },
  info: (message: string, options?: any) => {
    playNotificationSound();
    return gooeyToast.info(message, { preset: "bouncy", ...options });
  },
  warning: (message: string, options?: any) => {
    playNotificationSound();
    return gooeyToast.warning(message, { preset: "bouncy", ...options });
  },
  loading: (message: string, options?: any) => {
    // No sound for loading, but show a spinner icon
    return gooeyToast(message, {
      preset: "bouncy",
      ...options,
      icon: <Loader2Icon className="size-4 animate-spin text-primary" />,
      duration: 100000, // keep open until dismissed
    });
  },
  dismiss: (id?: string | number) => {
    return gooeyToast.dismiss(id);
  },
  custom: (message: string, options?: any) => {
    playNotificationSound();
    return gooeyToast(message, { preset: "bouncy", ...options });
  }
};
