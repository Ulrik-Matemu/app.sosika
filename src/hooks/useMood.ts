import { create } from "zustand";

interface MoodState {
  mood: string;
  setMood: (mood: string) => void;
}

export const useMood = create<MoodState>((set) => ({
  mood: "",
  setMood: (mood) => set({ mood }),
}));
