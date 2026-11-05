# Module: game mechanics, leagues and competition

Copied from `product-design` v2.6.0, `references/module-game-and-league.md` (claude-skills).
Edits for this repo: the mechanics skill (`viral-gamification`) does not run in the hour, so
its hand-off becomes a Backlog card; outputs go to the design pass; one example made generic;
the Timebox note is added.

Optional module. Select it at Frame (design pass step 0.4) when the product has any of:
points, scores, tiers or rarity, streaks, seasons, leagues or rankings, packs or squads,
transfers, prizes, or a "play" verb in its one-liner.

In the full process this module is a hook: the mechanics are designed by the
`viral-gamification` skill. This file states what the design must hand over and what it
expects back.

**Timebox depth.** The full gate below (an economy simulation and a playtest) cannot be met
in an hour. A mechanic that needs either is cut (Backlog card, README known gap), or ships as
an accepted bet the owner names at the Design gate, written in design pass section 3 with
the fact that would show it broken. The hand-over list below becomes the Backlog card's body.

## What the design hands to the mechanics work

From Define (all required):
* The problem statement and the persona -- the player is the persona, not a generic gamer.
* The emotional and social jobs. Mechanics serve those; a mechanic that serves neither is
  decoration.
* The design principles. Mechanics that break a principle are rejected before balancing.
* The appetite. A season structure that needs six months of live data cannot be validated
  inside a short appetite; say so.
* The brand card, if a brand guide exists (tone limits how far competition can be pushed).

From Frame:
* Budget constraints (usually zero paid acquisition).
* Any hard exclusions decided up front (for example: no cash prizes, no link to real money).
  These are design constraints; they are not a legal review, which happens on prototypes.

## What the design expects back

* Player model: who plays, why they return, target emotions per session and per week.
* Loops: core, meta, social, share -- each with trigger, action, variable reward, investment.
* Economy: currencies, sources and sinks, normalisation, seasons and resets, comeback
  mechanics, and a simulation result naming any dominant strategy found.
* Competition: league shape, ranking maths, tie-breaks, rivals, cadence, status rewards.
* Share units: for each mechanic, the thing a player would share, the trigger, and the format
  (feeds `module-shareability.md`).
* A "hand to legal" list: every mechanic with a one-line description, so the legal partner
  reviews the prototype with a complete inventory. No legal analysis is produced here.

## Design pass placement

Mechanics, competition and share units go in section 13; each mechanic that ships has a user
story in section 14 and its Kano class in the concept (section 9).

## Gate (full process)

The design cannot close for a game product until both have happened: (a) the economy
simulation has run at least once and its dominant-strategy finding is either fixed or
accepted as a bet in the spec's rabbit-holes section; and (b) a playtest or at minimum a
breadboard walk-through with one real user, recorded.
