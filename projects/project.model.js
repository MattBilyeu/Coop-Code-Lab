const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const projectSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    projectManager: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    features: [{
        type: Schema.Types.ObjectId,
        required: false,
        ref: 'Feature'
    }],
    messages: [{
        type: Schema.Types.ObjectId,
        required: false,
        ref: 'Message'
    }],
    status: {
        type: String,
        required: true,
    },
    contributors: [{
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    }]
})

module.exports = mongoose.model('Project', projectSchema);