using System.Net;
using System.Net.Mail;

namespace InsecASPNET.Services
{
    public interface IEmailService
    {
        Task SendOtpEmailAsync(string toEmail, string otpCode);
        // Destek mesajları admin email'ine gönderilir.
        // Frontend mesajdaki adresi DEĞİL, kayıtlı kullanıcının email'ini gönderiyor —
        // gönderen sahte değil, doğrulanmış kullanıcı.
        Task SendSupportMessageAsync(string fromName, string fromEmail, string konu, string mesaj);
        Task SendSupportReplyAsync(string toEmail, string toName, string konu, string yanit, int ticketId);
    }

    public class EmailService : IEmailService
    {
        private readonly IConfiguration _configuration;

        public EmailService(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public async Task SendOtpEmailAsync(string toEmail, string otpCode)
        {
            var smtpHost = _configuration["Email:SmtpHost"];
            var smtpPort = int.Parse(_configuration["Email:SmtpPort"]!);
            var senderEmail = _configuration["Email:SenderEmail"];
            var senderName = _configuration["Email:SenderName"];
            var appPassword = _configuration["Email:AppPassword"];

            var client = new SmtpClient(smtpHost, smtpPort)
            {
                Credentials = new NetworkCredential(senderEmail, appPassword),
                EnableSsl = true
            };

            var message = new MailMessage
            {
                From = new MailAddress(senderEmail!, senderName),
                Subject = "inSEC — E-Posta Doğrulama Kodunuz",
                IsBodyHtml = true,
                Body = $@"
                    <div style='font-family: sans-serif; max-width: 480px; margin: 0 auto;'>
                        <h2 style='color: #0ea5e9;'>inSEC</h2>
                        <p>Hesabınızı doğrulamak için aşağıdaki kodu kullanın:</p>
                        <div style='background: #0d1320; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;'>
                            <span style='font-size: 36px; font-weight: bold; letter-spacing: 12px; color: #0ea5e9;'>{otpCode}</span>
                        </div>
                        <p style='color: #666; font-size: 14px;'>Bu kod 10 dakika geçerlidir. Eğer bu işlemi siz yapmadıysanız bu e-postayı dikkate almayın.</p>
                    </div>"
            };

            message.To.Add(toEmail);
            await client.SendMailAsync(message);
        }

        public async Task SendSupportMessageAsync(string fromName, string fromEmail, string konu, string mesaj)
        {
            var smtpHost = _configuration["Email:SmtpHost"];
            var smtpPort = int.Parse(_configuration["Email:SmtpPort"]!);
            var senderEmail = _configuration["Email:SenderEmail"];
            var senderName = _configuration["Email:SenderName"];
            var appPassword = _configuration["Email:AppPassword"];

            // Admin email adresi — appsettings'te tanımlı olmalı, yoksa sender'a gönder
            var adminEmail = _configuration["Email:SupportInbox"] ?? senderEmail;

            var client = new SmtpClient(smtpHost, smtpPort)
            {
                Credentials = new NetworkCredential(senderEmail, appPassword),
                EnableSsl = true
            };

            // HTML escape — kullanıcının yazdığı içerikle XSS olabilir email client'ta
            string escape(string s) => System.Net.WebUtility.HtmlEncode(s ?? "");

            var message = new MailMessage
            {
                From = new MailAddress(senderEmail!, senderName),
                Subject = $"[inSEC Destek] {konu}",
                IsBodyHtml = true,
                Body = $@"
                    <div style='font-family: sans-serif; max-width: 600px; margin: 0 auto;'>
                        <h2 style='color: #0ea5e9;'>inSEC — Destek Talebi</h2>
                        <table style='width: 100%; border-collapse: collapse; margin: 16px 0;'>
                            <tr>
                                <td style='padding: 8px; border-bottom: 1px solid #eee; color: #666;'>Gönderen:</td>
                                <td style='padding: 8px; border-bottom: 1px solid #eee;'><strong>{escape(fromName)}</strong></td>
                            </tr>
                            <tr>
                                <td style='padding: 8px; border-bottom: 1px solid #eee; color: #666;'>E-posta:</td>
                                <td style='padding: 8px; border-bottom: 1px solid #eee;'>{escape(fromEmail)}</td>
                            </tr>
                            <tr>
                                <td style='padding: 8px; border-bottom: 1px solid #eee; color: #666;'>Konu:</td>
                                <td style='padding: 8px; border-bottom: 1px solid #eee;'><strong>{escape(konu)}</strong></td>
                            </tr>
                        </table>
                        <div style='background: #f7f9fc; border-radius: 8px; padding: 16px; white-space: pre-wrap;'>
                            {escape(mesaj)}
                        </div>
                        <p style='color: #999; font-size: 12px; margin-top: 24px;'>
                            Bu e-posta inSEC destek formundan otomatik üretilmiştir.
                            Yanıtlamak için doğrudan {escape(fromEmail)} adresini kullanabilirsiniz.
                        </p>
                    </div>"
            };

            message.To.Add(adminEmail!);
            // Admin doğrudan reply atınca müşteriye gitsin
            message.ReplyToList.Add(new MailAddress(fromEmail));

            await client.SendMailAsync(message);
        }

        public async Task SendSupportReplyAsync(string toEmail, string toName, string konu, string yanit, int ticketId)
        {
            var smtpHost = _configuration["Email:SmtpHost"];
            var smtpPort = int.Parse(_configuration["Email:SmtpPort"]!);
            var senderEmail = _configuration["Email:SenderEmail"];
            var senderName = _configuration["Email:SenderName"];
            var appPassword = _configuration["Email:AppPassword"];

            var client = new SmtpClient(smtpHost, smtpPort)
            {
                Credentials = new NetworkCredential(senderEmail, appPassword),
                EnableSsl = true
            };

            string escape(string s) => System.Net.WebUtility.HtmlEncode(s ?? "");
            var talepNo = $"DTK-{ticketId:D6}";

            var message = new MailMessage
            {
                From = new MailAddress(senderEmail!, senderName),
                Subject = $"[inSEC] Destek Talebinize Yanıt — {konu}",
                IsBodyHtml = true,
                Body = $@"
                    <div style='font-family: sans-serif; max-width: 600px; margin: 0 auto;'>
                        <h2 style='color: #0ea5e9;'>inSEC — Destek Ekibi</h2>
                        <p>Merhaba <strong>{escape(toName)}</strong>,</p>
                        <p>{escape(talepNo)} numaralı <strong>{escape(konu)}</strong> konulu destek talebinize ekibimizin yanıtı aşağıdadır:</p>
                        <div style='background: #f7f9fc; border-left: 4px solid #0ea5e9; border-radius: 4px; padding: 16px; margin: 16px 0; white-space: pre-wrap;'>
                            {escape(yanit)}
                        </div>
                        <p style='color: #666; font-size: 14px;'>
                            Talebinizin tüm yazışmalarını hesabınızdaki <em>Destek</em> sayfasından görüntüleyebilirsiniz.
                        </p>
                        <p style='color: #999; font-size: 12px; margin-top: 24px;'>
                            Bu e-posta inSEC destek sisteminden otomatik gönderilmiştir.
                        </p>
                    </div>"
            };

            message.To.Add(toEmail);
            await client.SendMailAsync(message);
        }
    }
}