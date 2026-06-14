using InsecASPNET.Data;
using InsecASPNET.DTOs;
using InsecASPNET.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace InsecASPNET.Controllers
{

    [Route("api/[controller]")]
    [ApiController]
    public class SupportController : ControllerBase
    {
        private readonly InsecDbContext _context;
        private readonly IEmailService _emailService;

        public SupportController(InsecDbContext context, IEmailService emailService)
        {
            _context = context;
            _emailService = emailService;
        }

        // izin verilen konu kategorileri - kullanıcı keyfine gore konu basligi secemez
        private static readonly string[] IzinliKonular =
        {
            "Genel Soru",
            "Teklif & Poliçe",
            "Ödeme",
            "Hasar",
            "Hesap & Profil",
            "Teknik Sorun",
            "Şikayet",
            "Diğer"
        };

        [Authorize]
        [HttpPost("mesaj-gonder")]
        public async Task<IActionResult> MesajGonder(DestekDto dto)
        {

            var musteriIdStr = User.FindFirst("MusteriId")?.Value;
            if (!int.TryParse(musteriIdStr, out var musteriId))
                return Unauthorized();

            var musteri = await _context.Customers
                .FirstOrDefaultAsync(c => c.Id == musteriId && c.IsActive);
            if (musteri == null)
                return NotFound("Hesap bulunamadı.");

            if (string.IsNullOrWhiteSpace(dto.Konu) || !IzinliKonular.Contains(dto.Konu))
                return BadRequest("Geçersiz konu seçimi.");

            var mesaj = (dto.Mesaj ?? "").Trim();
            if (mesaj.Length < 20)
                return BadRequest("Mesajınız en az 20 karakter olmalıdır.");
            if (mesaj.Length > 2000)
                return BadRequest("Mesajınız en fazla 2000 karakter olabilir.");

            try
            {
                await _emailService.SendSupportMessageAsync(
                    fromName: $"{musteri.Adi} {musteri.Soyadi}",
                    fromEmail: musteri.Email,
                    konu: dto.Konu,
                    mesaj: mesaj);
            }
            catch
            {
                return StatusCode(503, "Mesajınız şu anda gönderilemiyor. Lütfen birkaç dakika sonra tekrar deneyin.");
            }

            return Ok(new
            {
                Mesaj = "Talebiniz alındı. Ekibimiz en kısa sürede e-posta yoluyla size dönüş yapacaktır."
            });
        }
    }
}
