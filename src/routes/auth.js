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
router.get('/auth/discord/callback', passport.authenticate('discord', {
	failureRedirect: '/login',
}), (req, res) => {
	res.redirect('/dashboard');
});

router.get('/logout', (req, res) => {
	req.logout(() => res.redirect('/login'));
});

module.exports = router;
