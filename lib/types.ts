export type SetInput = {
  genre: string;
  place: string;
  time: string;
  minBpm: number;
  maxBpm: number;
};

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

export type GeneratedSet = {
  setTitle: string;
  setVibe: string;
  bpmRange: string;
  energyCurve: string;
  tracks: Track[];
};
