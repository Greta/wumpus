# Wumpus 0.2.0 validation

Checked October 1, 2026.

## Automated checks

Nineteen tests cover the cave's dimensions and hazards, nearby pit clues, directional movement, edge wrapping, tunnel restrictions, winning and missing a shot, canceling aim, collisions, score retention, bat input locking, canceled timers on restart, and Angular button/keyboard behavior.

The build compiles Angular templates and TypeScript in strict mode. The Classic verification compares SHA-256 hashes for all 23 original files with the snapshot at commit `2ad98db`.

## Browser checks

- Desktop, 390px and 320px portrait, and 844px landscape layouts
- Desktop keyboard guide with mobile-only movement buttons, fixed-height descriptions, and colored hazard words
- Visible controls, aim/cancel state, firing, game-over messages, session score, and retry
- Full-map dialog, close control, Escape, and keyboard focus
- Original sprites, font, and the playable Classic link

These are implementation and browser checks, not a full accessibility audit or physical-device test. Small pixel-art rooms remain small on phones. Classic intentionally retains the original desktop-only interface.
