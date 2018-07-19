'use strict';

const express = require('express');
const router = express.Router();

const User = require('../models/user');



/* ========== POST new user ========== */
router.post('/', (req, res, next) => {
  let fullname = req.body.fullname.trim();
  const password = req.body.password;
  const username = req.body.username;
  if(fullname === null){
    fullname = '';
  }

  //checks that username exists (not empty string or null)
  if(!username){
    const err = new Error('Username field is required');
    err.status = 422;
    return next(err);
  }

  //checks that password exists (not empty string or null)
  if(!password){
    const err = new Error('Password field is required');
    err.status = 422;
    return next(err);
  }


  //checks that all fields are String data
  const notString = [fullname, password, username].find(field => typeof field !== 'string');
  
  if(notString){
    const err = new Error(`Expect ${notString} to be of data type 'string'`);
    err.status = 422;
    return next(err);
  }



  //checks that all fields have no whitespace at the beginning or end
  const notTrimmedField = [username, password].find(field => field.trim() !== field);

  if(notTrimmedField){
    const err = new Error(`Should not be whitespace at beginning or end of ${notTrimmedField}`);
    err.status = 422;
    return next(err);
  }



  //checks that username is at least 1 character
  if(username.length < 1) {
    const err = new Error('username must be at least 1 character');
    err.status = 422;
    return next(err);
  }

  //checks that password is between 8 and 72 characters (inclusively)
  if(password.length < 8 || password.length > 72) {
    const err = new Error('password must be at least 8 characters and no more than 72 characters in length');
    err.status = 422;
    return next(err);
  }


  //hashes password, creates user in database, then returns fullname/username/id
  return User.hashPassword(password)
    .then( digest => {
      const newUser = {
        'fullname': fullname,
        'username': username,
        'password': digest
      };

      return User.create(newUser);
    })
    .then(dbResponse => {
      res.location(`${req.originalUrl}/${dbResponse.id}`).status(201).json(dbResponse);
    })
    .catch(err => {
      if(err.code === 11000){     //code 11000 is mongoose code for duplicate data
        err = new Error('The username already exists');
        err.status = 400;
      }
      next(err);
    });
});

module.exports = router;