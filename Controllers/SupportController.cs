using InsecASPNET.Data;
using InsecASPNET.DTOs;
using InsecASPNET.Entities;
using InsecASPNET.Services;
using InsecASPNET.Services.Notifications;
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
        private readonly INotificationService _notificationService;

        public SupportController(
            InsecDbContext context,
            IEmailService emailService,
            INotificationService notificationService)
        {
            _context = context;
            _emailService = emailService;
            _notificationService = notificationService;
        }

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

        private static readonly string[] IzinliDurumlar = { "Acik", "Yanitlandi", "Kapali" };

        private int? MevcutMusteriId()
        {
            var s = User.FindFirst("MusteriId")?.Value;
            return int.TryParse(s, out var id) ? id : null;
        }

        private bool AdminMi()
        {
            var rol = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            return rol == "Admin";
        }

        [Authorize]
        [HttpPost("talep-olustur")]
        public async Task<IActionResult> TalepOlustur(DestekDto dto)
        {
            var musteriId = MevcutMusteriId();
            if (musteriId == null) return Unauthorized();

            var musteri = await _context.Customers
                .FirstOrDefaultAsync(c => c.Id == musteriId.Value && c.IsActive);
            if (musteri == null) return NotFound("Hesap bulunamadı.");

            if (string.IsNullOrWhiteSpace(dto.Konu) || !IzinliKonular.Contains(dto.Konu))
                return BadRequest("Geçersiz konu seçimi.");

            var mesaj = (dto.Mesaj ?? "").Trim();
            if (mesaj.Length < 20)
                return BadRequest("Mesajınız en az 20 karakter olmalıdır.");
            if (mesaj.Length > 2000)
                return BadRequest("Mesajınız en fazla 2000 karakter olabilir.");

            var talep = new SupportTicket
            {
                CustomerId = musteri.Id,
                Konu = dto.Konu,
                IlkMesaj = mesaj,
                Durum = "Acik",
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            };
            _context.SupportTickets.Add(talep);
            await _context.SaveChangesAsync();

            _context.SupportMessages.Add(new SupportMessage
            {
                SupportTicketId = talep.Id,
                Gonderen = "Musteri",
                Mesaj = mesaj,
                CreatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

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
            }

            return Ok(new
            {
                Mesaj = "Talebiniz alındı. Ekibimiz en kısa sürede dönüş yapacaktır.",
                TalepId = talep.Id
            });
        }

        [Authorize]
        [HttpGet("taleplerim")]
        public async Task<IActionResult> Taleplerim()
        {
            var musteriId = MevcutMusteriId();
            if (musteriId == null) return Unauthorized();

            var talepler = await _context.SupportTickets
                .Where(t => t.IsActive && t.CustomerId == musteriId.Value)
                .OrderByDescending(t => t.CreatedAt)
                .Select(t => new
                {
                    t.Id,
                    t.Konu,
                    t.IlkMesaj,
                    t.Durum,
                    t.CreatedAt,
                    t.SonYanitTarihi,
                    MesajSayisi = t.Messages.Count
                })
                .ToListAsync();

            return Ok(talepler);
        }

        [Authorize]
        [HttpGet("talep/{id}")]
        public async Task<IActionResult> TalepDetayi(int id)
        {
            var musteriId = MevcutMusteriId();
            if (musteriId == null) return Unauthorized();

            var talep = await _context.SupportTickets
                .Include(t => t.Customer)
                .Include(t => t.Messages.OrderBy(m => m.CreatedAt))
                .FirstOrDefaultAsync(t => t.Id == id && t.IsActive);

            if (talep == null) return NotFound("Destek talebi bulunamadı.");

            if (!AdminMi() && talep.CustomerId != musteriId.Value)
                return Forbid();

            return Ok(new
            {
                talep.Id,
                talep.Konu,
                talep.IlkMesaj,
                talep.Durum,
                talep.CreatedAt,
                talep.SonYanitTarihi,
                Musteri = talep.Customer == null ? null : new
                {
                    talep.Customer.Id,
                    talep.Customer.Adi,
                    talep.Customer.Soyadi,
                    talep.Customer.Email
                },
                Messages = talep.Messages.Select(m => new
                {
                    m.Id,
                    m.Gonderen,
                    m.Mesaj,
                    m.CreatedAt
                })
            });
        }

        [Authorize]
        [HttpPost("talep/{id}/mesaj-ekle")]
        public async Task<IActionResult> MesajEkle(int id, DestekMesajEkleDto dto)
        {
            var musteriId = MevcutMusteriId();
            if (musteriId == null) return Unauthorized();

            var talep = await _context.SupportTickets
                .FirstOrDefaultAsync(t => t.Id == id && t.IsActive);
            if (talep == null) return NotFound("Destek talebi bulunamadı.");

            if (talep.CustomerId != musteriId.Value)
                return Forbid();

            if (talep.Durum == "Kapali")
                return BadRequest("Bu talep kapatılmış, yeni mesaj eklenemez.");

            var mesaj = (dto.Mesaj ?? "").Trim();
            if (mesaj.Length < 2)
                return BadRequest("Mesaj çok kısa.");
            if (mesaj.Length > 2000)
                return BadRequest("Mesaj en fazla 2000 karakter olabilir.");

            _context.SupportMessages.Add(new SupportMessage
            {
                SupportTicketId = talep.Id,
                Gonderen = "Musteri",
                Mesaj = mesaj,
                CreatedAt = DateTime.UtcNow
            });

            talep.Durum = "Acik";
            await _context.SaveChangesAsync();

            return Ok(new { Mesaj = "Mesajınız eklendi." });
        }

        [Authorize(Roles = "Admin")]
        [HttpGet("admin/talepler")]
        public async Task<IActionResult> AdminTalepler(string? durum = null)
        {
            var sorgu = _context.SupportTickets
                .Include(t => t.Customer)
                .Where(t => t.IsActive);

            if (!string.IsNullOrWhiteSpace(durum) && IzinliDurumlar.Contains(durum))
                sorgu = sorgu.Where(t => t.Durum == durum);

            var talepler = await sorgu
                .OrderByDescending(t => t.CreatedAt)
                .Select(t => new
                {
                    t.Id,
                    t.Konu,
                    t.IlkMesaj,
                    t.Durum,
                    t.CreatedAt,
                    t.SonYanitTarihi,
                    MesajSayisi = t.Messages.Count,
                    Musteri = t.Customer == null ? null : new
                    {
                        t.Customer.Id,
                        t.Customer.Adi,
                        t.Customer.Soyadi,
                        t.Customer.Email
                    }
                })
                .ToListAsync();

            return Ok(talepler);
        }

        [Authorize(Roles = "Admin")]
        [HttpPost("admin/talep/{id}/yanitla")]
        public async Task<IActionResult> AdminYanitla(int id, DestekYanitDto dto)
        {
            var talep = await _context.SupportTickets
                .Include(t => t.Customer)
                .FirstOrDefaultAsync(t => t.Id == id && t.IsActive);

            if (talep == null) return NotFound("Destek talebi bulunamadı.");

            if (talep.Durum == "Kapali")
                return BadRequest("Kapalı bir talebe yanıt verilemez.");

            var mesaj = (dto.Mesaj ?? "").Trim();
            if (mesaj.Length < 5)
                return BadRequest("Yanıt en az 5 karakter olmalıdır.");
            if (mesaj.Length > 4000)
                return BadRequest("Yanıt en fazla 4000 karakter olabilir.");

            var yanitTarihi = DateTime.UtcNow;

            _context.SupportMessages.Add(new SupportMessage
            {
                SupportTicketId = talep.Id,
                Gonderen = "Admin",
                Mesaj = mesaj,
                CreatedAt = yanitTarihi
            });

            talep.SonYanitTarihi = yanitTarihi;
            talep.Durum = dto.TalebiKapat ? "Kapali" : "Yanitlandi";

            await _context.SaveChangesAsync();

            if (talep.Customer != null)
            {
                try
                {
                    await _emailService.SendSupportReplyAsync(
                        toEmail: talep.Customer.Email,
                        toName: $"{talep.Customer.Adi} {talep.Customer.Soyadi}",
                        konu: talep.Konu,
                        yanit: mesaj,
                        ticketId: talep.Id);
                }
                catch
                {
                }

                await _notificationService.OlusturAsync(
                    customerId: talep.CustomerId,
                    tip: "Destek",
                    baslik: "Destek talebinize yanıt geldi",
                    mesaj: $"DTK-{talep.Id:D6} numaralı '{talep.Konu}' konulu talebinize ekibimiz yanıt verdi.",
                    linkUrl: $"/dashboard/destek/taleplerim/{talep.Id}",
                    iconKey: "message");
            }

            return Ok(new
            {
                Mesaj = dto.TalebiKapat
                    ? "Yanıt gönderildi ve talep kapatıldı."
                    : "Yanıt müşteriye iletildi.",
                Durum = talep.Durum
            });
        }

        [Authorize(Roles = "Admin")]
        [HttpPut("admin/talep/{id}/durum")]
        public async Task<IActionResult> AdminDurumGuncelle(int id, DestekDurumDto dto)
        {
            if (!IzinliDurumlar.Contains(dto.Durum))
                return BadRequest("Geçersiz durum.");

            var talep = await _context.SupportTickets
                .FirstOrDefaultAsync(t => t.Id == id && t.IsActive);

            if (talep == null) return NotFound("Destek talebi bulunamadı.");

            talep.Durum = dto.Durum;
            await _context.SaveChangesAsync();

            return Ok(new { Mesaj = "Talep durumu güncellendi.", Durum = talep.Durum });
        }
    }
}
