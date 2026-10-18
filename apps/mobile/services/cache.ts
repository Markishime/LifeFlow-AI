import {Platform} from 'react-native';
import * as SQLite from 'expo-sqlite';

// Cache contains only nonsensitive counts and sync timestamps. Task/document contents stay off disk.
export async function cacheSummary(owner: string, counts: Record<string, number>) {
  if (Platform.OS === 'web') return;
  const db = await SQLite.openDatabaseAsync('lifeflow-cache.db');
  await db.execAsync('CREATE TABLE IF NOT EXISTS summaries (owner TEXT PRIMARY KEY, counts TEXT NOT NULL, synced_at TEXT NOT NULL)');
  await db.runAsync('INSERT OR REPLACE INTO summaries(owner,counts,synced_at) VALUES (?,?,?)', owner, JSON.stringify(counts), new Date().toISOString());
}
export async function clearCache() {
  if (Platform.OS === 'web') return;
  const db = await SQLite.openDatabaseAsync('lifeflow-cache.db');
  await db.execAsync('DROP TABLE IF EXISTS summaries');
}
