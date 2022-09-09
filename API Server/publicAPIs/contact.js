// Copyright (c) 2020 Mitchell Adair
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

const nodemailer = require("nodemailer");
const { body } = require("express-validator");

const CONTACT_TYPES = ["Help", "Bug Report", "Suggestion", "Feedback", "General"];

const validators = {
    schema: [
        body("type").isIn(CONTACT_TYPES),
        body("subject").trim(),
        body("name").trim(),
        body("email").isEmail().normalizeEmail(),
        body("message").trim().escape(),
    ],
};

const post = (req, res) => {
    const { EMAIL_HOST, EMAIL_PORT, EMAIL_USERNAME, EMAIL_PASSWORD } = process.env;
    const { type, subject, name, email, message } = req.body;

    const emailData = {
        from: `"${name}" <${email}>`, // "email" is ignored by gmail
        to: EMAIL_USERNAME,
        subject: `${type}: "${subject}" from ${name}`,
        html: `
        <p>${message}</p></br>
        <a href="mailto:${email}?subject=RE: ${type}: ${subject}&body=Hi ${
            name.split(" ")[0]
        },\n\n\nYou said:\n${message}">Reply</a>
        `,
    };

    const transport = nodemailer.createTransport({
        host: EMAIL_HOST,
        port: EMAIL_PORT,
        secure: true,
        auth: {
            user: EMAIL_USERNAME,
            pass: EMAIL_PASSWORD,
        },
    });
    transport.sendMail(emailData, (err) => {
        if (err) {
            res.status(500).send(err.message);
            return;
        }
        res.status(200).send("contact sent sucessfully");
    });
};

module.exports = {
    post,
    validators,
};
