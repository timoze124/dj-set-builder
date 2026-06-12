import { NextResponse } from "next/server";
import OpenAI from "openai";
import type { GeneratedSet, SetInput, Track } from "@/lib/types";

export const runtime = "nodejs";

const keys = ["8A", "9A", "10A", "11A", "12A", "1A", "2A", "8B", "9B", "10B", "11B"];

type SpotifyCandidate = {
  title: string;
  artist: string;
  spotifyId: string;
  spotifyUrl: string;
  releaseDate: string;
  popularity: number;
  trendScore: number;
  source: "spotify";
};

const fallbackTracks: Record<string, Array<[string, string]>> = {
  Pop: [
    ["Levitating", "Dua Lipa"],
    ["As It Was", "Harry Styles"],
    ["Espresso", "Sabrina Carpenter"],
    ["greedy", "Tate McRae"],
    ["Bad Guy", "Billie Eilish"],
    ["Starboy", "The Weeknd"]
  ],
  "Hip-Hop / Rap": [
    ["SICKO MODE", "Travis Scott"],
    ["God's Plan", "Drake"],
    ["HUMBLE.", "Kendrick Lamar"],
    ["Doja", "Central Cee"],
    ["N95", "Kendrick Lamar"]
  ],
  Trap: [
    ["Mask Off", "Future"],
    ["Bad and Boujee", "Migos"],
    ["goosebumps", "Travis Scott"],
    ["Bank Account", "21 Savage"]
  ],
  "Latin Pop": [
    ["Hips Don't Lie", "Shakira"],
    ["Bailando", "Enrique Iglesias"],
    ["La Bachata", "Manuel Turizo"],
    ["Despacito", "Luis Fonsi"]
  ],
  Reggaeton: [
    ["Tití Me Preguntó", "Bad Bunny"],
    ["Yandel 150", "Yandel & Feid"],
    ["Provenza", "Karol G"],
    ["LALA", "Myke Towers"]
  ],
  "EDM / Dance": [
    ["Animals", "Martin Garrix"],
    ["Titanium", "David Guetta feat. Sia"],
    ["Wake Me Up", "Avicii"],
    ["The Business", "Tiësto"]
  ],
  House: [
    ["Move", "Adam Port, Stryv & Keinemusik"],
    ["Marea", "Fred again.. & The Blessed Madonna"],
    ["Losing It", "FISHER"],
    ["Where You Are", "John Summit"]
  ],
  Afrobeats: [
    ["Essence", "Wizkid feat. Tems"],
    ["Last Last", "Burna Boy"],
    ["Calm Down", "Rema"],
    ["Rush", "Ayra Starr"],
    ["Peru", "Fireboy DML"]
  ],
  Amapiano: [
    ["Tanzania", "Uncle Waffles"],
    ["Mnike", "Tyler ICU"],
    ["Adiwele", "Young Stunna"],
    ["Ke Star", "Focalistic"]
  ],
  "R&B": [
    ["Kill Bill", "SZA"],
    ["Crew", "GoldLink feat. Brent Faiyaz"],
    ["Exchange", "Bryson Tiller"],
    ["Location", "Khalid"]
  ],
  Soul: [
    ["Coming Home", "Leon Bridges"],
    ["Leave The Door Open", "Silk Sonic"],
    ["Redbone", "Childish Gambino"],
    ["Get You", "Daniel Caesar"]
  ],
  Rock: [
    ["The Pretender", "Foo Fighters"],
    ["Mr. Brightside", "The Killers"],
    ["Do I Wanna Know?", "Arctic Monkeys"],
    ["Sex on Fire", "Kings of Leon"]
  ],
  "Alternative Rock": [
    ["The Less I Know The Better", "Tame Impala"],
    ["Somebody Else", "The 1975"],
    ["Last Nite", "The Strokes"],
    ["Heat Waves", "Glass Animals"]
  ],
  "K-Pop": [
    ["Dynamite", "BTS"],
    ["How You Like That", "BLACKPINK"],
    ["Super Shy", "NewJeans"],
    ["God's Menu", "Stray Kids"]
  ],
  Country: [
    ["Last Night", "Morgan Wallen"],
    ["Fast Car", "Luke Combs"],
    ["Something in the Orange", "Zach Bryan"],
    ["A Bar Song", "Shaboozey"]
  ],
  Metal: [
    ["Enter Sandman", "Metallica"],
    ["Duality", "Slipknot"],
    ["Can You Feel My Heart", "Bring Me The Horizon"],
    ["The Summoning", "Sleep Token"]
  ],
  Punk: [
    ["Basket Case", "Green Day"],
    ["All The Small Things", "blink-182"],
    ["Self Esteem", "The Offspring"],
    ["American Idiot", "Green Day"]
  ]
};

function phaseForIndex(i: number): Track["phase"] {
  if (i < 8) return "Warm-up";
  if (i < 18) return "Build";
  if (i < 32) return "Groove";
  if (i < 42) return "Peak";
  if (i < 47) return "Reset";
  return "Closing";
}

function validate(input: SetInput) {
  if (!input.genre || !input.place || !input.time) return false;
  if (!Number.isFinite(input.minBpm) || !Number.isFinite(input.maxBpm)) return false;
  if (input.minBpm < 50 || input.maxBpm > 220 || input.minBpm >= input.maxBpm) return false;
  return true;
}

function calculateTrendScore(popularity: number, releaseDate: string) {
  const releaseYear = Number(releaseDate.slice(0, 4));
  const currentYear = new Date().getFullYear();

  let recencyBonus = 0;

  if (releaseYear === currentYear) recencyBonus = 20;
  else if (releaseYear === currentYear - 1) recencyBonus = 12;
  else if (releaseYear === currentYear - 2) recencyBonus = 6;

  return Math.min(100, popularity + recencyBonus);
}

async function getSpotifyAccessToken() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });

  if (!response.ok) {
    console.error("Spotify token error:", await response.text());
    return null;
  }

  const data = await response.json();
  return data.access_token as string;
}

function getSpotifySearchQueries(genre: string) {
  const currentYear = new Date().getFullYear();

  const genreMap: Record<string, string[]> = {
    Pop: ["pop hits", "dance pop", "global pop"],
    "Hip-Hop / Rap": ["hip hop hits", "rap hits", "trap rap"],
    Trap: ["trap hits", "trap rap", "southern trap"],
    "Latin Pop": ["latin pop hits", "latin pop", "spanish pop"],
    Reggaeton: ["reggaeton hits", "latin urban", "reggaeton"],
    "EDM / Dance": ["edm hits", "dance hits", "electronic dance"],
    House: ["house music", "tech house", "afro house"],
    Afrobeats: ["afrobeats hits", "afropop", "afro fusion"],
    Amapiano: ["amapiano hits", "south african amapiano", "amapiano"],
    "R&B": ["r&b hits", "contemporary r&b", "alternative r&b"],
    Soul: ["soul", "neo soul", "modern soul"],
    Rock: ["rock hits", "modern rock", "alternative rock"],
    "Alternative Rock": ["alternative rock", "indie rock", "modern alternative"],
    "K-Pop": ["k-pop hits", "kpop", "korean pop"],
    Country: ["country hits", "country pop", "modern country"],
    Metal: ["metal hits", "metalcore", "modern metal"],
    Punk: ["punk rock", "pop punk", "modern punk"]
  };

  const baseQueries = genreMap[genre] || [genre];

  return [
    ...baseQueries.map((q) => `${q} year:${currentYear}`),
    ...baseQueries.map((q) => `${q} year:${currentYear - 1}`),
    ...baseQueries.map((q) => `${q} trending`),
    ...baseQueries.map((q) => `${q} viral`),
    ...baseQueries.map((q) => `${q} hits`)
  ];
}

async function fetchSpotifyCandidates(genre: string): Promise<SpotifyCandidate[]> {
  const token = await getSpotifyAccessToken();

  if (!token) {
    return [];
  }

  const queries = getSpotifySearchQueries(genre);
  const allTracks: SpotifyCandidate[] = [];

  for (const query of queries) {
    const url = new URL("https://api.spotify.com/v1/search");
    url.searchParams.set("q", query);
    url.searchParams.set("type", "track");
    url.searchParams.set("limit", "10");
    url.searchParams.set("market", "CH");

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      console.error("Spotify search error:", await response.text());
      continue;
    }

    const data = await response.json();

    const tracks = data.tracks.items.map((item: any) => {
      const releaseDate = item.album?.release_date || "";
      const popularity = item.popularity || 0;

      return {
        title: item.name,
        artist: item.artists?.map((artist: any) => artist.name).join(", ") || "Unknown Artist",
        spotifyId: item.id,
        spotifyUrl: item.external_urls?.spotify || "",
        releaseDate,
        popularity,
        trendScore: calculateTrendScore(popularity, releaseDate),
        source: "spotify" as const
      };
    });

    allTracks.push(...tracks);
  }

  const uniqueTracks = new Map<string, SpotifyCandidate>();

  for (const track of allTracks) {
    if (!uniqueTracks.has(track.spotifyId)) {
      uniqueTracks.set(track.spotifyId, track);
    }
  }

  return Array.from(uniqueTracks.values())
    .sort((a, b) => b.trendScore - a.trendScore)
    .slice(0, 150);
}

function fallbackGenerate(input: SetInput): GeneratedSet {
  const base = fallbackTracks[input.genre] || fallbackTracks.Pop;

  const tracks: Track[] = Array.from({ length: 50 }).map((_, i) => {
    const [title, artist] = base[i % base.length];
    const phase = phaseForIndex(i);
    const bpm = Math.round(input.minBpm + ((input.maxBpm - input.minBpm) * i) / 49);

    const energyByPhase: Record<Track["phase"], number> = {
      "Warm-up": 3,
      Build: 5,
      Groove: 6,
      Peak: 8,
      Reset: 5,
      Closing: 4
    };

    return {
      number: i + 1,
      title,
      artist,
      bpm,
      key: keys[i % keys.length],
      energy: energyByPhase[phase],
      phase,
      vibe: `${input.place}, ${input.time}`,
      transition: phase === "Peak" ? "Hook oder Drop sauber ausspielen" : "smooth mixen, Energie kontrollieren",
      reason: "Fallback-Track, falls Spotify oder OpenAI nicht verfügbar ist."
    };
  });

  return {
    setTitle: `${input.genre} ${input.place} Set`,
    setVibe: `${input.genre} passend für ${input.place} bei ${input.time}`,
    bpmRange: `${input.minBpm}-${input.maxBpm}`,
    energyCurve: "3 → 8 → 4",
    tracks
  };
}

export async function POST(request: Request) {
  const input = (await request.json()) as SetInput;

  if (!validate(input)) {
    return NextResponse.json({ error: "Ungültige Eingabe." }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      ...fallbackGenerate(input),
      warning: "OPENAI_API_KEY fehlt. Es wurden Fallback-Daten verwendet."
    });
  }

  try {
    const spotifyCandidates = await fetchSpotifyCandidates(input.genre);

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const prompt = `
Du bist ein professioneller DJ-Set-Kurator.

Input:
- Genre: ${input.genre}
- Ort: ${input.place}
- Tagesphase/Uhrzeit: ${input.time}
- BPM-Bereich: ${input.minBpm}-${input.maxBpm}

Hier ist eine Liste echter Spotify-Kandidaten:
${JSON.stringify(spotifyCandidates)}

Aufgabe:
- Erstelle ein DJ-Set mit exakt 50 Songs.
- Wenn die Spotify-Kandidatenliste mindestens 50 Songs enthält, MUSST du ausschließlich Songs aus dieser Liste verwenden.
- Erfinde keine Tracknamen, keine Artists, keine spotifyId und keine spotifyUrl.
- Übernimm title, artist, spotifyId, spotifyUrl, releaseDate, popularity und trendScore exakt aus der Spotify-Kandidatenliste.
- Songs ohne spotifyId oder spotifyUrl sind nur erlaubt, wenn die Spotify-Kandidatenliste leer ist.
- Bevorzuge Songs mit hohem trendScore.
- Bevorzuge Songs mit hoher popularity.
- Bevorzuge neue Songs mit aktuellem releaseDate.
- Baue eine DJ-Dramaturgie: Warm-up, Build, Groove, Peak, Reset, Closing.
- Sortiere die Songs passend für Ort und Tagesphase.
- Halte die BPM-Werte zwischen ${input.minBpm} und ${input.maxBpm}.
- Gib für jeden Track spotifyId, spotifyUrl, releaseDate, popularity, trendScore und source zurück. Wenn der Track aus Spotify stammt, müssen diese Werte exakt aus der Kandidatenliste übernommen werden.
- Wenn Spotify keine Key-Information liefert, schätze eine plausible Camelot-Key-Notation.
- Gib für jeden Track spotifyId, spotifyUrl, releaseDate, popularity, trendScore und source zurück, falls vorhanden.
- Antwort nur als gültiges JSON.
`;

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      input: prompt,
      text: {
        format: {
          type: "json_schema",
          name: "dj_set",
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["setTitle", "setVibe", "bpmRange", "energyCurve", "tracks"],
            properties: {
              setTitle: { type: "string" },
              setVibe: { type: "string" },
              bpmRange: { type: "string" },
              energyCurve: { type: "string" },
              tracks: {
                type: "array",
                minItems: 50,
                maxItems: 50,
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: [
                    "number",
                    "title",
                    "artist",
                    "bpm",
                    "key",
                    "energy",
                    "phase",
                    "vibe",
                    "transition",
                    "reason",
                    "spotifyId",
                    "spotifyUrl",
                    "releaseDate",
                    "popularity",
                    "trendScore",
                    "source"
                  ],
                  properties: {
                    number: { type: "number" },
                    title: { type: "string" },
                    artist: { type: "string" },
                    bpm: { type: "number" },
                    key: { type: "string" },
                    energy: { type: "number" },
                    phase: { enum: ["Warm-up", "Build", "Groove", "Peak", "Reset", "Closing"] },
                    vibe: { type: "string" },
                    transition: { type: "string" },
                    reason: { type: "string" },
                    spotifyId: { type: "string" },
                    spotifyUrl: { type: "string" },
                    releaseDate: { type: "string" },
                    popularity: { type: "number" },
                    trendScore: { type: "number" },
                    source: { type: "string" }
                  }
                }
              }
            }
          }
        }
      }
    });

    const raw = response.output_text;
    const data = JSON.parse(raw) as GeneratedSet;

    return NextResponse.json({
      ...data,
      candidateCount: spotifyCandidates.length
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json({
      ...fallbackGenerate(input),
      warning: "Spotify/OpenAI-Generierung fehlgeschlagen. Es wurden Fallback-Daten verwendet."
    });
  }
}
