# Typography Blueprint, Founder Hero Film

Binding rules for the founder centric hero direction (decided 2026-07-04).
Every generated clip and every text element on the hero must obey these.
Purpose: the film and the typography must never fight for the same pixels
or the same moment.

## Law 1: The lane

The left third of the frame belongs to words. The right two thirds belong
to film. Every clip prompt must include the instruction that the left
third stays pure near-black darkness for the entire duration. All hero
text is left aligned inside that lane. Mono annotations (FIG, SYS, etc.)
may sit top left and bottom left corners only. Nothing textual ever sits
center or right.

## Law 2: Calm pockets

Text enters and exits only when the film is calm. Words and motion peaks
never share a moment. Hero pin scroll map:

| Scroll of pin | Film event | Typography |
|---|---|---|
| 0 to 15% | darkness, spark ignites right of center | eyebrow (Space Mono) + h1 line 1 (Cinzel) enter |
| 15 to 35% | gold wireframe page draws itself | h1 line 1 holds; h1 line 2 sets in as page completes |
| 35 to 48% | rendered golden page, calmest pocket | full headline + subline visible, peak readability |
| 48 to 55% | stillness before separation | all text exits upward (SplitText choreography) |
| 55 to 72% | page panels separate and drift apart | zero text on screen |
| 72 to 90% | panels part, Daphne revealed right of center | subline returns in the lane |
| 90 to 100% | resolve overlay into Act 01 | text gone, sticky pill takes over |

## Law 3: Guaranteed contrast

A subtle left lane scrim gradient is baked into the page CSS. Type
readability never depends on the footage behaving. If footage drifts
gold into the lane, the scrim keeps contrast passing.

## Mobile

Crossfade keyframes must be chosen with a calm dark upper third. On
phones, type stacks in the top third, action lives below. This
constrains keyframe selection when the final film is cut.

## Asset facts

- Human clips: Google Veo 3.1 Lite via OpenRouter (ByteDance Seedance
  rejects real person input images at the API level).
- Hero anchor still: Daphne positioned right of center, left third empty.
- Locked look: slim oval face, loose low chignon, charcoal blazer over
  black silk top, warm gold rim light, gold schematic lines behind.
- Palette: warm gold on near black only. No readable text inside footage.
