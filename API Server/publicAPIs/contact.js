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
        subject: `${encodeURIComponent(body.type)}: "${encodeURIComponent(body.subject)}" from ${encodeURIComponent(body.name)}`,
        html: `
            <p>${encodeURIComponent(body.type)} contact from ${encodeURIComponent(body.name)}, ${encodeURIComponent(body.email)}</p></br>
            <p>${encodeURIComponent(body.message)}</p></br>
            <a href="mailto:${encodeURIComponent(body.email)}?subject=RE: ${encodeURIComponent(body.type)}: ${encodeURIComponent(body.subject)}&body=Hi ${encodeURIComponent(body.name.split(' ')[0])},\n\n\nYou said:\n${encodeURIComponent(body.message)}">Reply</a>
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