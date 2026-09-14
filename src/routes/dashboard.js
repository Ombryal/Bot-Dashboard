const express = require('express');
const { db } = require('../database/db');

const router = express.Router();

// discord permission bits we care about - if someone has either of these
// in a server, we consider them allowed to manage that server's bot settings
const ADMINISTRATOR = 0x8;
const MANAGE_GUILD = 0x20;

// the only columns we let /toggle touch - keeps someone from posting a random
// column name and messing with something they shouldn't be able to
const TOGGLE_COLUMNS = ['mod_enabled', 'leveling_enabled', 'logging_enabled', 'utility_enabled'];

function requireLogin(req, res, next) {
	if (!req.isAuthenticated()) return res.redirect('/login');
	next();
}

function canManage(guild) {
	const perms = BigInt(guild.permissions);
	return (perms & BigInt(ADMINISTRATOR)) === BigInt(ADMINISTRATOR)
		|| (perms & BigInt(MANAGE_GUILD)) === BigInt(MANAGE_GUILD);
}

function avatarUrlFor(user) {
	if (user.avatar) {
		return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
	}
	// they've got no custom avatar set, fall back to one of discord's default ones
	return `https://cdn.discordapp.com/embed/avatars/${(user.discriminator || 0) % 5}.png`;
}

// the "pick a server" page
router.get('/dashboard', requireLogin, (req, res) => {
	const manageableGuilds = req.user.guilds.filter(canManage);
	res.render('dashboard-guilds', { guilds: manageableGuilds });
});

// the new server hub - crest, category toggle cards, profile menu
router.get('/dashboard/:guildId', requireLogin, async (req, res) => {
	const { guildId } = req.params;

	const guild = req.user.guilds.find(g => g.id === guildId);
	if (!guild || !canManage(guild)) {
		return res.status(403).send('You don\'t have permission to manage that server.');
	}

	const result = await db.execute({
		sql: 'SELECT * FROM guild_settings WHERE guild_id = ?',
		args: [guildId],
	});

	// nobody's touched this server yet, so these are just sensible defaults
	const settings = result.rows[0] || {
		mod_enabled: 1,
		leveling_enabled: 1,
		logging_enabled: 0,
		utility_enabled: 1,
	};

	res.render('dashboard-server', {
		guild,
		settings,
		user: req.user,
		avatarUrl: avatarUrlFor(req.user),
	});
});

// flips one category on/off - called quietly in the background from the page,
// no full reload, the switch just updates itself once this responds
router.post('/dashboard/:guildId/toggle', async (req, res) => {
	if (!req.isAuthenticated()) return res.status(401).json({ error: 'not logged in' });

	const { guildId } = req.params;
	const { category } = req.body;

	const guild = req.user.guilds.find(g => g.id === guildId);
	if (!guild || !canManage(guild)) {
		return res.status(403).json({ error: 'forbidden' });
	}

	if (!TOGGLE_COLUMNS.includes(category)) {
		return res.status(400).json({ error: 'unknown category' });
	}

	// make sure a row exists for this server first, then flip the one column between 0 and 1
	await db.execute({
		sql: 'INSERT INTO guild_settings (guild_id) VALUES (?) ON CONFLICT(guild_id) DO NOTHING',
		args: [guildId],
	});

	await db.execute({
		sql: `UPDATE guild_settings SET ${category} = CASE ${category} WHEN 1 THEN 0 ELSE 1 END, updated_at = ? WHERE guild_id = ?`,
		args: [Date.now(), guildId],
	});

	const result = await db.execute({
		sql: `SELECT ${category} AS value FROM guild_settings WHERE guild_id = ?`,
		args: [guildId],
	});

	res.json({ value: result.rows[0].value });
});

// the moderation settings page from before - not linked from any card yet,
// still here and ready for when we wire that card up
router.get('/dashboard/:guildId/moderation', requireLogin, async (req, res) => {
	const { guildId } = req.params;

	const guild = req.user.guilds.find(g => g.id === guildId);
	if (!guild || !canManage(guild)) {
		return res.status(403).send('You don\'t have permission to manage that server.');
	}

	const result = await db.execute({
		sql: 'SELECT * FROM guild_settings WHERE guild_id = ?',
		args: [guildId],
	});

	const settings = result.rows[0] || { warn_limit: 3, warn_action: 'none', mod_log_channel_id: '' };

	res.render('dashboard-settings', { guild, settings, saved: req.query.saved });
});

router.post('/dashboard/:guildId/moderation', requireLogin, async (req, res) => {
	const { guildId } = req.params;

	const guild = req.user.guilds.find(g => g.id === guildId);
	if (!guild || !canManage(guild)) {
		return res.status(403).send('You don\'t have permission to manage that server.');
	}

	const warnLimit = parseInt(req.body.warn_limit, 10) || 3;
	const warnAction = req.body.warn_action || 'none';
	const modLogChannelId = req.body.mod_log_channel_id || null;

	await db.execute({
		sql: `
			INSERT INTO guild_settings (guild_id, warn_limit, warn_action, mod_log_channel_id, updated_at)
			VALUES (?, ?, ?, ?, ?)
			ON CONFLICT(guild_id) DO UPDATE SET
				warn_limit = excluded.warn_limit,
				warn_action = excluded.warn_action,
				mod_log_channel_id = excluded.mod_log_channel_id,
				updated_at = excluded.updated_at
		`,
		args: [guildId, warnLimit, warnAction, modLogChannelId, Date.now()],
	});

	res.redirect(`/dashboard/${guildId}/moderation?saved=1`);
});

module.exports = router;
