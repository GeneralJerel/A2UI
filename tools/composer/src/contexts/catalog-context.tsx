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

'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Catalog } from '@a2ui/web_core/v0_9';
import type { ReactComponentImplementation } from '@/lib/a2ui-v09-renderer/adapter';
import { basicCatalog } from '@/lib/a2ui-v09-renderer';
import {
  buildCustomCatalog,
  buildComponentSummary,
  type CustomComponentDef,
} from '@/lib/custom-catalog';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CatalogInfo {
  /** The Catalog instance used by the renderer */
  catalog: Catalog<ReactComponentImplementation>;
  /** A human-readable label for display */
  label: string;
  /** Whether this is the built-in basic catalog */
  isBasic: boolean;
  /** The raw source code for the catalog definition (JSON) — only for custom catalogs */
  definitionSource?: string;
  /** The raw source code for the renderer — only for custom catalogs */
  rendererSource?: string;
  /** Component summary for LLM prompt generation */
  componentSummary: string;
}

// ---------------------------------------------------------------------------
// localStorage persistence
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'a2ui-custom-catalog';

interface StoredCatalog {
  label: string;
  definitionSource: string; // JSON-stringified CustomComponentDef[]
  rendererSource: string;
}

function saveToStorage(info: CatalogInfo) {
  if (info.isBasic) {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    return;
  }
  try {
    const stored: StoredCatalog = {
      label: info.label,
      definitionSource: info.definitionSource ?? '[]',
      rendererSource: info.rendererSource ?? '',
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // localStorage may be unavailable (SSR, private browsing quota)
  }
}

function loadFromStorage(): CatalogInfo | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const stored: StoredCatalog = JSON.parse(raw);
    const defs: CustomComponentDef[] = JSON.parse(stored.definitionSource);
    if (!Array.isArray(defs) || defs.length === 0) return null;

    const catalogId = 'user-custom-restored';
    const catalog = buildCustomCatalog(catalogId, defs);
    const componentSummary = buildComponentSummary(defs);

    return {
      catalog,
      label: stored.label || 'Custom Catalog',
      isBasic: false,
      definitionSource: stored.definitionSource,
      rendererSource: stored.rendererSource,
      componentSummary,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

function buildBasicCatalogInfo(): CatalogInfo {
  return {
    catalog: basicCatalog,
    label: 'Basic Catalog',
    isBasic: true,
    componentSummary: '', // empty = use the hardcoded A2UI_V09_SYSTEM_PROMPT
  };
}

interface CatalogContextValue {
  /** The currently active catalog */
  activeCatalog: CatalogInfo;
  /** Switch to a custom catalog */
  setCustomCatalog: (info: Omit<CatalogInfo, 'isBasic'>) => void;
  /** Reset to the basic catalog */
  resetToBasic: () => void;
}

const CatalogContext = createContext<CatalogContextValue | null>(null);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [activeCatalog, setActiveCatalog] = useState<CatalogInfo>(buildBasicCatalogInfo);

  // Restore from localStorage on mount (client-only)
  useEffect(() => {
    const restored = loadFromStorage();
    if (restored) {
      setActiveCatalog(restored);
    }
  }, []);

  const setCustomCatalog = useCallback((info: Omit<CatalogInfo, 'isBasic'>) => {
    const catalogInfo: CatalogInfo = { ...info, isBasic: false };
    setActiveCatalog(catalogInfo);
    saveToStorage(catalogInfo);
  }, []);

  const resetToBasic = useCallback(() => {
    const basic = buildBasicCatalogInfo();
    setActiveCatalog(basic);
    saveToStorage(basic); // removes from localStorage
  }, []);

  return (
    <CatalogContext.Provider value={{ activeCatalog, setCustomCatalog, resetToBasic }}>
      {children}
    </CatalogContext.Provider>
  );
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) {
    throw new Error('useCatalog must be used within a CatalogProvider');
  }
  return ctx;
}
