'use strict';

const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRY } = require('../config');

const router = express.Router();

const createAuthToken = function(user){
  return jwt.sign({user}, JWT_SECRET, {
    //algorithm: 'HS256',   this is the default algorithm from node
    subject: user.username,
    expiresIn:JWT_EXPIRY
  });
};

const jwtAuth = passport.authenticate('jwt', {session: false, failWithError: true});
const localAuth = passport.authenticate('local', {session: false, failWithError: true});

router.post('/login', localAuth, function(req, res) {
  const authToken = createAuthToken(req.user);
  return res.json({authToken});
});

router.post('/refresh', jwtAuth, function(req, res){
  const authToken = createAuthToken(req.user);
  return res.json({authToken});
});

module.exports = router;