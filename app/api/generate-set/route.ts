import { NextResponse } from "next/server";
import OpenAI from "openai";
import type { GeneratedSet, SetInput, Track } from "@/lib/types";

export const runtime = "nodejs";

const keys = ["8A", "9A", "10A", "11A", "12A", "1A", "2A", "8B", "9B", "10B", "11B"];

const fallbackTracks: Record<string, Array<[string, string]>> = {
  "Afrobeats": [
    ["Essence", "Wizkid feat. Tems"], ["Last Last", "Burna Boy"], ["Calm Down", "Rema"],
    ["Rush", "Ayra Starr"], ["Peru", "Fireboy DML"], ["Monalisa", "Lojay & Sarz"],
    ["Sungba", "Asake"], ["Understand", "Omah Lay"], ["Free Mind", "Tems"],
    ["For My Hand", "Burna Boy feat. Ed Sheeran"], ["People", "Libianca"], ["Charm", "Rema"]
  ],
  "Amapiano": [
    ["Tanzania", "Uncle Waffles"], ["Mnike", "Tyler ICU"], ["Banyana", "DJ Maphorisa & Tyler ICU"],
    ["Adiwele", "Young Stunna"], ["Ke Star", "Focalistic"], ["Abo Mvelo", "Daliwonga"]
  ],
  "Reggaeton": [
    ["Tití Me Preguntó", "Bad Bunny"], ["Yandel 150", "Yandel & Feid"], ["Provenza", "Karol G"],
    ["Desesperados", "Rauw Alejandro"], ["DAKITI", "Bad Bunny & Jhayco"], ["LALA", "Myke Towers"]
  ],
  "House": [
    ["Move", "Adam Port, Stryv & Keinemusik"], ["Marea", "Fred again.. & The Blessed Madonna"],
    ["Losing It", "FISHER"], ["Ferrari", "James Hype & Miggy Dela Rosa"], ["Where You Are", "John Summit"],
    ["Cola", "CamelPhat & Elderbrook"]
  ],
  "EDM / Dance": [
    ["Animals", "Martin Garrix"], ["Titanium", "David Guetta feat. Sia"], ["Wake Me Up", "Avicii"],
    ["Don't You Worry Child", "Swedish House Mafia"], ["The Business", "Tiësto"], ["Summer", "Calvin Harris"]
  ],
  "Hip-Hop / Rap": [
    ["SICKO MODE", "Travis Scott"], ["God's Plan", "Drake"], ["HUMBLE.", "Kendrick Lamar"],
    ["Doja", "Central Cee"], ["Without Me", "Eminem"], ["N95", "Kendrick Lamar"]
  ],
  "Trap": [
    ["Mask Off", "Future"], ["Bad and Boujee", "Migos"], ["goosebumps", "Travis Scott"],
    ["Ric Flair Drip", "Offset & Metro Boomin"], ["Bank Account", "21 Savage"], ["Magnolia", "Playboi Carti"]
  ],
  "R&B": [
    ["Kill Bill", "SZA"], ["Blinding Lights", "The Weeknd"], ["Crew", "GoldLink feat. Brent Faiyaz"],
    ["Exchange", "Bryson Tiller"], ["Come Through", "H.E.R. feat. Chris Brown"], ["Location", "Khalid"]
  ],
  "Soul": [
    ["Coming Home", "Leon Bridges"], ["Girl On Fire", "Alicia Keys"], ["Leave The Door Open", "Silk Sonic"],
    ["Focus", "H.E.R."], ["Redbone", "Childish Gambino"], ["Brown Skin Girl", "Beyoncé"]
  ],
  "Pop": [
    ["Levitating", "Dua Lipa"], ["As It Was", "Harry Styles"], ["Espresso", "Sabrina Carpenter"],
    ["greedy", "Tate McRae"], ["Bad Guy", "Billie Eilish"], ["Starboy", "The Weeknd"]
  ],
  "Latin Pop": [
    ["Hips Don't Lie", "Shakira"], ["Bailando", "Enrique Iglesias"], ["Vida de Rico", "Camilo"],
    ["Tacones Rojos", "Sebastián Yatra"], ["La Bachata", "Manuel Turizo"], ["Despacito", "Luis Fonsi"]
  ],
  "Rock": [
    ["The Pretender", "Foo Fighters"], ["Mr. Brightside", "The Killers"], ["Do I Wanna Know?", "Arctic Monkeys"],
    ["Sex on Fire", "Kings of Leon"], ["Seven Nation Army", "The White Stripes"], ["Uprising", "Muse"]
  ],
  "Alternative Rock": [
    ["The Less I Know The Better", "Tame Impala"], ["Somebody Else", "The 1975"], ["Last Nite", "The Strokes"],
    ["Heat Waves", "Glass Animals"], ["Beggin'", "Måneskin"], ["Creep", "Radiohead"]
  ],
  "K-Pop": [
    ["Dynamite", "BTS"], ["How You Like That", "BLACKPINK"], ["Super Shy", "NewJeans"],
    ["God's Menu", "Stray Kids"], ["ANTIFRAGILE", "LE SSERAFIM"], ["HOT", "SEVENTEEN"]
  ],
  "Country": [
    ["Last Night", "Morgan Wallen"], ["Fast Car", "Luke Combs"], ["Something in the Orange", "Zach Bryan"],
    ["Need You Now", "Lady A"], ["Wagon Wheel", "Darius Rucker"], ["A Bar Song", "Shaboozey"]
  ],
  "Metal": [
    ["Enter Sandman", "Metallica"], ["Duality", "Slipknot"], ["Can You Feel My Heart", "Bring Me The Horizon"],
    ["The Summoning", "Sleep Token"], ["Doomsday", "Architects"], ["Holy Roller", "Spiritbox"]
  ],
  "Punk": [
    ["Basket Case", "Green Day"], ["All The Small Things", "blink-182"], ["Self Esteem", "The Offspring"],
    ["Holiday", "Green Day"], ["American Idiot", "Green Day"], ["The Rock Show", "blink-182"]
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

function fallbackGenerate(input: SetInput): GeneratedSet {
  const base = fallbackTracks[input.genre] || fallbackTracks.Pop;
  const tracks: Track[] = Array.from({ length: 50 }).map((_, i) => {
    const [title, artist] = base[i % base.length];
    const phase = phaseForIndex(i);
    const bpm = Math.round(input.minBpm + ((input.maxBpm - input.minBpm) * i) / 49);
    const energyByPhase: Record<Track["phase"], number> = {
      "Warm-up": 3, "Build": 5, "Groove": 6, "Peak": 8, "Reset": 5, "Closing": 4
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
      reason: "Fallback-Track, falls keine KI-Verbindung aktiv ist."
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

function validate(input: SetInput) {
  if (!input.genre || !input.place || !input.time) return false;
  if (!Number.isFinite(input.minBpm) || !Number.isFinite(input.maxBpm)) return false;
  if (input.minBpm < 50 || input.maxBpm > 220 || input.minBpm >= input.maxBpm) return false;
  return true;
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
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `
Du bist ein professioneller DJ-Set-Kurator.
Erstelle ein DJ-Set mit exakt 50 Songs.

Input:
- Genre: ${input.genre}
- Ort: ${input.place}
- Tagesphase/Uhrzeit: ${input.time}
- BPM-Bereich: ${input.minBpm}-${input.maxBpm}

Regeln:
- Verwende reale, bekannte oder glaubwürdige Songs und Artists.
- Keine erfundenen Artists.
- Tracks sollen zum Ort und zur Tagesphase passen.
- Halte alle BPM-Werte zwischen ${input.minBpm} und ${input.maxBpm}.
- Baue eine DJ-Dramaturgie: Warm-up, Build, Groove, Peak, Reset, Closing.
- Jeder Track braucht: number, title, artist, bpm, key, energy, phase, vibe, transition, reason.
- energy ist 1 bis 10.
- key ist Camelot-Notation, z.B. 8A, 9A, 10B.
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
                  required: ["number", "title", "artist", "bpm", "key", "energy", "phase", "vibe", "transition", "reason"],
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
                    reason: { type: "string" }
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

    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({
      ...fallbackGenerate(input),
      warning: "KI-Generierung fehlgeschlagen. Es wurden Fallback-Daten verwendet."
    });
  }
}
