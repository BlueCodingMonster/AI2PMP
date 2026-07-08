# Product-Line Period Plans Design

## Goal

Plan management should match the current operating model: each product line can create annual, half-year, quarterly, and monthly plans. Each plan is an independent period container. Plans can optionally reference another plan for traceability, but no hierarchy is mandatory.

## Scope

- Add a half-year plan period alongside annual, quarterly, and monthly periods.
- Require each plan to belong to a product line.
- Keep `parentPlanId` as an optional related-plan link, not a required tree constraint.
- Keep plan items flexible: a plan item may link to a requirement from the requirement pool, or it may stand alone as a custom target/work item.

## Data Model

- `PlanType` gains `HALF_YEAR`.
- `Plan` gains `halfYear Int?` for values `1` and `2`.
- `Plan` gains `productLineTeamId String` and a relation to `ProductLineTeam`.
- `ProductLineTeam` gains a `plans` relation.
- Existing `parentPlanId` remains optional and is interpreted as "related plan".

## UX

- The plan form requires selecting a product line.
- Period controls are conditional:
  - Annual: year only.
  - Half-year: year plus first/second half.
  - Quarterly: year plus Q1-Q4.
  - Monthly: year plus month.
- The auto date preset calculates dates from the selected period.
- Related-plan options are filtered to the same product line and year, and are optional.
- The plan list supports tabs for hierarchy/all, annual, half-year, quarterly, and monthly plans.
- Plan cards and detail headers show product line and period.

## Business Rules

- Product line is mandatory for new and updated plans.
- A plan can be saved without a related plan.
- A plan item can be saved without a requirement.
- If a plan item links to a requirement, existing behavior marks the requirement as planned.

## Verification

- Add a repository assertion script checking that:
  - Prisma schema contains `HALF_YEAR`, `halfYear`, and plan-product-line relations.
  - Plan validation requires `productLineTeamId` and supports `halfYear`.
  - Plan actions persist and query product-line metadata.
  - Plan form exposes product line, half-year, and optional related-plan behavior.
