'use strict';

const app = require('../server');
const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');

const { TEST_MONGODB_URI } = require('../config');

const User = require('../models/user');

const expect = chai.expect;

chai.use(chaiHttp);

describe('Noteful API - Users', function () {
  const username = 'exampleUser';
  const password = 'examplePass';
  const fullname = 'Example User';

  before(function () {
    return mongoose.connect(TEST_MONGODB_URI)
      .then(() => mongoose.connection.db.dropDatabase());
  });

  beforeEach(function () {
    this.timeout(6000);
    return User.createIndexes();
  });

  afterEach(function () {
    this.timeout(6000);
    return mongoose.connection.db.dropDatabase();
  });

  after(function () {
    return mongoose.disconnect();
  });
  
  describe('/api/users', function () {

    describe('POST', function () {
      it('Should create a new user', function () {
        const testUser = { username, password, fullname };

        let res;
        return chai
          .request(app)
          .post('/api/users')
          .send(testUser)
          .then(_res => {
            res = _res;
            expect(res).to.have.status(201);
            expect(res.body).to.be.an('object');
            expect(res.body).to.have.keys('id', 'username', 'fullname');

            expect(res.body.id).to.exist;
            expect(res.body.username).to.equal(testUser.username);
            expect(res.body.fullname).to.equal(testUser.fullname);

            return User.findOne({ username });
          })
          .then(user => {
            expect(user).to.exist;
            expect(user.id).to.equal(res.body.id);
            expect(user.fullname).to.equal(testUser.fullname);
            return user.validatePassword(password);
          })
          .then(isValid => {
            expect(isValid).to.be.true;
          });
      });


      it('Should reject users with missing username', function () {
        const testUser = { password, fullname };

        return chai.request(app).post('/api/users').send(testUser)
          .then(res => {
            expect(res).to.have.status(422);
            expect(res.body.message).to.equal('Username field is required');
            return User.countDocuments();
          })
          .then(function(dbResponse){
            expect(dbResponse).to.equal(0);
          });
      });


      it('Should reject users with missing password', function(){
        const testUser = {username, fullname};

        return chai.request(app).post('/api/users').send(testUser)
          .then(function(apiResponse){
            expect(apiResponse).to.have.status(422);
            expect(apiResponse.body.message).to.equal('Password field is required');
            return User.countDocuments();
          })
          .then(function(dbResponse){
            expect(dbResponse).to.equal(0);
          });
      });


      it('Should reject users with non-string username', function(){
        const testUser = {fullname, password, 'username': 5};

        return chai.request(app).post('/api/users').send(testUser)
          .then(function(apiResponse){
            expect(apiResponse).to.have.status(422);
            expect(apiResponse.body.message).to.equal(`Expect ${testUser.username} to be of data type 'string'`);
            return User.countDocuments();
          })
          .then(function(dbResponse){
            expect(dbResponse).to.equal(0);
          });      
      });


      it('Should reject users with non-string password', function(){
        const testUser = {fullname, username, 'password': 5};

        return chai.request(app).post('/api/users').send(testUser)
          .then(function(apiResponse){
            expect(apiResponse).to.have.status(422);
            expect(apiResponse.body.message).to.equal(`Expect ${testUser.password} to be of data type 'string'`);
            return User.countDocuments();
          })
          .then(function(dbResponse){
            expect(dbResponse).to.equal(0);
          });  
      });
      

      it('Should reject users with non-trimmed username', function(){
        const testUser = {fullname, password, 'username': ' notTrimmed'};

        return chai.request(app).post('/api/users').send(testUser)
          .then(function(apiResponse){
            expect(apiResponse).to.have.status(422);
            expect(apiResponse.body.message).to.equal(`Should not be whitespace at beginning or end of ${testUser.username}`);
            return User.countDocuments();
          })
          .then(function(dbResponse){
            expect(dbResponse).to.equal(0);
          });  
      });


      it('Should reject users with non-trimmed password', function(){
        const testUser = {fullname, username, 'password': ' notTrimmed'};

        return chai.request(app).post('/api/users').send(testUser)
          .then(function(apiResponse){
            expect(apiResponse).to.have.status(422);
            expect(apiResponse.body.message).to.equal(`Should not be whitespace at beginning or end of ${testUser.password}`);
            return User.countDocuments();
          })
          .then(function(dbResponse){
            expect(dbResponse).to.equal(0);
          });  
      });


      it('Should reject users with empty username', function(){
        const testUser = {fullname, password, 'username': ''};

        return chai.request(app).post('/api/users').send(testUser)
          .then(function(apiResponse){
            expect(apiResponse).to.have.status(422);
            expect(apiResponse.body.message).to.equal('Username field is required');
            return User.countDocuments();
          })
          .then(function(dbResponse){
            expect(dbResponse).to.equal(0);
          });  
      });


      it('Should reject users with password less than 8 characters', function(){
        const testUser = {fullname, username, 'password': '1234567'};

        return chai.request(app).post('/api/users').send(testUser)
          .then(function(apiResponse){
            expect(apiResponse).to.have.status(422);
            expect(apiResponse.body.message).to.equal('password must be at least 8 characters and no more than 72 characters in length');
            return User.countDocuments();
          })
          .then(function(dbResponse){
            expect(dbResponse).to.equal(0);
          });  
      });


      it('Should reject users with password greater than 72 characters', function(){
        const testUser = {fullname, username, 'password': '1111111111222222222233333333334444444444555555555566666666667777777777zzz'};

        return chai.request(app).post('/api/users').send(testUser)
          .then(function(apiResponse){
            expect(apiResponse).to.have.status(422);
            expect(apiResponse.body.message).to.equal('password must be at least 8 characters and no more than 72 characters in length');
            return User.countDocuments();
          })
          .then(function(dbResponse){
            expect(dbResponse).to.equal(0);
          });  
      });


      it('Should reject users with duplicate username', function(){
        const testUser = {username, password, fullname};

        return chai.request(app).post('/api/users').send(testUser)
          .then(function(apiResponse1){
            expect(apiResponse1).to.have.status(201);
            return chai.request(app).post('/api/users').send(testUser);
          })
          .then(function(apiResponse2){
            expect(apiResponse2).to.have.status(400);
            expect(apiResponse2.body.message).to.equal('The username already exists');
            return User.countDocuments();
          })
          .then(function(dbResponse){
            expect(dbResponse).to.equal(1);
          });
      });


      it('Should trim fullname', function(){
        const testUser = {username, password, 'fullname': ' untrimmed ' };

        return chai.request(app).post('/api/users').send(testUser)
          .then(function(apiResponse){
            expect(apiResponse).to.have.status(201);
            expect(apiResponse.body).to.be.an('object');
            expect(apiResponse.body).to.have.keys('id', 'username', 'fullname');

            expect(apiResponse.body.id).to.exist;
            expect(apiResponse.body.username).to.equal(testUser.username);
            expect(apiResponse.body.fullname).to.equal(testUser.fullname.trim());

            return User.findOne({ username });
          })
          .then(function(dbResponse){
            expect(dbResponse.fullname).to.equal(testUser.fullname.trim());
          });
      });
    });
  });
});