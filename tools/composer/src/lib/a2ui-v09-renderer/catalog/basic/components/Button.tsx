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
import {ButtonApi} from '@a2ui/web_core/v0_9/basic_catalog';
import {LEAF_MARGIN, STANDARD_BORDER, INNER_RADIUS, PRIMARY_COLOR, PRIMARY_FG, FONT_FAMILY, BODY_FONT_SIZE} from '../utils';

export const Button = createReactComponent(ButtonApi, ({props, buildChild}) => {
  const [hovered, setHovered] = React.useState(false);
  const isPrimary = props.variant === 'primary';
  const isBorderless = props.variant === 'borderless';
  const isDisabled = props.isValid === false;

  const style: React.CSSProperties = {
    margin: LEAF_MARGIN,
    padding: isBorderless ? '6px 8px' : isPrimary ? '10px 24px' : '8px 16px',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    border: isBorderless ? 'none' : isPrimary ? 'none' : STANDARD_BORDER,
    backgroundColor: isPrimary
      ? PRIMARY_COLOR
      : isBorderless
        ? 'transparent'
        : 'var(--card, #fff)',
    color: isPrimary ? PRIMARY_FG : 'inherit',
    borderRadius: '9999px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
    fontFamily: FONT_FAMILY,
    fontSize: BODY_FONT_SIZE,
    fontWeight: 600,
    opacity: isDisabled ? 0.5 : hovered && isPrimary ? 0.9 : 1,
    transition: 'background-color 0.15s, opacity 0.15s, transform 0.1s',
    boxShadow: isPrimary ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
    transform: hovered && !isDisabled ? 'scale(1.02)' : 'none',
  };

  return (
    <button
      style={style}
      onClick={props.action}
      disabled={isDisabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {props.child ? buildChild(props.child) : null}
    </button>
  );
});
