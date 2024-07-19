const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { sendOne } = require('../util/emailer');

const User = require('./user.model');

console.log(`Update pass reset URL.`);

exports.createUser = (req, res, next) => {
    const name = req.body.name;
    const email = req.body.email;
    const password = req.body.password;
    User.findOne({email: email})
        .then(user => {
            if (user) {
                const error = new Error('A user with that email already exists.');
                error.status = 409;
                throw error
            };
            return bcrypt.hash(password, 12)
        })
        .then(hashedPassword => {
            const newUser = new User({
                name: name,
                email: email,
                password: hashedPassword
            });
            return newUser.save();
        })
        .then(savedUser => {
            res.status(201).json({message: 'User created.'})
        })
        .catch(err => {
            err.status = err.status || 500;
            next(err)
        })
};

exports.sendPassReset = (req, res, next) => {
    const email = req.body.email;
    let foundUser;
    let token
    User.findOne({email: email})
        .then(user => {
            if (!user) {
                const error = new Error('That email is not valid.');
                error.status = 404;
                throw error;
            } 
            foundUser = user;
            crypto.randomBytes(32, (err, buffer) => {
                if (err) {
                    err.status = 500;
                    throw err
                };
                token = buffer.toString('hex');
                foundUser.resetToken = token;
                foundUser.resetExpiration = Date.now() + (60 * 60 * 1000);
                return foundUser.save()
            })
            .then(result => {
                sendOne(email, 'Password Reset',
                `
                    <h1>Password Reset</h1>
                    <p>You requested a password reset.</p>
                    <p>Click this <a href="http://localhost:3000/pass-reset/${token}">link</a> to set a new password.</p>
                `
                );
                res.status(200).json({message: 'Password Reset Sent - Please check your email.'})
            })
        })
        .catch(err => {
            err.status = err.status || 500;
            next(err)
        })
}

exports.updatePassword = (req, res, next) => {
    const token = req.body.token;
    const password = req.body.password;
    let foundUser;
    User.findOne({resetToken: token})
        .then(user => {
            const tokenExpiration = new Date(user.resetExpiration);
            if (!user || tokenExpiration.getTime() < Date.now()) { //Checks if the token is not found or if it is expired, does not update password if it is.
                const error = new Error('Your token is invalid.');
                error.status = 404;
                throw error;
            };
            foundUser = user;
            return bcrypt.hash(password, 12)
        })
        .then(hashedPassword => {
            foundUser.password = hashedPassword;
            return foundUser.save()
        })
        .then(updatedUser => {
            updatedUser.password = 'redacted';
            return res.status(200).json({message: 'Password updated.', data: updatedUser})
        })
        .catch(err => {
            err.status = err.status || 500;
            next(err)
        })
}

exports.updateEmail = (req, res, next) => {
    const newEmail = req.body.email;
    const userId = req.body.userId;
    User.findByIdAndUpdate(userId, {email: newEmail})
        .then(updatedUser => {
            if (!updatedUser) {
                const error = new Error('User not found.');
                error.status = 404;
                throw error
            }
            res.status(200).json({message: 'User updated.', data: updatedUser})
        })
        .catch(err => {
            err.status = err.status || 500
            next(err)
        })
}

exports.deleteUser = (req, res, next) => {
    const password = req.body.password;
    const userId = req.body.userId;
    User.findOneAndDelete({_id: userId})
        .then(user => {
            if (!user) {
                const error = new Error('User not found.')
                error.status(404)
                throw error
            }
            res.status(200).json({message: 'User deleted.'})
        })
        .catch(err => {
            err.status = err.status || 500;
            next(err)
        })
}