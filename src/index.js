require('dotenv').config();
const path = require('node:path');
const express = require('express');
const session = require('express-session');
const passport = require('./auth/passport');
const { initDb } = require('./database/db');
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.urlencoded({ extended: true }));

// keeps people logged in between page loads using a cookie
app.use(session({
	secret: process.env.SESSION_SECRET,
	resave: false,
	saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());

app.use('/', authRoutes);
app.use('/', dashboardRoutes);

app.get('/', (req, res) => {
	res.redirect(req.isAuthenticated() ? '/dashboard' : '/login');
});

const PORT = process.env.PORT || 3000;

// make sure the tables exist before we start actually serving pages
initDb()
	.then(() => {
		app.listen(PORT, () => console.log(`Dashboard running on port ${PORT}`));
	})
	.catch(error => console.error('Could not set up the database:', error));
