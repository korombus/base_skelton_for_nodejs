var mailer = require('nodemailer');
var conf = require('config');

exports.sendMail = function(token, toEmail, subject, plane, html){
  return new Promise(function(resolve, reject){
    var transporter = mailer.createTransport(conf.mail.smtpConfig);

    var mailOptions = {
      from: conf.mail.from,
      to: toEmail,
      subject: subject,
      text: plane,
      html: html
    };

    transporter.sendMail(mailOptions, function(err, info){
      if(err){
        reject(err);
      } else {
        resolve(true);
      }
    });
  });
}
