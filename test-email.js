const nodemailer = require('nodemailer');

// Config from .env (hardcoded for test)
const config = {
    host: 'smtp.mailersend.net',
    port: 587,
    user: 'MS_ya964h@notionlock.com',
    pass: 'mssp.9cdePE0.jy7zpl9rqdol5vx6.mNWlPAU',
    from: 'noreply@notionlock.com'
};

async function sendTest() {
    const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: false, // true for 465, false for other ports
        auth: {
            user: config.user,
            pass: config.pass,
        },
    });

    try {
        console.log("Verifying connection...");
        await transporter.verify();
        console.log("Connection verified!");

        console.log("Sending email...");
        const info = await transporter.sendMail({
            from: config.from,
            to: "maffei.gianfranco@gmail.com", // Send to user
            subject: "Test Email from VPS",
            text: "If you receive this, SMTP is working.",
            html: "<b>If you receive this, SMTP is working.</b>",
        });

        console.log("Message sent: %s", info.messageId);
    } catch (error) {
        console.error("Error occurred:", error);
    }
}

sendTest();
