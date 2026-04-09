/**
 * Copyright 2026 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type React from 'react';

/** Standard leaf margin from the implementation guide. */
export const LEAF_MARGIN = 'var(--a2ui-leaf-margin, 6px 8px)';

/** Standard internal padding for visually bounded containers. */
export const CONTAINER_PADDING = 'var(--a2ui-container-padding, 16px)';

/** Standard border color using the site's design tokens. */
export const BORDER_COLOR = 'var(--border, oklch(0.922 0 0))';

/** Standard border using the site's design tokens. */
export const STANDARD_BORDER = `var(--a2ui-border-width, 1px) solid ${BORDER_COLOR}`;

/** Standard border radius matching the site's radius system. */
export const STANDARD_RADIUS = 'var(--radius, 0.75rem)';

/** Smaller radius for inner elements (inputs, chips). */
export const INNER_RADIUS = 'calc(var(--radius, 0.625rem) - 2px)';

/** Muted foreground for captions, labels, secondary text. */
export const MUTED_FG = 'var(--muted-foreground, oklch(0.556 0 0))';

/** Primary color for interactive highlights. */
export const PRIMARY_COLOR = 'var(--a2ui-primary-color, var(--primary, oklch(0.205 0 0)))';

/** Primary foreground (text on primary background). */
export const PRIMARY_FG = 'var(--primary-foreground, oklch(0.985 0 0))';

/** Card/surface background. */
export const CARD_BG = 'var(--a2ui-card-bg, var(--card, #fff))';

/** Standard font stack (inherits from site). */
export const FONT_FAMILY = 'var(--font-geist-sans, system-ui, -apple-system, sans-serif)';

/** Heading font weight (CSS-var-backed for style switching). */
export const HEADING_WEIGHT = 'var(--a2ui-heading-weight, 600)';

/** Body text font size. */
export const BODY_FONT_SIZE = 'var(--a2ui-font-size-body, 0.875rem)';

/** Caption / label font size. */
export const CAPTION_FONT_SIZE = 'var(--a2ui-font-size-caption, 0.8rem)';

/** Small text font size (error messages, secondary info). */
export const SMALL_FONT_SIZE = 'var(--a2ui-font-size-small, 0.75rem)';

/** Card box-shadow. */
export const CARD_SHADOW = 'var(--a2ui-shadow-card, 0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04))';

/** Heading letter-spacing. */
export const HEADING_LETTER_SPACING = 'var(--a2ui-letter-spacing-heading, -0.01em)';

export const mapJustify = (j?: string) => {
  switch (j) {
    case 'center':
      return 'center';
    case 'end':
      return 'flex-end';
    case 'spaceAround':
      return 'space-around';
    case 'spaceBetween':
      return 'space-between';
    case 'spaceEvenly':
      return 'space-evenly';
    case 'start':
      return 'flex-start';
    case 'stretch':
      return 'stretch';
    default:
      return 'flex-start';
  }
};

export const mapAlign = (a?: string) => {
  switch (a) {
    case 'start':
      return 'flex-start';
    case 'center':
      return 'center';
    case 'end':
      return 'flex-end';
    case 'stretch':
      return 'stretch';
    case 'baseline':
      return 'baseline';
    default:
      return 'stretch';
  }
};

export const getBaseLeafStyle = (): React.CSSProperties => ({
  margin: LEAF_MARGIN,
  boxSizing: 'border-box',
  fontFamily: FONT_FAMILY,
});

export const getBaseContainerStyle = (): React.CSSProperties => ({
  margin: LEAF_MARGIN,
  padding: CONTAINER_PADDING,
  border: STANDARD_BORDER,
  borderRadius: STANDARD_RADIUS,
  boxSizing: 'border-box',
  fontFamily: FONT_FAMILY,
});
