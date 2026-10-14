# Background audio — provenance record

Status (final): **integrated.** The shipped track is `assets/audio/music.mp3`,
supplied directly by the site owner (user-provided file, 2026-10-14) — no
third-party licensing applies to it. The CC0 candidates below were the earlier
research trail and are kept only for auditability; delete the `candidates/`
folder if you no longer need it.

Integration behavior (js/audio.js): starts on the visitor's first gesture
(autoplay-safe), loops, volume-fades in/out, preference persisted in
localStorage (`invitation:audio`), toggle fixed at the bottom-left.

## License situation

All three candidates are **CC0 1.0 (public domain dedication)** from Freesound,
retrieved via the Openverse API (aggregator with normalized license metadata)
on **2026-10-13**. CC0 permits free use, modification, and redistribution with
no attribution requirement; the credit lines below are retained as courtesy and
for auditability.

## Candidates (downloaded to `assets/audio/candidates/`)

| File | Title | Creator | License | Duration | Source |
|---|---|---|---|---|---|
| `humming-fsharp-minor-xkeril-685680.mp3` | Humming in F# Minor | xkeril | CC0 1.0 | 17.6 s | https://freesound.org/s/685680/ |
| `female-vocal-melody-humming-owstu-727696.mp3` | female vocal melody humming | owstu | CC0 1.0 | 3.7 s | https://freesound.org/s/727696/ |
| `woman-humming-PSsoundproject-183565.mp3` | woman humming | PSsoundproject | CC0 1.0 | 20.1 s | https://freesound.org/s/183565/ |

Origin files served from `cdn.freesound.org` (Freesound preview MP3s, 128 kbps).
License pages: https://creativecommons.org/publicdomain/zero/1.0/

## Search method

Openverse audio API (`api.openverse.org/v1/audio/?q=…&license=cc0`), queries
"humming vocal" and "hum voice melody", filtered to CC0. Wikimedia Commons was
also searched but returned only AI-generated songs (unsuitable). Shortlisted
CC0 hits were downloaded and verified as real MPEG audio via `file(1)`.

## Remaining before shipping audio

1. Audition candidates: confirm 100% vocal (no instruments/room noise), pick
   the most elegant tone; trim to a clean seamless loop.
2. Wire `config.audio` (`src`/`ready`) to the chosen file.
3. Implement gesture-gated playback, fade in/out, persist preference,
   blocked-autoplay handling, sound-wave control (later stage work).
