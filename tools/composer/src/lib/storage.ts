import localforage from 'localforage';
import { Widget } from '@/types/widget';

const WIDGETS_KEY = 'widgets';
const STORAGE_VERSION_KEY = 'storage_version';
// Bump this to clear all stored widgets on next load (e.g. after breaking changes)
const CURRENT_STORAGE_VERSION = 2;

localforage.config({
  name: 'widget-builder',
  storeName: 'widgets',
});

let migrated = false;
let lastMigrationWiped = false;

async function migrateIfNeeded(): Promise<void> {
  if (migrated) return;
  const version = await localforage.getItem<number>(STORAGE_VERSION_KEY);
  if (version !== CURRENT_STORAGE_VERSION) {
    await localforage.setItem(WIDGETS_KEY, []);
    await localforage.setItem(STORAGE_VERSION_KEY, CURRENT_STORAGE_VERSION);
    lastMigrationWiped = version !== null; // only notify if upgrading, not first visit
  }
  migrated = true;
}

export function didMigrationWipe(): boolean {
  return lastMigrationWiped;
}

export async function getWidgets(): Promise<Widget[]> {
  await migrateIfNeeded();
  const widgets = await localforage.getItem<Widget[]>(WIDGETS_KEY);
  return widgets || [];
}

export async function saveWidget(widget: Widget): Promise<void> {
  const widgets = await getWidgets();
  const index = widgets.findIndex(w => w.id === widget.id);
  if (index >= 0) {
    widgets[index] = widget;
  } else {
    widgets.push(widget);
  }
  await localforage.setItem(WIDGETS_KEY, widgets);
}

export async function deleteWidget(id: string): Promise<void> {
  const widgets = await getWidgets();
  await localforage.setItem(WIDGETS_KEY, widgets.filter(w => w.id !== id));
}

export async function clearAllWidgets(): Promise<void> {
  await localforage.setItem(WIDGETS_KEY, []);
}
