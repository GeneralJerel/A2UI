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
import {SliderApi} from '@a2ui/web_core/v0_9/basic_catalog';
import {LEAF_MARGIN, MUTED_FG, FONT_FAMILY, CAPTION_FONT_SIZE} from '../utils';

export const Slider = createReactComponent(SliderApi, ({props}) => {
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    props.setValue(Number(e.target.value));
  };

  const uniqueId = React.useId();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        margin: LEAF_MARGIN,
        width: '100%',
        fontFamily: FONT_FAMILY,
      }}
    >
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'}}>
        {props.label && (
          <label htmlFor={uniqueId} style={{fontSize: CAPTION_FONT_SIZE, fontWeight: 500, color: MUTED_FG}}>
            {props.label}
          </label>
        )}
        <span style={{fontSize: CAPTION_FONT_SIZE, color: MUTED_FG, fontVariantNumeric: 'tabular-nums'}}>{props.value}</span>
      </div>
      <input
        id={uniqueId}
        type="range"
        min={props.min ?? 0}
        max={props.max}
        value={props.value ?? 0}
        onChange={onChange}
        style={{width: '100%', cursor: 'pointer', accentColor: 'var(--primary, oklch(0.205 0 0))'}}
      />
    </div>
  );
});
