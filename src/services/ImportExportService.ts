import { db } from '../db';

export const ImportExportService = {
  async exportData(): Promise<string> {
    const allTables = db.tables.map((table) => table.name);
    const data: Record<string, any[]> = {};

    for (const tableName of allTables) {
      data[tableName] = await db.table(tableName).toArray();
    }

    const exportObject = {
      schemaVersion: 1,
      exportedAt: Date.now(),
      data
    };

    return JSON.stringify(exportObject, null, 2);
  },

  async importData(jsonString: string): Promise<void> {
    const parsed = JSON.parse(jsonString);

    if (!parsed.schemaVersion || !parsed.data) {
      throw new Error('Invalid export format.');
    }

    await db.transaction('rw', db.tables, async () => {
      const tableNames = db.tables.map((t) => t.name);
      for (const tName of tableNames) {
        await db.table(tName).clear();
        if (parsed.data[tName]) {
          await db.table(tName).bulkAdd(parsed.data[tName]);
        }
      }
    });
  }
};
