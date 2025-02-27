import nodemailer from "nodemailer";

export const sendEmail = ({toMail, subject, text}) => {

    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        auth: {
          user: 'expensetracker414@gmail.com',
          pass: 'buygfdapgkgjofol',
        },
      });
    
    
    const mailOptions = {
        from: 'expensetraker414@gmail.com',
        to: 'the.akshhh@gmail.com',
        subject: 'Sending Email using Node.js',
        text: 'That was easy!'
    };
    
    // Send the email
    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
        console.log('Error:', error);
        } else {
        console.log('Email sent:', info.response);
        }
    });
}