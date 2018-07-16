'use strict';

const express = require('express');
const router = express.Router();

const User = require('../models/user');



/* ========== POST new user ========== */
router.post('/', (req, res, next) => {
  const newUser = {
    fullname: req.body.fullname,
    username: req.body.username,
    password: req.body.password
  };

  return User.create(newUser)
    .then(dbResponse => {
      res.location(`${req.originalUrl}/${dbResponse.id}`).status(201).json(dbResponse);
    })
    .catch(err => next(err));
});

module.exports = router;