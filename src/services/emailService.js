import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail", // bisa juga pakai smtp.office365.com, SendGrid, dll
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export async function sendPayoutEmail(to, amount, campaignTitle) {
  const mailOptions = {
    from: `"Crowdfunding Platform" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Payout Completed ✅",
    html: `
      <h3>Halo,</h3>
      <p>Payout untuk campaign <b>${campaignTitle}</b> telah berhasil dicairkan.</p>
      <p><b>Jumlah:</b> Rp ${amount.toLocaleString("id-ID")}</p>
      <p>Silakan cek rekening bank Anda.</p>
      <br>
      <p>Terima kasih telah menggunakan platform kami 🙏</p>
    `
  };

  await transporter.sendMail(mailOptions);
}