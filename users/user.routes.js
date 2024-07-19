const express = require('express');

const router = express.Router();

const userController = require('./user.controller');
const { authenticate } = require('../auth/auth.controller').authenticate;

router.post('create', userController.createUser);

router.post('sendPassReset', userController.sendPassReset);

router.post('updatePassword', userController.updatePassword);

router.post('updateEmail', authenticate, userController.updateEmail);

router.post('delete', authenticate, userController.deleteUser);

module.exports = router