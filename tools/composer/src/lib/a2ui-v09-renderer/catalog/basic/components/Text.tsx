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

import React from 'react';
import {createReactComponent} from '../../../adapter';
import {TextApi} from '@a2ui/web_core/v0_9/basic_catalog';
import {getBaseLeafStyle, MUTED_FG, HEADING_WEIGHT, BODY_FONT_SIZE, CAPTION_FONT_SIZE, HEADING_LETTER_SPACING} from '../utils';

/** Only allow http(s) URLs — blocks javascript:, data:, vbscript:, etc. */
function isSafeHref(href: string): boolean {
  try {
    const url = new URL(href, 'https://placeholder.invalid');
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Render text, auto-linking URLs and markdown-style [text](url) links */
function renderText(text: string): React.ReactNode {
  // Match markdown links [text](url) with any href, or bare http(s) URLs
  const linkRe = /\[([^\]]+)\]\(([^\s)]+)\)|(https?:\/\/[^\s]+)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = linkRe.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const label = match[1] || match[3];
    const href = match[2] || match[3];
    if (isSafeHref(href)) {
      parts.push(
        <a key={key++} href={href} target="_blank" rel="noopener noreferrer"
          style={{ color: 'var(--primary, #2563eb)', textDecoration: 'underline' }}>
          {label}
        </a>
      );
    } else {
      parts.push(label);
    }
    lastIndex = match.index + match[0].length;
  }
  if (parts.length === 0) return text;
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return <>{parts}</>;
}

export const Text = createReactComponent(TextApi, ({props}) => {
  const text = props.text ?? '';
  const content = typeof text === 'string' ? renderText(text) : text;
  const style: React.CSSProperties = {
    ...getBaseLeafStyle(),
    display: 'inline-block',
    letterSpacing: HEADING_LETTER_SPACING,
  };

  switch (props.variant) {
    case 'h1':
      return <h1 style={{...style, fontWeight: HEADING_WEIGHT, fontSize: '1.5rem', letterSpacing: '-0.025em'}}>{content}</h1>;
    case 'h2':
      return <h2 style={{...style, fontWeight: HEADING_WEIGHT, fontSize: '1.25rem', letterSpacing: '-0.02em'}}>{content}</h2>;
    case 'h3':
      return <h3 style={{...style, fontWeight: HEADING_WEIGHT, fontSize: '1.1rem'}}>{content}</h3>;
    case 'h4':
      return <h4 style={{...style, fontWeight: 500, fontSize: '1rem'}}>{content}</h4>;
    case 'h5':
      return <h5 style={{...style, fontWeight: 500, fontSize: '0.925rem'}}>{content}</h5>;
    case 'caption':
      return <span style={{...style, color: MUTED_FG, textAlign: 'left', fontSize: CAPTION_FONT_SIZE, fontWeight: 400}}>{content}</span>;
    case 'body':
    default:
      return <span style={{...style, fontSize: BODY_FONT_SIZE, lineHeight: 1.5}}>{content}</span>;
  }
});
