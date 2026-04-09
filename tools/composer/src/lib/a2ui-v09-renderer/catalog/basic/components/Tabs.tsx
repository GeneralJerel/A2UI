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

import {useState} from 'react';
import {createReactComponent} from '../../../adapter';
import {TabsApi} from '@a2ui/web_core/v0_9/basic_catalog';
import {LEAF_MARGIN, MUTED_FG, FONT_FAMILY, BODY_FONT_SIZE} from '../utils';

// The type of a tab is deeply nested into the TabsApi schema, and
// it seems z.infer is not inferring it correctly (?). We use `any` for now.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type _Tab = any;

export const Tabs = createReactComponent(TabsApi, ({props, buildChild}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const tabs = props.tabs || [];
  const activeTab = tabs[selectedIndex];

  const primaryColor = 'var(--a2ui-primary-color, var(--primary, oklch(0.205 0 0)))';

  return (
    <div style={{display: 'flex', flexDirection: 'column', width: '100%', margin: LEAF_MARGIN, fontFamily: FONT_FAMILY}}>
      <div style={{display: 'flex', borderBottom: '1px solid var(--border, oklch(0.922 0 0))', marginBottom: '8px', gap: '2px'}}>
        {tabs.map((tab: _Tab, i: number) => (
          <button
            key={i}
            onClick={() => setSelectedIndex(i)}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: 'none',
              borderBottom:
                selectedIndex === i ? `2px solid ${primaryColor}` : '2px solid transparent',
              fontWeight: selectedIndex === i ? 500 : 400,
              cursor: 'pointer',
              color: selectedIndex === i ? 'inherit' : MUTED_FG,
              fontSize: BODY_FONT_SIZE,
              fontFamily: FONT_FAMILY,
              transition: 'color 0.15s, border-color 0.15s',
            }}
          >
            {tab.title}
          </button>
        ))}
      </div>
      <div style={{flex: 1}}>{activeTab ? buildChild(activeTab.child) : null}</div>
    </div>
  );
});
