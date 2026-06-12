export type Track = {
  number: number;
  title: string;
  artist: string;
  bpm: number;
  key: string;
  energy: number;
  phase: "Warm-up" | "Build" | "Groove" | "Peak" | "Reset" | "Closing";
  vibe: string;
  transition: string;
  reason?: string;

  spotifyId?: string;
  spotifyUrl?: string;
  releaseDate?: string;
  popularity?: number;
  trendScore?: number;
  source?: "spotify" | "openai" | "fallback";
};
