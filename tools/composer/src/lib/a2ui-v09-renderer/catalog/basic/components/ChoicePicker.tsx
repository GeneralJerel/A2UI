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

import React, {useState} from 'react';
import {createReactComponent} from '../../../adapter';
import {ChoicePickerApi} from '@a2ui/web_core/v0_9/basic_catalog';
import {LEAF_MARGIN, STANDARD_BORDER, INNER_RADIUS, PRIMARY_COLOR, PRIMARY_FG, MUTED_FG, FONT_FAMILY, CAPTION_FONT_SIZE, BODY_FONT_SIZE} from '../utils';

// The type of an option is deeply nested into the ChoicePickerApi schema, and
// it seems z.infer is not inferring it correctly (?). We use `any` for now.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type _Option = any;

export const ChoicePicker = createReactComponent(ChoicePickerApi, ({props, context}) => {
  const [filter, setFilter] = useState('');

  const values = Array.isArray(props.value) ? props.value : [];
  const isMutuallyExclusive = props.variant === 'mutuallyExclusive';

  const onToggle = (val: string) => {
    if (isMutuallyExclusive) {
      props.setValue([val]);
    } else {
      const newValues = values.includes(val)
        ? values.filter((v: string) => v !== val)
        : [...values, val];
      props.setValue(newValues);
    }
  };

  const options = (props.options || []).filter(
    (opt: _Option) =>
      !props.filterable ||
      filter === '' ||
      String(opt.label).toLowerCase().includes(filter.toLowerCase())
  );

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    margin: LEAF_MARGIN,
    width: '100%',
    fontFamily: FONT_FAMILY,
  };

  const listStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: props.displayStyle === 'chips' ? 'row' : 'column',
    flexWrap: props.displayStyle === 'chips' ? 'wrap' : 'nowrap',
    gap: '6px',
  };

  return (
    <div style={containerStyle}>
      {props.label && <strong style={{fontSize: CAPTION_FONT_SIZE, fontWeight: 500, color: MUTED_FG}}>{props.label}</strong>}
      {props.filterable && (
        <input
          type="text"
          placeholder="Filter options..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{padding: '6px 10px', border: STANDARD_BORDER, borderRadius: INNER_RADIUS, fontSize: BODY_FONT_SIZE, fontFamily: FONT_FAMILY, backgroundColor: 'transparent', outline: 'none'}}
        />
      )}
      <div style={listStyle}>
        {options.map((opt: _Option, i: number) => {
          const isSelected = values.includes(opt.value);
          if (props.displayStyle === 'chips') {
            return (
              <button
                key={i}
                onClick={() => onToggle(opt.value)}
                style={{
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  border: isSelected
                    ? `1px solid ${PRIMARY_COLOR}`
                    : STANDARD_BORDER,
                  backgroundColor: isSelected ? PRIMARY_COLOR : 'transparent',
                  color: isSelected ? PRIMARY_FG : 'inherit',
                  cursor: 'pointer',
                  fontSize: CAPTION_FONT_SIZE,
                  fontFamily: FONT_FAMILY,
                  transition: 'background-color 0.15s, border-color 0.15s',
                }}
              >
                {opt.label}
              </button>
            );
          }
          return (
            <label
              key={i}
              style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'}}
            >
              <input
                type={isMutuallyExclusive ? 'radio' : 'checkbox'}
                checked={isSelected}
                onChange={() => onToggle(opt.value)}
                name={isMutuallyExclusive ? `choice-${context.componentModel.id}` : undefined}
                style={{accentColor: 'var(--primary, oklch(0.205 0 0))'}}
              />
              <span style={{fontSize: BODY_FONT_SIZE}}>{opt.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
});
