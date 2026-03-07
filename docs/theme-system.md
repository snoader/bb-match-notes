# Theme System Guide

This project supports three themes:

- `minimal-light`
- `minimal-dark`
- `bloodbowl`

## Core design tokens

All visual UI styles must use theme tokens and CSS variables. The canonical token set is:

- `--bg`
- `--surface`
- `--surface-2`
- `--text-primary`
- `--text-secondary`
- `--text-muted`
- `--border`
- `--divider`
- `--accent`
- `--danger`
- `--success`
- `--input-bg`
- `--input-text`
- `--input-border`
- `--placeholder`
- `--btn-bg`
- `--btn-text`
- `--btn-border`
- `--focus`
- `--font-display`
- `--font-ui`

## Required styling rules

1. **Do not hardcode component colors** (`#000`, `#fff`, `#111`, `rgb(...)`, `rgba(...)`, named colors) in TS/TSX components.
2. **Use CSS variables instead** (`var(--text-primary)`, `var(--surface)`, etc.) for all color, border-color, background-color, and focus styles.
3. If a needed style does not map to an existing token, add a derived token in the theme definitions first, then consume that variable in the component.

Examples:

```css
/* Bad */
color: #111;
background: rgba(0, 0, 0, 0.5);

/* Good */
color: var(--text-primary);
background: var(--color-overlay);
```

## Lint guidance for theme safety

Linting is configured to flag hardcoded color literals in TS/TSX string literals via ESLint `no-restricted-syntax`.

- Avoid introducing color literals in component files.
- Keep literal color definitions limited to the central theme definition files in `src/theme/`.

## Theme switching architecture

Theme switching must remain centralized:

- Theme selection state must go through `useThemeStore`.
- Theme token application must go through `applyThemeTokens(...)` in app bootstrap/runtime.
- Components must **not** manually toggle root theme classes or `data-theme` attributes.
- Components must not locally override global token values.

## How to add a new theme safely

1. **Define token values** for the full token set in a new theme file in `src/theme/`.
2. **Register the theme in the theme store flow** by adding it to `ThemeName` and `themes` in `src/theme/themes.ts`.
3. **Add the theme option to the hamburger menu** by ensuring the theme appears in the centralized `THEME_OPTIONS` list used by `HamburgerMenu`.
4. **Verify across key screens**:
   - `MatchStartScreen`
   - `LiveMatchScreen`
   - `HamburgerMenu`
   - `Header`

Checklist when adding/updating themes:

- No direct color literals were added to component styles.
- Theme switch persists via store/local storage.
- Existing themes (especially `minimal-light`) remain visually unchanged.
