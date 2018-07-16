'use strict';

//const mongoose = require('mongoose');
const express = require('express');
const passport = require('passport');
//const localStrategy = require('../passport/local');

const router = express.Router();


const localAuth = passport.authenticate('local', {session: false, failWithError: true});

router.post('/', localAuth, function(req, res) {
  return res.json(req.user);
});

module.exports = router;