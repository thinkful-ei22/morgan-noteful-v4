'use strict';

const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');

const Note = require('../models/note');
const Folder = require('../models/folder');
const Tag = require('../models/tag');

const router = express.Router();

router.use('/', passport.authenticate('jwt', {session: false, failWithError: true}));





/* ========== GET/READ ALL ITEMS ========== */
router.get('/', (req, res, next) => {
  const { searchTerm, folderId, tagId } = req.query;
  const userId = req.user.id;

  if(!mongoose.Types.ObjectId.isValid(userId)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  let filter = {'userId': userId};

  if (searchTerm) {
    const re = new RegExp(searchTerm, 'i');
    filter.$or = [{ 'title': re }, { 'content': re }];
  }

  if (folderId) {
    filter.folderId = folderId;
  }

  if (tagId) {
    filter.tags = tagId;
  }

  Note.find(filter)
    .populate('tags')
    .sort({ updatedAt: 'desc' })
    .then(results => {
      res.json(results);
    })
    .catch(err => {
      next(err);
    });
});







/* ========== GET/READ A SINGLE ITEM ========== */
router.get('/:id', (req, res, next) => {
  const noteId = req.params.id;
  const userId = req.user.id;

  if (!mongoose.Types.ObjectId.isValid(noteId)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    const err = new Error('The `userId` is not valid');
    err.status = 400;
    return next(err);
  }

  Note.findOne({'userId': userId, '_id': noteId})
    .populate('tags')
    .then(result => {
      console.log('DB RESULT', result);
      if (result) {
        res.json(result);
      } else {
        next();
      }
    })
    .catch(err => {
      next(err);
    });
});







/* ========== POST/CREATE AN ITEM ========== */
router.post('/', (req, res, next) => {
  const { title, content, folderId, tags = [] } = req.body;
  const userId = req.user.id;

  //validates that title exists
  if (!title) {
    const err = new Error('Missing `title` in request body');
    err.status = 400;
    return next(err);
  }

  //validates that folderId is valid mongo ObjectId
  if ((folderId) && !mongoose.Types.ObjectId.isValid(folderId)) {
    const err = new Error('The `folderId` is not valid');
    err.status = 400;
    return next(err);
  }

  //validates that each tagId is a valid mongo ObjectId
  if (tags.length > 0) {
    if(tags.find( tagId => !mongoose.Types.ObjectId.isValid(tagId)) ){
      const err = new Error('The tags `id` is not valid');
      err.status = 400;
      return next(err);
    }
  }


  const newNote = { title, content, folderId, tags, userId };
  //creates new note, replaces <folderId = ''> with <folderId = null>
  if(newNote.folderId === '') {
    newNote.folderId = null;
  }

  //validates that the folder with that folderId does belong to the user
  const validateFolderId = new Promise (function(resolve, reject){
    if(newNote.folderId) {
      resolve(Folder.countDocuments({'_id': folderId, 'userId': userId}));
    } else {
      resolve(1);
    }
  });

  //validates that each tagId does belong to the user
  // iterates through [tagId, tagId, tagId]
  // turns it into [promise, promise, promise]
  // then calls Promise.all[], which returns [0, 1, 1]
  // then converts [0, 1, 1] to [false, true, true] before passing on
  const validateTagId = new Promise( (resolve, reject) => {
    if(tags.length > 0) {
      const promiseArray = tags.map(tagId => {
        return Tag.countDocuments({'_id': tagId, 'userId': userId});
      });
      Promise.all(promiseArray).then( counts => {
        resolve(counts);
      });

    } else {
      resolve([1]);
    }
  });

  //validate folderId, THEN validate tagId's, THEN makes database update
  validateFolderId
    .then( folderCount => {
      if(folderCount === 0){
        const err = new Error('The specified Folder does not belong to the current user');
        err.status = 401;
        return Promise.reject(err);
      }
      return validateTagId;
    })
    .then(tagResult => {
      if(tagResult.includes(0)){
        const err = new Error('One or more tag IDs do not belong to the current user');
        err.status = 401;
        return Promise.reject(err);
      }
      return Note.create(newNote);
    })
    .then(result => {
      res
        .location(`${req.originalUrl}/${result.id}`)
        .status(201)
        .json(result);
    })
    .catch(err => {
      next(err);
    });
});
//Test by adding Bob's note using Bob's token (bobuser, userId: 333333333333333333333300)
//  to Pat's folder: (folderId: "111111111111111111111105", Drafts)







/* ========== PUT/UPDATE A SINGLE ITEM ========== */
router.put('/:id', (req, res, next) => {
  const noteId = req.params.id;
  const { title, content, folderId, tags = [] } = req.body;
  const userId = req.user.id;

  //checks that the noteId is a valid mongo ID format
  if (!mongoose.Types.ObjectId.isValid(noteId)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  //checks that the title is included
  if (title === '') {
    const err = new Error('Missing `title` in request body');
    err.status = 400;
    return next(err);
  }

  //checks that the folderId is a valid mongo ID (if it exists)
  if (folderId && !mongoose.Types.ObjectId.isValid(folderId)) {
    const err = new Error('The `folderId` is not valid');
    err.status = 400;
    return next(err);
  }

  //checks that each tag is a valid mongo ID (for each tag in the array)
  if (tags.length > 0) {
    const badIds = tags.filter((tag) => !mongoose.Types.ObjectId.isValid(tag));
    if (badIds.length) {
      const err = new Error('The tags `id` is not valid');
      err.status = 400;
      return next(err);
    }
  }

  //creates the update object to be passed to database. If folderId is empty string, reassigns it NULL
  const updateNote = { title, content, folderId, tags };
  if(updateNote.folderId === ''){
    updateNote.folderId = null;
  }

  //validates that the folder with that folderId does belong to the user
  const validateFolderId = new Promise (function(resolve, reject){
    if(updateNote.folderId) {
      resolve(Folder.countDocuments({'_id': folderId, 'userId': userId}));
    } else {
      resolve(1);
    }
  });

  //validates that each tagId does belong to the user
  // iterates through [tagId, tagId, tagId]
  // turns it into [promise, promise, promise]
  // then calls Promise.all[], which returns [0, 1, 1]
  // then converts [0, 1, 1] to [false, true, true] before passing on
  const validateTagId = new Promise( (resolve, reject) => {
    if(tags.length > 0) {
      const promiseArray = tags.map(tagId => {
        return Tag.countDocuments({'_id': tagId, 'userId': userId});
      });
      Promise.all(promiseArray).then( counts => {
        resolve(counts);
      });

    } else {
      resolve([1]);
    }
  });

  //validate folderId, THEN validate tagId's, THEN makes database update
  validateFolderId
    .then( folderCount => {
      if(folderCount === 0){
        const err = new Error('The specified Folder does not belong to the current user');
        err.status = 401;
        return Promise.reject(err);
      }
      return validateTagId;
    })
    .then(tagResult => {
      if(tagResult.includes(0)){
        const err = new Error('One or more tag IDs do not belong to the current user');
        err.status = 401;
        return Promise.reject(err);
      }
      return Note.findOneAndUpdate({'_id': noteId, 'userId': userId}, updateNote, { new: true });
    })
    .then(result => {
      if (result) {
        res.json(result);
      } else {
        return next();
      }
    })
    .catch(err => {
      return next(err);
    });
});



/* ========== DELETE/REMOVE A SINGLE ITEM ========== */
router.delete('/:id', (req, res, next) => {
  const noteId = req.params.id;
  const userId = req.user.id;

  /***** Never trust users - validate input *****/
  if (!mongoose.Types.ObjectId.isValid(noteId)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  Note.findOneAndRemove({'_id': noteId, 'userId': userId})
    .then(() => {
      res.sendStatus(204);
    })
    .catch(err => {
      next(err);
    });
});

module.exports = router;