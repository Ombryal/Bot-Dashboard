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
}

module.exports = { db, initDb };
