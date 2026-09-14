const passport = require('passport');
const { Strategy: DiscordStrategy } = require('passport-discord');

// I'll just stuff the whole discord profile thingy into the session, since it's small enough
// and saves us hitting discord's api again every single page load
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(new DiscordStrategy({
	clientID: process.env.CLIENT_ID,
	clientSecret: process.env.CLIENT_SECRET,
	callbackURL: process.env.CALLBACK_URL,
	// "identify" gets us their username/avatar, "guilds" gets us the list of
	// servers they're in (plus their permission level in each) so we can figure
	// out which servers they're actually allowed to manage
	scope: ['identify', 'guilds'],
}, (accessToken, refreshToken, profile, done) => {
	return done(null, profile);
}));

module.exports = passport;
