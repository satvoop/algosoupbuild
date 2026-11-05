# Module: monetisation

Copied from `product-design` v2.6.0, `references/module-monetisation.md` (claude-skills).
Edits for this repo: outputs go to the design pass instead of the full design-spec template;
hand-offs to companion skills that do not run in the hour (`incentive-economy`,
`product-owner`'s GTM canvas) become Backlog cards; one example made generic; the Timebox
note is added.

Optional module. Select it at Frame (design pass step 0.4) when the product has a revenue
line that the design decides: a subscription, a paid tier, a paywall boundary, a one-off
purchase. Skip it when revenue is set elsewhere (a client retainer, an internal tool) or when
the product is free by decision and stays so.

The module exists because a paid unit designed after the free product is a tax on it; a
paid unit designed with it is a feature. This file is the design side: what is paid for and
why that thing, before pricing.

**Timebox depth.** No payment is taken in the hour (the template has no payments until a
spec adds them). The module decides the revenue thesis, the paid unit and the free-tier
boundary; the ladder stands at rung 0 and is carried as a viability accepted bet (design pass
section 3), with the rung it must reach next on a Backlog card.

## Decide, per concept

**Revenue thesis.** One sentence: who pays, for what, and why they cannot get it one tab
away for free. If the sentence needs "and" three times, the thesis is not yet found. A free
alternative that serves the same need at zero effort kills the thesis whatever the price.

**Paid unit.** The specific thing money buys. It must be something the free experience
makes the user want, that the product can withhold without breaking the free experience,
and that the cost side cannot scale faster than subscribers. Reject a paid unit that is:
* the raw input everyone else gives away (a public feed, a list of public facts),
* a fairness lever (paying to score more; paying to see what others cannot in a way that
  wins),
* invisible (no moment in the free flow where its absence is felt).
Prefer the synthesis, the earlier view, the deeper record, the extra slot, the identity
mark, the ad-free state.

**Free tier boundary.** What free sees, what free sees late, what free never sees, and the
exact moment the boundary is felt (the conversion moment). Every hidden thing shows its
shape (a count, a mosaic, an as-of stamp), never nothing: a blank wall converts nobody.
Public surfaces (a table, a result, a share card) stay public; the boundary is inside the
product, never on the share unit.

**Price anchor and floor.** The floor is the running cost per subscriber at 1k and 10k
subscribers (licences, routines, hosting, support), with the fixed part stated as the
number of subscribers that covers it. The anchor comes from the two nearest comparables
the persona already pays for, with an annual at a discount. State the anchor as a range
until the evidence ladder reaches a paid rung.

**Discounts and credits.** A credit that discounts the subscription is a price change and
a liability against your own revenue with no third-party funder. Designing credits is out of
the hour: a Backlog card.

**Willingness-to-pay evidence ladder.** Stated intent counts for nothing. The rungs, weakest
first, and which the design has reached:

| Rung | Evidence | What it proves |
| --- | --- | --- |
| 0 | "They said they would pay" | nothing; record it and move on |
| 1 | A price survey (Van Westendorp or similar) with the persona | the range, not the decision |
| 2 | A refundable founding-member pre-order at the annual anchor, card on file | intent with friction; the first real number |
| 3 | A paid conversion in a prototype or beta | the thing works at the price |
| 4 | Retention past the first renewal | the thing keeps working |

A design that ships at rung 0 carries that as a viability risk in the assumptions, owned and
dated, with the rung it must reach and when.

**Unit economics sanity.** Subscribers to cover fixed cost; contribution per subscriber
after variable cost; payback on any acquisition cost (zero if organic by decision, which
makes the share loop the acquisition engine).

**Kill conditions.** The two or three measured facts that would mean the revenue thesis
is wrong (conversion below a floor at the boundary; the paid unit unused after purchase;
cost per subscriber rising with scale). Write the first into the hypothesis signal (design
pass section 7).

## Output into the design pass

Section 13: revenue thesis, paid unit, free tier boundary with the conversion moment, price
anchor and floor (or "not measured in the hour"), the ladder rung reached and the next
rung's test, kill conditions. The rung-0 launch is an accepted bet in section 3.
