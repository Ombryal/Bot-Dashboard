const express = require('express');
const passport = require('passport');

const router = express.Router();

// shows a simple "login with discord" button
router.get('/login', (req, res) => {
	if (req.isAuthenticated()) return res.redirect('/dashboard');
	res.render('login');
});

// this kicks off the redirect to discord's actual login page
router.get('/auth/discord', passport.authenticate('discord'));

// discord sends them back here after they approve the login
// doing this manually (instead of the one-liner passport.authenticate with failureRedirect)
// so that if login fails, we can actually see WHY in the logs instead of it failing silently
router.get('/auth/discord/callback', (req, res, next) => {
	passport.authenticate('discord', (err, user, info) => {
		if (err) {
			console.error('Discord auth threw an error:', err);
			return res.redirect('/login');
		}
		if (!user) {
			console.error('Discord auth failed, info:', info);
			return res.redirect('/login');
		}
		req.logIn(user, (loginErr) => {
			if (loginErr) {
				console.error('req.logIn failed:', loginErr);
				return res.redirect('/login');
			}
			return res.redirect('/dashboard');
		});
	})(req, res, next);
});

router.get('/logout', (req, res) => {
	req.logout(() => res.redirect('/login'));
});

module.exports = router;
