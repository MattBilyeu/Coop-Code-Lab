const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const User = require('./user.model');

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
            res.status(201).json(savedUser)
        })
        .catch(err => {
            err.status = err.status || 500;
            next(err)
        })
}