// Web previews keep their query cache in memory; native SQLite is never bundled into the web app.
export async function cacheSummary(_owner: string, _counts: Record<string, number>) {}
export async function clearCache() {}
