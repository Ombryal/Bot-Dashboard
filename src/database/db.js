const { createClient } = require('@libsql/client');

// same database the bot uses - this is how settings saved here actually
// reach the bot without us having to build our own API between the two
const db = createClient({
	url: process.env.TURSO_DATABASE_URL,
	authToken: process.env.TURSO_AUTH_TOKEN,
});

// safe to run even if the bot already made this table, just makes sure it's there
async function initDb() {
	await db.execute(`
		CREATE TABLE IF NOT EXISTS guild_settings (
			guild_id TEXT PRIMARY KEY,
			warn_limit INTEGER NOT NULL DEFAULT 3,
			warn_action TEXT NOT NULL DEFAULT 'none',
			mod_log_channel_id TEXT,
			updated_at INTEGER
		)
	`);

	// one on/off toggle per category card on the hub page. using "IF NOT EXISTS" on each
	// so this stays safe to run every time, even on servers that already have these columns
	const categoryColumns = [
		"ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS mod_enabled INTEGER NOT NULL DEFAULT 1",
		"ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS leveling_enabled INTEGER NOT NULL DEFAULT 1",
		"ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS logging_enabled INTEGER NOT NULL DEFAULT 0",
		"ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS utility_enabled INTEGER NOT NULL DEFAULT 1",
	];

	for (const sql of categoryColumns) {
		await db.execute(sql);
	}
}

module.exports = { db, initDb };
