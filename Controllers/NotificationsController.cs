using InsecASPNET.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace InsecASPNET.Controllers
{
    // müsteri bildirimleri api'si
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class NotificationsController : ControllerBase
    {
        private readonly InsecDbContext _context;

        public NotificationsController(InsecDbContext context)
        {
            _context = context;
        }

        // jwt'den musteri id'si
        private int? MevcutMusteriId()
        {
            var s = User.FindFirst("MusteriId")?.Value;
            return int.TryParse(s, out var id) ? id : null;
        }

        // bildirim listesi
        [HttpGet("bildirimlerim")]
        public async Task<IActionResult> Bildirimlerim()
        {
            var musteriId = MevcutMusteriId();
            if (musteriId == null) return Unauthorized();

            var bildirimler = await _context.Notifications
                .Where(n => n.CustomerId == musteriId.Value)
                .OrderByDescending(n => n.CreatedAt)
                .Take(30) // son 30 bildirimi gosteriyoz sadece, gelistirmek icin sayfa sistemi getirip tüm hepsini listeyebiliriz
                .Select(n => new
                {
                    n.Id,
                    n.Tip,
                    n.Baslik,
                    n.Mesaj,
                    n.Okundu,
                    n.LinkUrl,
                    n.IconKey,
                    n.CreatedAt,
                })
                .ToListAsync();

            // okunmamis bildirim sayisini gosteriyoruz
            var okunmamisSayi = await _context.Notifications
                .CountAsync(n => n.CustomerId == musteriId.Value && !n.Okundu);

            return Ok(new
            {
                Bildirimler = bildirimler,
                OkunmamisSayi = okunmamisSayi,
            });
        }

        // tek bildirimi okundu olarak isaretlemek icin
        [HttpPut("{id}/okundu")]
        public async Task<IActionResult> OkunduIsaretle(int id)
        {
            var musteriId = MevcutMusteriId();
            if (musteriId == null) return Unauthorized();

            var bildirim = await _context.Notifications.FindAsync(id);
            if (bildirim == null) return NotFound();

            if (bildirim.CustomerId != musteriId.Value)
                return Forbid();

            if (!bildirim.Okundu)
            {
                bildirim.Okundu = true;
                await _context.SaveChangesAsync();
            }

            return Ok(new { Mesaj = "Bildirim okundu olarak işaretlendi." });
        }

        // hepsini okundu isaretlemek icin
        [HttpPut("hepsini-okundu")]
        public async Task<IActionResult> HepsiniOkunduIsaretle()
        {
            var musteriId = MevcutMusteriId();
            if (musteriId == null) return Unauthorized();

            // ExecuteUpdateAsync: tek SQL UPDATE — tüm okunmamislari tek seferde guncelliyoruz
            var guncellenenSayi = await _context.Notifications
                .Where(n => n.CustomerId == musteriId.Value && !n.Okundu)
                .ExecuteUpdateAsync(s => s.SetProperty(n => n.Okundu, true));

            return Ok(new
            {
                Mesaj = $"{guncellenenSayi} bildirim okundu olarak işaretlendi.",
                GuncellenenSayi = guncellenenSayi,
            });
        }

        // bildirimi sil - burda soft delete kullanmicam cünkü bildirimler o kadar kritik degil
        [HttpDelete("{id}")]
        public async Task<IActionResult> Sil(int id)
        {
            var musteriId = MevcutMusteriId();
            if (musteriId == null) return Unauthorized();

            var bildirim = await _context.Notifications.FindAsync(id);
            if (bildirim == null) return NotFound();

            if (bildirim.CustomerId != musteriId.Value)
                return Forbid();

            _context.Notifications.Remove(bildirim);
            await _context.SaveChangesAsync();
            return Ok(new { Mesaj = "Bildirim silindi." });
        }
    }
}
