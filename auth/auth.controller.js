const bcrypt = require('bcrypt');
const crypto = require('crypto');

const User = require('../users/user.model');

exports.userLogin = (req, res, next) => {
    const email = req.body.email.toLowerCase();
    const password = req.body.password;
    let foundUser;
    User.findOne({email: email})
        .then(user => {
            if (!user) {
                const error = new Error('User/Password combination not found.');
                error.status = 404;
                throw error
            } else {
                foundUser = user;
                return bcrypt.compare(password, user.password)
            }})
            .then(doMatch => {
                if (!doMatch) {
                    const error = new Error('User/Password combination not found.');
                    error.status = 404;
                    throw error
                }
                return new Promise((resolve, reject) => {
                    crypto.randomBytes(32, (err, buffer) => {
                        if (err) {
                            console.error(err);
                            const error = new Error('Problem generating API.');
                            reject(error);
                        };
                        const api = buffer.toString('hex');
                        foundUser.apiToken = api;
                        foundUser.apiExpiration = new Date(Date.now() + 1000*60*60*8);
                        foundUser.save()
                            .then(() => resolve(foundUser))
                            .catch(reject);
                })
            })
        })
        .then(() => {
            res.status(200).json(foundUser)
        })
        .catch(error => {
            error.status = error.status || 500;
            next(error)
        })
}