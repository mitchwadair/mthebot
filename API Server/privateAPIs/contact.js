const nodemailer = require('nodemailer');

const post = (req, res) => {
    let body = [];
    req.on('error', err => {
        res.writeHead(500);
        res.end(`ERROR: ${err}`);
    }).on('data', chunk => {
        body.push(chunk);
    }).on('end', _ => {
        body = JSON.parse(Buffer.concat(body).toString());
        const emailData = {
            from: '', //this is ignored by gmail
            to: process.env.GMAIL_USERNAME,
            subject: `${body.type}: ${body.subject} from ${body.name}`,
            html: `
                <p>${body.name}: <a href="mailto:${body.email}?subject=RE: ${body.type}: ${body.subject}&body=\n\nYou said:\n> ${body.message}">${body.email}</a></p></br>
                <p>${body.message}</p>
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
                res.end(`ERROR: ${err}`);
                return;
            }
            res.writeHead(200);
            res.end("contact sent sucessfully");
        });
    });
}

module.exports = (db, actions, req, res) => {
    switch (req.method) {
        case 'POST':
            post(req, res);
            break;
        default:
            res.writeHead(400);
            res.end('Bad Request');
    }
}