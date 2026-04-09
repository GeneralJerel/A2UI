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
import {IconApi} from '@a2ui/web_core/v0_9/basic_catalog';
import {getBaseLeafStyle, MUTED_FG} from '../utils';

/**
 * A2UI icon names that don't map directly to Material Symbols ligatures
 * after camelCase→snake_case conversion.
 */
const ICON_ALIASES: Record<string, string> = {
  play: 'play_arrow',
  rewind: 'fast_rewind',
  favorite_off: 'favorite_border',
  star_off: 'star_border',
};

/** Convert camelCase icon names (from A2UI schema) to Material Symbols ligatures. */
function toIconLigature(name: string): string {
  const snaked = name.replace(/([A-Z])/g, '_$1').toLowerCase();
  return ICON_ALIASES[snaked] ?? snaked;
}

export const Icon = createReactComponent(IconApi, ({props}) => {
  const raw =
    typeof props.name === 'string' ? props.name : (props.name as {path?: string})?.path;
  const iconName = raw ? toIconLigature(raw) : undefined;
  const style: React.CSSProperties = {
    ...getBaseLeafStyle(),
    fontFamily: "'Material Symbols Outlined'",
    fontSize: '20px',
    width: '20px',
    height: '20px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: MUTED_FG,
  };

  return (
    <span className="material-symbols-outlined" style={style}>
      {iconName}
    </span>
  );
});
