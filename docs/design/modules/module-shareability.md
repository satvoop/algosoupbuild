# Module: shareability

Copied from `product-design` v2.6.0, `references/module-shareability.md` (claude-skills).
Edits for this repo: the distribution skill (`viral-marketing`) does not run in the hour, so
its hand-off becomes a Backlog card; outputs go to the design pass; one example made generic.

Optional module. Select it at Frame (design pass step 0.4) when growth depends on users
sharing rather than on paid acquisition or sales -- consumer products, communities, games,
content brands, anything with a near-zero marketing budget.

In the full process this module is a hook: the distribution engine is the `viral-marketing`
skill. This file makes every concept declare its share units so that distribution has
assets to work with from day one.

## The rule

Every concept answers three questions. A concept that cannot answer them is not rejected,
but it is marked "no organic distribution" and carries that as a viability risk.

1. **Share unit.** What is the smallest thing a user would put in front of someone else? A
   card, a score, a rank, a streak, a result, a comparison, a quote. It must be a thing, with
   a size and a format, not a feeling.
2. **Share trigger.** The moment in the flow the share unit is offered. Achievement,
   surprise, rivalry, loss, milestone, disagreement, novelty. Name the emotion and the step.
3. **Share format.** Which channel the unit renders for and at what size. If the brand
   already has templates (for example 1080x1350 post, 1080x1080 square, 1080x1920 story,
   600x840 card), the unit uses one of them or proposes a new one with a reason.

## What the design hands to distribution (a Backlog card in the hour)

* The share-unit table for the chosen concept: unit, trigger, format, editable fields, data
  placeholders, which brand template it renders into.
* The brand card and voice attributes.
* The persona and the social job -- who the share is for, and what it says about the sharer.
* Constraints: platforms in scope, any content the product must never present as real
  (sample data, invented quotes, placeholder names).

## Design pass placement

Share units go in the concept (section 9, "Share unit") and in section 13: unit, trigger,
format, and whether its template exists. A share unit built in the hour has a user story in
section 14.

## Anti-patterns

* A "share" button with nothing specific to share.
* Share units that only make sense to existing users (no context for the recipient).
* Sample content that reads as real.
* Designing the share unit after the product, as a marketing afterthought.
