const express = require('express');
const { db } = require('../database/db');

const router = express.Router();

// discord permission bits we care about - if someone has either of these
// in a server, we consider them allowed to manage that server's bot settings
const ADMINISTRATOR = 0x8;
const MANAGE_GUILD = 0x20;

// stops anyone from even loading these pages unless they're logged in
function requireLogin(req, res, next) {
	if (!req.isAuthenticated()) return res.redirect('/login');
	next();
}

function canManage(guild) {
	const perms = BigInt(guild.permissions);
	return (perms & BigInt(ADMINISTRATOR)) === BigInt(ADMINISTRATOR)
		|| (perms & BigInt(MANAGE_GUILD)) === BigInt(MANAGE_GUILD);
}

// the "pick a server" page - only shows servers where they're actually an admin/mod
router.get('/dashboard', requireLogin, (req, res) => {
	const manageableGuilds = req.user.guilds.filter(canManage);
	res.render('dashboard-guilds', { guilds: manageableGuilds });
});

// the actual settings page for one specific server
router.get('/dashboard/:guildId', requireLogin, async (req, res) => {
	const { guildId } = req.params;

	// double check they're actually allowed to manage this specific server,
	// otherwise someone could just type a random server id into the url
	const guild = req.user.guilds.find(g => g.id === guildId);
	if (!guild || !canManage(guild)) {
		return res.status(403).send('You don\'t have permission to manage that server.');
	}

	const result = await db.execute({
		sql: 'SELECT * FROM guild_settings WHERE guild_id = ?',
		args: [guildId],
	});

	// nobody's saved settings for this server yet, so just show sensible defaults
	const settings = result.rows[0] || { warn_limit: 3, warn_action: 'none', mod_log_channel_id: '' };

	res.render('dashboard-settings', { guild, settings, saved: req.query.saved });
});

// saving the form
router.post('/dashboard/:guildId', requireLogin, async (req, res) => {
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

	res.redirect(`/dashboard/${guildId}?saved=1`);
});

module.exports = router;
