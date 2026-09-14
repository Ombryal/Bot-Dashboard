require('dotenv').config();
const path = require('node:path');
const express = require('express');
const cookieSession = require('cookie-session');
const passport = require('./auth/passport');
const { initDb } = require('./database/db');
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.urlencoded({ extended: true }));

// storing the session in an encrypted cookie instead of server memory - this is what
// makes login work on serverless hosts like vercel, since there's no shared memory
// between requests there (each request can hit a totally different server instance)
app.use(cookieSession({
	name: 'session',
	keys: [process.env.SESSION_SECRET],
	maxAge: 24 * 60 * 60 * 1000, // 24 hours
}));

// cookie-session doesn't have regenerate/save methods that passport expects,
// this little patch adds fake versions so passport doesn't error out
app.use((req, res, next) => {
	if (req.session && !req.session.regenerate) {
		req.session.regenerate = (cb) => cb();
	}
	if (req.session && !req.session.save) {
		req.session.save = (cb) => cb();
	}
	next();
});

app.use(passport.initialize());
app.use(passport.session());

app.use('/', authRoutes);
app.use('/', dashboardRoutes);

app.get('/', (req, res) => {
	res.redirect(req.isAuthenticated() ? '/dashboard' : '/login');
});

// making sure our tables exist - safe to call every time since it's all "IF NOT EXISTS"
initDb().catch(error => console.error('Could not set up the database:', error));

// on a normal host (replit, render, etc) we start the server ourselves.
// on vercel, it imports this file and handles starting things on its own,
// so we skip app.listen there and just export the app instead
if (require.main === module) {
	const PORT = process.env.PORT || 3000;
	app.listen(PORT, () => console.log(`Dashboard running on port ${PORT}`));
}

module.exports = app;
