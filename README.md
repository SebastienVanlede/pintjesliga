# Pintjesliga

Belgische Pro League droomelf simulator. Rol de dobbelstenen, kies je spelers uit historische squads en simuleer een volledig seizoen — inclusief Play-off 1, Play-off 2 en Relegation Play-off.

🔗 **[pintjesliga.vercel.app](https://pintjesliga.vercel.app)**

---

## Wat is het?

Pintjesliga is een browsergebaseerde draft- en simulatiegame op basis van de Belgische Pro League. Je bouwt een elftal samen via een dobbelsteendraft uit seizoenen 2021 en 2022, en simuleert daarna een volledig competitieseizoen met play-offs.

### Speelflow

1. **Kies een formatie** — 4-3-3, 4-4-2, 4-2-3-1 en meer
2. **Kies een speelmodus** — Normaal (ratings zichtbaar) of From Memory (ratings verborgen)
3. **Draft je elftal** — dobbelstenen bepalen welk team je trekt, jij kiest de speler en positie
4. **Simuleer het seizoen** — automatisch of speeldag per speeldag (manueel)
5. **Deel je resultaat** — kopieer de sharekaart als afbeelding of tekst

### Simulatie

- 16 teams, 30 speeldagen regulier seizoen
- Play-off 1 (top 6): volledige dubbele competitie — elke ploeg speelt 2x tegen elke andere
- Play-off 2 (7–12): Europa play-off
- Relegation play-off (13–16)
- Matchsimulatie via Poisson-verdeling op basis van teamkwaliteit en thuisvoordeel

---

## Tech stack

- [Next.js](https://nextjs.org) (App Router)
- [Zustand](https://zustand-demo.pmnd.rs) — state management
- [Framer Motion](https://www.framer.com/motion) — animaties
- [Vercel Analytics](https://vercel.com/analytics)
- Squads in statische JSON-bestanden onder `data/squads/`
