// Copyright (c) 2020 Mitchell Adair
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

const nodemailer = require('nodemailer');
const {validationResult} = require("express-validator");

const post = (req, res) => {
    const result = validationResult(req).formatWith(({location, param, msg, value}) => `${location}[${param}]: ${msg} "${value}"`);
    if (!result.isEmpty()) {
        res.status(400);
        res.json({errors: result.array()});
        return;
    }

    const {EMAIL_HOST, EMAIL_PORT, EMAIL_USERNAME, EMAIL_PASSWORD} = process.env;
    const {type, subject, name, email, message} = req.body;
    
    const emailData = {
        from: '', //this is ignored by gmail
        to: EMAIL_USERNAME,
        subject: `${type}: "${subject}" from ${name}`,
        html: `
            <p>"${type}" contact from ${name}, ${email}</p></br>
            <p>${message}</p></br>
            <a href="mailto:${email}?subject=RE: ${type}: ${subject}&body=Hi ${name.split(' ')[0]},\n\n\nYou said:\n${message}">Reply</a>
        `,
    }

    const transport = nodemailer.createTransport({
        host: EMAIL_HOST,
        port: EMAIL_PORT,
        secure: true,
        auth: {
            user: EMAIL_USERNAME,
            pass: EMAIL_PASSWORD
        },
    });
    transport.sendMail(emailData, err => {
        if (err) {
            res.status(500);
            res.end(err.toString());
            return;
        }
        res.status(200);
        res.end("contact sent sucessfully");
    });
}

module.exports = {
    post
}