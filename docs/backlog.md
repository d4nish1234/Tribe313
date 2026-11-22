# Backlog

Agreed ideas that aren't being built yet. Benchmark-specific ideas (levels 4–6, equipment per test, …) are in [benchmark-roadmap.md](benchmark-roadmap.md).

## Coach companions
Two imaginary coaches a member picks during onboarding. They react through the app with a short line, their avatar, and a recorded voice clip. Designs: [Coach Companions canvas](https://claude.ai/artifact/JLNLM1rxeEUiTTNA8jkrkf) (private until shared).

- **Coaches** (names and looks are placeholders): Hamza, "the hype man" (loud, fast, gold), and Idris, "the steady one" (calm, consistent, green). Two real people will voice them.
- **Moments:** picked as coach, first benchmark, a test levelling up (Foundation → L1, L1 → L2, reaching L3), overall level up, score up/same/down ("Gotta try harder next time!"), workout day, rest day, back after a long break, time for a new benchmark, workout days not picked. The canvas's Script artboard has a line for each coach (about 28 clips).
- **Rules:**
  - Spoken lines stay generic, so one clip works for everyone; the screen adds the specifics (which test, the new score).
  - Every line also shows as text, and the voice follows the silent switch.
  - Only the big benchmark-saved moments play by themselves, and that can be turned off. Home's daily nudge never autoplays.
- **Settings:** change coach; turn the voice, the daily Home nudge and workout-day reminders on or off.

## Onboarding, later steps
Onboarding (`app/onboarding.tsx`) has height and workout days today. Still to add, each optional like the rest:
- **Equipment:** a multi-select list of what the member has, split into home and gym. Would feed the equipment ideas in the benchmark roadmap.
- **Choose a coach:** once coach companions are built.
