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
import {TextFieldApi} from '@a2ui/web_core/v0_9/basic_catalog';
import {LEAF_MARGIN, STANDARD_BORDER, INNER_RADIUS, MUTED_FG, FONT_FAMILY, BODY_FONT_SIZE, CAPTION_FONT_SIZE, SMALL_FONT_SIZE} from '../utils';

export const TextField = createReactComponent(TextFieldApi, ({props}) => {
  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    props.setValue(e.target.value);
  };

  const isLong = props.variant === 'longText';
  const type =
    props.variant === 'number' ? 'number' : (props.variant as string) === 'password' || props.variant === 'obscured' ? 'password' : 'text';

  const hasError = props.validationErrors && props.validationErrors.length > 0;

  const style: React.CSSProperties = {
    padding: '8px 12px',
    width: '100%',
    border: hasError ? '1px solid var(--destructive, oklch(0.577 0.245 27.325))' : STANDARD_BORDER,
    borderRadius: INNER_RADIUS,
    boxSizing: 'border-box',
    fontFamily: FONT_FAMILY,
    fontSize: BODY_FONT_SIZE,
    backgroundColor: 'transparent',
    color: 'inherit',
    outline: 'none',
    transition: 'border-color 0.15s',
  };

  const uniqueId = React.useId();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        width: '100%',
        margin: LEAF_MARGIN,
      }}
    >
      {props.label && (
        <label htmlFor={uniqueId} style={{fontSize: CAPTION_FONT_SIZE, fontWeight: 500, color: MUTED_FG}}>
          {props.label}
        </label>
      )}
      {isLong ? (
        <textarea
          id={uniqueId}
          style={style}
          value={props.value || ''}
          onChange={onChange}
        />
      ) : (
        <input
          id={uniqueId}
          type={type}
          style={style}
          value={props.value || ''}
          onChange={onChange}
        />
      )}
      {hasError && (
        <span style={{fontSize: SMALL_FONT_SIZE, color: 'var(--destructive, oklch(0.577 0.245 27.325))'}}>
          {props.validationErrors![0]}
        </span>
      )}
    </div>
  );
});
