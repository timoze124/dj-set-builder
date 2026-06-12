"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/browser";
import type { GeneratedSet, SetInput, Track } from "@/lib/types";

const genres = [
  "Pop", "Hip-Hop / Rap", "Trap", "Latin Pop", "Reggaeton", "EDM / Dance",
  "House", "Afrobeats", "Amapiano", "R&B", "Soul", "Rock", "Alternative Rock",
  "K-Pop", "Country", "Metal", "Punk"
];

const places = [
  "See", "Strand", "Pool", "Rooftop / Terrasse", "Club", "Bar / Lounge", "Gym",
  "Festival / Open Air", "Hausparty / WG-Party", "Auto / Roadtrip", "Dinner / Apéro",
  "Afterparty", "Date / romantisch", "Sportevent", "Business Event", "Beach Club",
  "Après-Ski", "Eigener Ort"
];

const times = [
  "Morgen: 06:00–09:00",
  "Vormittag: 09:00–12:00",
  "Nachmittag: 12:00–16:00",
  "Sonnenuntergang: 16:00–19:30",
  "Abend: 19:30–22:00",
  "Prime Time: 22:00–01:00",
  "Late Night: 01:00–04:00",
  "Afterhour: 04:00–06:00"
];

const defaultBpmByGenre: Record<string, [number, number]> = {
  "Pop": [95, 124], "Hip-Hop / Rap": [75, 105], "Trap": [70, 90],
  "Latin Pop": [90, 120], "Reggaeton": [90, 100], "EDM / Dance": [120, 130],
  "House": [120, 126], "Afrobeats": [95, 115], "Amapiano": [110, 115],
  "R&B": [70, 100], "Soul": [70, 100], "Rock": [100, 140],
  "Alternative Rock": [95, 135], "K-Pop": [100, 130], "Country": [85, 125],
  "Metal": [120, 180], "Punk": [140, 190]
};

type SavedPlaylist = {
  id: string;
  name: string;
  genre: string;
  place: string;
  time: string;
  min_bpm: number;
  max_bpm: number;
  set_vibe: string | null;
  bpm_range: string | null;
  energy_curve: string | null;
  tracks: Track[];
  created_at: string;
};

export default function Home() {
  const supabase = useMemo(() => createClient(), []);

  const [user, setUser] = useState<User | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");

  const [genre, setGenre] = useState("Pop");
  const [place, setPlace] = useState("See");
  const [time, setTime] = useState("Morgen: 06:00–09:00");
  const [minBpm, setMinBpm] = useState(95);
  const [maxBpm, setMaxBpm] = useState(124);

  const [generatedSet, setGeneratedSet] = useState<GeneratedSet | null>(null);
  const [playlistName, setPlaylistName] = useState("");
  const [savedPlaylists, setSavedPlaylists] = useState<SavedPlaylist[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    const [nextMin, nextMax] = defaultBpmByGenre[genre] || [90, 125];
    setMinBpm(nextMin);
    setMaxBpm(nextMax);
  }, [genre]);

  useEffect(() => {
    if (user) {
      loadSavedPlaylists();
    } else {
      setSavedPlaylists([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function signUp() {
    setAuthMessage("");
    const { error } = await supabase.auth.signUp({
      email: authEmail,
      password: authPassword,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });

    if (error) {
      setAuthMessage(error.message);
      return;
    }

    setAuthMessage("Account erstellt. Prüfe ggf. deine E-Mail zur Bestätigung.");
  }

  async function signIn() {
    setAuthMessage("");
    const { error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: authPassword
    });

    if (error) {
      setAuthMessage(error.message);
      return;
    }

    setAuthEmail("");
    setAuthPassword("");
  }

  async function signOut() {
    await supabase.auth.signOut();
    setGeneratedSet(null);
  }

  async function generatePlaylist() {
    if (minBpm < 50 || maxBpm > 220 || minBpm >= maxBpm) {
      setAuthMessage("Bitte gib einen gültigen BPM-Bereich ein.");
      return;
    }

    setLoading(true);
    setAuthMessage("");

    const payload: SetInput = { genre, place, time, minBpm, maxBpm };

    try {
      const response = await fetch("/api/generate-set", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Playlist konnte nicht generiert werden.");
      }

      setGeneratedSet(data);
      setPlaylistName(data.setTitle || `${genre} ${place} Set`);
      if (data.warning) setAuthMessage(data.warning);
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "Unbekannter Fehler.");
    } finally {
      setLoading(false);
    }
  }

  async function savePlaylist() {
    if (!user) {
      setAuthMessage("Bitte logge dich zuerst ein, um Playlists zu speichern.");
      return;
    }

    if (!generatedSet || !playlistName.trim()) {
      setAuthMessage("Bitte erstelle und benenne zuerst eine Playlist.");
      return;
    }

    setSaving(true);
    setAuthMessage("");

    const { error } = await supabase.from("playlists").insert({
      user_id: user.id,
      name: playlistName.trim(),
      genre,
      place,
      time,
      min_bpm: minBpm,
      max_bpm: maxBpm,
      set_vibe: generatedSet.setVibe,
      bpm_range: generatedSet.bpmRange,
      energy_curve: generatedSet.energyCurve,
      tracks: generatedSet.tracks
    });

    setSaving(false);

    if (error) {
      setAuthMessage(error.message);
      return;
    }

    setAuthMessage("Playlist gespeichert.");
    await loadSavedPlaylists();
  }

  async function loadSavedPlaylists() {
    if (!user) return;

    const { data, error } = await supabase
      .from("playlists")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setAuthMessage(error.message);
      return;
    }

    setSavedPlaylists((data || []) as SavedPlaylist[]);
  }

  function loadPlaylist(item: SavedPlaylist) {
    setGenre(item.genre);
    setPlace(item.place);
    setTime(item.time);
    setMinBpm(item.min_bpm);
    setMaxBpm(item.max_bpm);
    setPlaylistName(item.name);
    setGeneratedSet({
      setTitle: item.name,
      setVibe: item.set_vibe || "-",
      bpmRange: item.bpm_range || `${item.min_bpm}-${item.max_bpm}`,
      energyCurve: item.energy_curve || "-",
      tracks: item.tracks
    });
  }

  async function deletePlaylist(id: string) {
    const { error } = await supabase.from("playlists").delete().eq("id", id);

    if (error) {
      setAuthMessage(error.message);
      return;
    }

    await loadSavedPlaylists();
  }

  function reset() {
    setGeneratedSet(null);
    setPlaylistName("");
    const [nextMin, nextMax] = defaultBpmByGenre[genre] || [90, 125];
    setMinBpm(nextMin);
    setMaxBpm(nextMax);
  }

  return (
    <main className="app">
      <section className="hero">
        <div className="hero-top">
          <div className="brand-tag">
            <span className="dot" />
            <span>AI Playlist Prototype</span>
          </div>

          {user ? (
            <div className="user-tag">
              Eingeloggt: {user.email}
              <button className="secondary-btn" onClick={signOut}>Logout</button>
            </div>
          ) : null}
        </div>

        <h1>DJ Set Builder</h1>

        {!user ? (
          <section className="panel auth-panel">
            <div className="auth-grid">
              <div>
                <label>E-Mail</label>
                <input value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="deine@email.ch" />
              </div>
              <div>
                <label>Passwort</label>
                <input value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} type="password" placeholder="Mind. 6 Zeichen" />
              </div>
              <button className="primary-btn" onClick={signIn}>Login</button>
              <button className="secondary-btn" onClick={signUp}>Registrieren</button>
            </div>
          </section>
        ) : null}

        <section className="panel">
          <div className="controls">
            <div>
              <label>Musikgenre</label>
              <select value={genre} onChange={(e) => setGenre(e.target.value)}>
                {genres.map((item) => <option key={item}>{item}</option>)}
              </select>
            </div>

            <div>
              <label>Ortstyp</label>
              <select value={place} onChange={(e) => setPlace(e.target.value)}>
                {places.map((item) => <option key={item}>{item}</option>)}
              </select>
            </div>

            <div>
              <label>Uhrzeit / Tagesphase</label>
              <select value={time} onChange={(e) => setTime(e.target.value)}>
                {times.map((item) => <option key={item}>{item}</option>)}
              </select>
            </div>
          </div>

          <div className="bpm-controls">
            <div>
              <label>BPM Minimum</label>
              <input type="number" min={50} max={220} value={minBpm} onChange={(e) => setMinBpm(Number(e.target.value))} />
            </div>

            <div>
              <label>BPM Maximum</label>
              <input type="number" min={50} max={220} value={maxBpm} onChange={(e) => setMaxBpm(Number(e.target.value))} />
            </div>
          </div>

          <div className="button-row">
            <button className="primary-btn" onClick={generatePlaylist} disabled={loading}>
              {loading ? "KI erstellt Set..." : "KI-Playlist erstellen"}
            </button>
            <button className="secondary-btn" onClick={reset}>Zurücksetzen</button>
          </div>

          {authMessage ? (
            <p className={`message ${authMessage.toLowerCase().includes("fehler") || authMessage.toLowerCase().includes("invalid") ? "error" : ""}`}>
              {authMessage}
            </p>
          ) : null}

          {generatedSet ? (
            <>
              <div className="set-info">
                <div className="stat">
                  <span>Set-Vibe</span>
                  <strong>{generatedSet.setVibe}</strong>
                </div>
                <div className="stat">
                  <span>BPM-Bereich</span>
                  <strong>{generatedSet.bpmRange}</strong>
                </div>
                <div className="stat">
                  <span>Energieverlauf</span>
                  <strong>{generatedSet.energyCurve}</strong>
                </div>
                <div className="stat">
                  <span>Tracks</span>
                  <strong>{generatedSet.tracks.length}</strong>
                </div>
              </div>

              <div className="save-area">
                <input value={playlistName} onChange={(e) => setPlaylistName(e.target.value)} placeholder="Playlist benennen" />
                <button className="primary-btn" onClick={savePlaylist} disabled={saving}>
                  {saving ? "Speichert..." : "Playlist speichern"}
                </button>
              </div>
            </>
          ) : null}
        </section>
      </section>

      {generatedSet ? (
        <section className="panel">
          <div className="section-title">
            <h2>Generierte Playlist</h2>
            <div className="section-chip">DJ-Infos pro Song inklusive</div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Track</th>
                  <th>Artist</th>
                  <th>BPM</th>
                  <th>Key</th>
                  <th>Energie</th>
                  <th>Phase</th>
                  <th>Vibe</th>
                  <th>Übergang</th>
                </tr>
              </thead>
              <tbody>
                {generatedSet.tracks.map((song) => (
                  <tr key={`${song.number}-${song.title}-${song.artist}`}>
                    <td>{song.number}</td>
                    <td>{song.title}</td>
                    <td>{song.artist}</td>
                    <td>{song.bpm}</td>
                    <td><span className="pill">{song.key}</span></td>
                    <td>{song.energy}/10</td>
                    <td>{song.phase}</td>
                    <td>{song.vibe}</td>
                    <td>{song.transition}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="panel">
        <div className="section-title">
          <h2>Gespeicherte Playlists</h2>
          <div className="section-chip">{user ? "Supabase" : "Login nötig"}</div>
        </div>
        <p className="muted tiny">
          {user ? "Gespeichert wird in Supabase pro eingeloggtem User." : "Logge dich ein, um Playlists dauerhaft zu speichern."}
        </p>

        <div className="saved-list">
          {savedPlaylists.length === 0 ? (
            <p className="muted">Noch keine Playlists gespeichert.</p>
          ) : savedPlaylists.map((item) => (
            <div className="saved-item" key={item.id}>
              <div>
                <strong>{item.name}</strong><br />
                <span className="muted">
                  {item.genre} · {item.place} · {item.time} · {item.min_bpm}-{item.max_bpm} BPM · {item.tracks.length} Tracks
                </span>
              </div>
              <div className="saved-actions">
                <button className="secondary-btn" onClick={() => loadPlaylist(item)}>Laden</button>
                <button className="danger-btn" onClick={() => deletePlaylist(item.id)}>Löschen</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
