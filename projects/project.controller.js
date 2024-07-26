const mongoose = require('mongoose');
const { sendMany, sendOne } = require('../util/emailer');

const Project = require('./project.model');
const User = require('../users/user.model');

console.log('Update invite user URL.')

exports.createProject = (req, res, next) => {
    const title = req.body.title;
    const description = req.body.description;
    const pmId = req.body.pmId; // Project Manager ID
    Project.findOne({title: title})
        .then(project => {
            if (project) {
                const error = new Error('A project with that title already exists!');
                error.status = 422;
                throw error;
            }
            const newProject = new Project({
                title: title,
                description: description,
                projectManager: pmId,
                status: 'Incomplete',
                contributors: [],
                pendingContributors: []
            });
            return newProject.save()
        })
        .then(savedProject => {
            if (savedProject) {
                res.status(201).json({message: 'Project Created', data: savedProject})
            }
        })
        .catch(err => {
            err.status = err.status || 500;
            next(err)
        })
}

exports.deleteProject = (req, res, next) => {
    const projectId = req.body.projectId;
    const pmId = req.body.pmId;
    Project.findOneById(projectId).populate('projectManager')
        .then(project => {
            if (!project) {
                const error = new Error('Project not found')
                error.status = 404;
                throw error
            }
            if (project.projectManager._id !== pmId) {
                const error = new Error('Only the Project Manager may delete a project.');
                error.status = 422;
                throw error
            }
            return project.delete()
        })
        .then(deletedProject => {
            if (deletedProject) {
                let emailArray = deletedProject.contributors.map(contributor => contributor.email);
                sendMany(emailArray, 'Project Deleted', `
                        <p>The project entitled ${deletedProject.title} has been deleted by the project manager, ${deletedProject.projectManager.name}.</p>
                        <p>Since the project was deleted rather than completed, you will not see it listed among the completed projects on the website.</p>
                    `)
            };
            res.status(204).json({message: 'Project deleted.'})
        })
        .catch(err => {
            err.status = err.status || 500
        })
}

exports.sendInvite = (req, res, next) => {
    const projectId = req.body.projectId;
    const invitee = req.body.invitee;
    User.findOne({email: invitee})
        .then(user => {
            if (!user) {
                const error = new Error('The invitee is not a current user.');
                error.status = 422;
                throw error
            };
            return Project.findById(projectId).populate('contributors')
        })
        .then(project => {
            if (project.pendingContributors.includes(invitee) || project.contributors.findIndex(user => user.email === invitee) !== -1) {
                return res.status(200).json({message: 'User is already on the invitee list.'})
            };
            project.pendingContributors.push(invitee);
            sendOne(invitee, `You've been invited to join a project.`, `
                    <p>You've been invited to join a project entitled ${project.title}.</p>
                    <p>Description: ${project.description}</p>
                    <p>If you'd like to join this project, please click <a href="http://localhost:3000/joinProject/${project._id}">HERE</a>.
                `);
            project.save();
        })
        .then(() => {
            res.status(200).json({message: 'User has been invited.'})
        })
        .catch(err => {
            err.status = err.status || 500;
            next(err)
        })
}

exports.acceptInvite = (req, res, next) => {
    const projectId = req.body.projectId;
    const userEmail = req.body.userEmail;
    let foundProject;
    Project.findById(projectId)
        .then(project => {
            if (!project.pendingContributors.includes(userEmail) || !project) {
                const error = new Error('Your invite is not currently valid, possibly because the project is no longer accepting contributors.');
                error.status = 422;
                next(error)
            };
            project.pendingContributors = project.pendingContributors.filter(email => email !== userEmail)
            foundProject = project;
            return User.findOne({email: userEmail})
        })
        .then(user => {
            if (!user) {
                const error = new Error('The email you entered has not been found.');
                error.status = 404;
                next(error);
            }
            foundProject.contributors.push(user._id); //The sendInvite function will already confirm that this user is not already in the contributors list.
            foundProject.save()
        })
        .then(() => {
            res.status(200).json({message: `You've been added to the project.`})
        })
        .catch(err => {
            err.status = err.status || 500;
            next(err)
        })
}