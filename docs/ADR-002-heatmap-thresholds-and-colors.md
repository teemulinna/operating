# ADR-002: Heatmap Thresholds and Colors

## Status
Accepted

## Context
Different documents had conflicting color schemes and thresholds (green/blue/yellow/red vs green/yellow/orange/red; varying breakpoints). This causes confusion and inconsistent UX.

## Decision
Adopt a single scheme and thresholds across BE and FE:
- Colors: green, blue, yellow, red
- Thresholds (utilization percentage):
  - Green: 0–70%
  - Blue: 71–85%
  - Yellow: 86–95%
  - Red: 96%+

Backend responsibilities:
- Views and services should map utilization to these buckets using these exact thresholds.
- Department/weekly aggregations use the same breakpoints on aggregated utilization.

Frontend responsibilities:
- Define constants in `constants/capacityThresholds.ts` matching the above.
- Ensure `HeatMapLegend` and cell classes use these colors; do not use orange for any state.

## Consequences
- Update existing docs, SQL examples, and FE styles to align with the above.
- Tests and Playwright selectors that assert color classes should expect green/blue/yellow/red.
