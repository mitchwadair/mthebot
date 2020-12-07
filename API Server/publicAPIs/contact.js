// Copyright (c) 2020 Mitchell Adair
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

const nodemailer = require('nodemailer');

const post = (req, res) => {
    let body = req.body;
    const emailData = {
        from: '', //this is ignored by gmail
        to: process.env.GMAIL_USERNAME,
        subject: `${body.type}: "${body.subject}" from ${body.name}`,
        html: `
            <p>${body.type} contact from ${body.name}, ${body.email}</p></br>
            <p>${body.message}</p></br>
            <a href="mailto:${body.email}?subject=RE: ${body.type}: ${body.subject}&body=Hi ${body.name.split(' ')[0]},\n\n\nYou said:\n${body.message}">Reply</a>
        `,
    }

    const transport = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: process.env.GMAIL_USERNAME,
            pass: process.env.GMAIL_PASSWORD
        },
    });
    transport.sendMail(emailData, err => {
        if (err) {
            res.writeHead(500);
            res.end(err.toString());
            return;
        }
        res.writeHead(200);
        res.end("contact sent sucessfully");
    });
}

module.exports = {
    post
}