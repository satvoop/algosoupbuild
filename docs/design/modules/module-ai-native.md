# Module: AI-native products

Copied from `product-design` v2.6.0, `references/module-ai-native.md` (claude-skills).
Edits for this repo: outputs go to the design pass (section 13) and the spec instead of the
full design-spec template; the data-model hand-off points at this repo's files; one example
made generic.

Optional module. Select it at Frame (design pass step 0.4) when AI is a core capability of
the product, not an add-on. If the product is a content system, a game, a marketplace or a
brand, skip it.

Sources: Google People + AI Guidebook (https://pair.withgoogle.com/guidebook/) and Microsoft
HAX Guidelines (https://www.microsoft.com/en-us/haxtoolkit/ai-guidelines/).

## Patterns to decide, per concept

**Proactive vs reactive**
* Can the product anticipate a need instead of waiting to be asked?
* What signal says the user needs help before they know it?
* HAX: make clear what the system can do and how well it can do it, before the user relies on it.

**Conversational vs structured**
* Should the user talk to the product or navigate it? Can a workflow be structured input with
  conversational output?
* What happens when the question is vague -- how does the product ask for clarification
  without nagging?

**Trust and explainability**
* Every recommendation can show why. "I recommend X because Y" beats "I recommend X".
* PAIR: calibrate trust to actual capability; over-trust is a failure mode as much as
  under-trust.

**Graceful degradation**
* How does the product say "I don't know"? What is the fallback when data is missing or stale?
* HAX: support efficient correction and dismissal when the system is wrong; remember
  corrections over time.

**Progressive disclosure**
* Start with the answer; evidence on demand. Decide how many levels of "why" the product
  supports.

**Brand personality as AI voice**
* If a brand guide defines an archetype and voice attributes, the AI's voice follows them.
  Map each voice attribute to a behaviour: how it opens, how it delivers bad news, how it
  pushes back on a weak assumption. Banned terms in the brand guide are product requirements.

**The colleague test**
* Would the interaction feel natural if a smart colleague did it? If a brand guide exists,
  the colleague has that personality. If the answer is no, the interaction model is wrong.

## Output into the design pass

Section 13: AI role, proactive behaviours, reactive behaviours, confidence and uncertainty
handling, personality and tone. List every "when wrong" path in the core flow (section 10)
and give it a user story (section 14), so it becomes an acceptance criterion.

## Hand-off to the data model

If the AI runs in production as an agent (multi-step runs with tool calls, retries or waits
across requests, or stored agent memory), the data depth line marks "agents in production"
and `docs/architecture/data-model.md` records the run, step, tool-call, approval, usage and
memory entities at step 7. A single prompt-and-response a human accepts is below that
threshold: it gets one model-call log row and names the AI vendor as a recipient of whatever
the prompt carries (a user's note sent for a draft is a transfer of personal data).
