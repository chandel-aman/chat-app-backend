const nodemailer = require("nodemailer");
const logger = require("./logger");

const sendEmail = async (email, OTP) => {
  try {
    let transporter = nodemailer.createTransport({
      host: "smtp.zoho.in",
      port: 465,
      secure: true,
      tls: {
        rejectUnauthorized: false,
      },
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Login OTP",
      html: `
            <div style="font-family: Helvetica,Arial,sans-serif;min-width:1000px;overflow:auto;line-height:2">
            <div style="margin:40px auto;width:90%;padding:20px 0">
              <p style="font-size:1.1em">Hi,</p>
              <p>The OTP to login into your SendIt account.</p>
              <p style="background: #00466a;margin: 0px; width: max-content;padding: 12px;color: #fff;border-radius: 4px;">${OTP}</p>
              <p>This OTP is valid for 3 minutes.</p>
              <p>If you did not make this request, please ignore.</p>
                <p style="font-size:0.9em;">Regards,<br />Uno-Guide</p>
              <hr style="border:none;border-top:2px solid #eee" />
              <div style="float:right;padding:8px 0;color:#aaa;font-size:0.8em;line-height:1;font-weight:300">
              </div>
            </div>
          </div>
            `,
    });

    return true;
  } catch (error) {
    logger.error("Error while sending the OTP", error);
    return false;
  }
};

module.exports = sendEmail;
