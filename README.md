# DJ Set Builder

Eine deploybare Next.js-App für GitHub + Vercel + Supabase.

## Funktionen

- Login / Registrierung mit Supabase Auth
- KI-Playlist-Generierung mit OpenAI
- Auswahlfelder:
  - Musikgenre
  - Ortstyp
  - Uhrzeit / Tagesphase
  - BPM Minimum / Maximum
- KI generiert ca. 50 Songs mit DJ-Randinfos:
  - BPM
  - Key
  - Energie
  - Phase
  - Vibe
  - Übergangsnotiz
- Playlists speichern, laden und löschen
- Speicherung pro eingeloggtem User in Supabase

## Lokale Installation

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Environment Variables

In `.env.local` lokal und später in Vercel eintragen:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
OPENAI_MODEL=gpt-4.1-mini
```

## Supabase Setup

1. Supabase-Projekt erstellen.
2. Authentication aktivieren.
3. In Supabase SQL Editor den Inhalt von `supabase/schema.sql` ausführen.
4. In Supabase unter Auth > URL Configuration diese URLs setzen:
   - Site URL lokal: `http://localhost:3000`
   - Site URL Produktion: deine Vercel-Domain
   - Redirect URL lokal: `http://localhost:3000/auth/callback`
   - Redirect URL Produktion: `https://deine-domain.vercel.app/auth/callback`

## GitHub + Vercel Deployment

1. Projekt in ein GitHub Repository pushen.
2. In Vercel neues Projekt erstellen und GitHub Repo importieren.
3. Environment Variables in Vercel setzen.
4. Deploy starten.
5. Nach dem Deploy die Vercel-Domain in Supabase Auth URL Configuration eintragen.
6. Danach einmal neu deployen.

## Hinweis zur KI-Funktion

Die App nutzt `/api/generate-set` als Server Route. Der OpenAI-Key bleibt dadurch serverseitig und wird nicht im Browser sichtbar.

Wenn `OPENAI_API_KEY` fehlt oder die KI-Anfrage fehlschlägt, liefert die App Fallback-Daten, damit die Oberfläche weiterhin funktioniert.
