using InsecASPNET.Data;
using InsecASPNET.DTOs;
using InsecASPNET.Entities;
using InsecASPNET.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Text;
using ClaimTypes = System.Security.Claims.ClaimTypes;
using JwtClaim = System.Security.Claims.Claim;

namespace InsecASPNET.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CustomersController : ControllerBase
    {
        private readonly InsecDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly IEmailService _emailService;
        private readonly IOtpService _otpService;

        // bekleyen kayitlar icin
        private static readonly Dictionary<string, KayitDto> _bekleyenKayitlar = new();

        public CustomersController(
            InsecDbContext context,
            IConfiguration configuration,
            IEmailService emailService,
            IOtpService otpService)
        {
            _context = context;
            _configuration = configuration;
            _emailService = emailService;
            _otpService = otpService;
        }

        [Authorize]
        [HttpGet("tum-musterileri-getir")]
        public async Task<IActionResult> TumMusterileriGetir()
        {
            var musteriler = await _context.Customers
                .Where(m => m.IsActive == true)
                .Select(m => new MusteriDto
                {
                    Id = m.Id,
                    Adi = m.Adi,
                    Soyadi = m.Soyadi,
                    KimlikNo = m.KimlikNo,
                    TelefonNo = m.TelefonNo,
                    DogumTarihi = m.DogumTarihi,
                    Email = m.Email,
                    Rol = m.Rol,
                    IsActive = m.IsActive
                })
                .ToListAsync();

            return Ok(musteriler);
        }

        [Authorize]
        [HttpGet("musteri-getir/{id}")]
        public async Task<IActionResult> MusteriGetir(int id)
        {
            var m = await _context.Customers
                .Where(c => c.Id == id && c.IsActive == true)
                .Select(m => new MusteriDto
                {
                    Id = m.Id,
                    Adi = m.Adi,
                    Soyadi = m.Soyadi,
                    KimlikNo = m.KimlikNo,
                    TelefonNo = m.TelefonNo,
                    DogumTarihi = m.DogumTarihi,
                    Email = m.Email,
                    Rol = m.Rol,
                    IsActive = m.IsActive
                })
                .FirstOrDefaultAsync();

            if (m == null)
                return NotFound("Bu numaraya ait bir müşteri sistemde bulunamadı.");

            return Ok(m);
        }

        // kayit endpointi - bilgileri alip otp gönderip gecici olarak sakliyorız
        [HttpPost("kayit-ol")]
        public async Task<IActionResult> KayitOl(KayitDto dto)
        {
            var varMi = await _context.Customers.AnyAsync(c =>
                c.Email == dto.Email || c.KimlikNo == dto.KimlikNo);

            if (varMi)
                return BadRequest("Bu e-posta veya TC Kimlik numarası zaten sistemde kayıtlı.");

            // gecici olarak sakla
            _bekleyenKayitlar[dto.Email] = dto;

            // otp generate et ve gonder
            var otp = _otpService.GenerateOtp(dto.Email);
            await _emailService.SendOtpEmailAsync(dto.Email, otp);

            return Ok(new { Mesaj = "Doğrulama kodu e-posta adresinize gönderildi." });
        }

        // kayiti tamamlamak icin otp dogrulat
        [HttpPost("otp-dogrula")]
        public async Task<IActionResult> OtpDogrula([FromBody] OtpDogrulaRequest istek)
        {
            if (!_otpService.ValidateOtp(istek.Email, istek.Otp))
                return BadRequest("Doğrulama kodu hatalı veya süresi dolmuş.");

            if (!_bekleyenKayitlar.TryGetValue(istek.Email, out var dto))
                return BadRequest("Kayıt bilgileri bulunamadı. Lütfen tekrar kayıt olun.");

            var varMi = await _context.Customers.AnyAsync(c =>
                c.Email == dto.Email || c.KimlikNo == dto.KimlikNo);

            if (varMi)
                return BadRequest("Bu e-posta veya TC Kimlik numarası zaten sistemde kayıtlı.");

            var yeniMusteri = new Customer
            {
                Adi = dto.Adi,
                Soyadi = dto.Soyadi,
                KimlikNo = dto.KimlikNo,
                TelefonNo = dto.TelefonNo,
                DogumTarihi = dto.DogumTarihi,
                Email = dto.Email,
                Sifre = BCrypt.Net.BCrypt.HashPassword(dto.Sifre),
                Rol = "Müşteri",
                IsActive = true
            };

            _context.Customers.Add(yeniMusteri);
            await _context.SaveChangesAsync();

            // otp'yi temizle
            _otpService.RemoveOtp(istek.Email);
            _bekleyenKayitlar.Remove(istek.Email);

            return Ok(new { Mesaj = "Hesabınız başarıyla oluşturuldu! Giriş yapabilirsiniz.", MusteriId = yeniMusteri.Id });
        }

        [HttpPost("giris-yap")]
        public async Task<IActionResult> GirisYap([FromBody] LoginRequest istek)
        {
            var musteri = await _context.Customers.FirstOrDefaultAsync(c =>
                (c.Email == istek.EmailVeyaKimlik || c.KimlikNo == istek.EmailVeyaKimlik)
                && c.IsActive == true);

            if (musteri == null)
                return NotFound("Kullanıcı bulunamadı veya hesabınız pasife alınmış.");

            bool sifreDogruMu = BCrypt.Net.BCrypt.Verify(istek.Sifre, musteri.Sifre);
            if (!sifreDogruMu)
                return BadRequest("Hatalı şifre girdiniz!");

            var claims = new[]
            {
                new JwtClaim("MusteriId", musteri.Id.ToString()),
                new JwtClaim(ClaimTypes.Email, musteri.Email),
                new JwtClaim(ClaimTypes.Role, musteri.Rol)
            };

            var key = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]!));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddHours(8),
                signingCredentials: credentials
            );

            var tokenString = new JwtSecurityTokenHandler().WriteToken(token);

            // token'ı HttpOnly Cookie olarak gönder
            Response.Cookies.Append("insec_token", tokenString, new CookieOptions
            {
                HttpOnly = true,
                Secure = false,    // production'da true yapılmasi lazim
                SameSite = SameSiteMode.Strict,
                Expires = DateTimeOffset.UtcNow.AddHours(8)
            });

            return Ok(new
            {
                Mesaj = $"Hoş geldin, {musteri.Adi}!",
                Rol = musteri.Rol,
                MusteriId = musteri.Id,
                Adi = musteri.Adi
            });
        }

        [HttpPost("cikis-yap")]
        public IActionResult CikisYap()
        {
            Response.Cookies.Delete("insec_token");
            return Ok(new { Mesaj = "Başarıyla çıkış yapıldı." });
        }

        [Authorize]
        [HttpPut("{id}")]
        public async Task<IActionResult> MusteriGuncelle(int id, Customer guncelMusteri)
        {
            if (id != guncelMusteri.Id)
                return BadRequest("URL'deki ID ile güncellenecek müşterinin kimliği uyuşmuyor!");

            _context.Customers.Update(guncelMusteri);
            await _context.SaveChangesAsync();
            return Ok("Müşteri bilgileri başarıyla güncellendi!");
        }

        [Authorize]
        [HttpDelete("{id}")]
        public async Task<IActionResult> MusteriSil(int id)
        {
            var musteri = await _context.Customers.FindAsync(id);
            if (musteri == null)
                return NotFound("Böyle bir müşteri bulunamadı.");

            musteri.IsActive = false;
            await _context.SaveChangesAsync();
            return Ok("Müşteri başarıyla sistemden silindi.");
        }

        [Authorize]
        [HttpGet("ben")]
        public async Task<IActionResult> Ben()
        {
            // token'dan MusteriId claim'ini oku
            var musteriIdClaim = User.FindFirst("MusteriId")?.Value;
            if (musteriIdClaim == null)
                return Unauthorized();

            var musteriId = int.Parse(musteriIdClaim);
            var m = await _context.Customers
                .Where(c => c.Id == musteriId && c.IsActive == true)
                .Select(m => new MusteriDto
                {
                    Id = m.Id,
                    Adi = m.Adi,
                    Soyadi = m.Soyadi,
                    KimlikNo = m.KimlikNo,
                    TelefonNo = m.TelefonNo,
                    DogumTarihi = m.DogumTarihi,
                    Email = m.Email,
                    Rol = m.Rol,
                    IsActive = m.IsActive,
                    AvatarUrl = m.AvatarUrl
                })
                .FirstOrDefaultAsync();

            if (m == null) return NotFound();
            return Ok(m);
        }

        private int? MevcutMusteriId()
        {
            var s = User.FindFirst("MusteriId")?.Value;
            return int.TryParse(s, out var id) ? id : null;
        }

        // musterinin telefon mail gibi degistirebilecegi seyler icin profil guncelleme
        [Authorize]
        [HttpPut("profilim/guncelle")]
        public async Task<IActionResult> ProfilGuncelle(ProfilGuncelleDto dto)
        {
            var musteriId = MevcutMusteriId();
            if (musteriId == null) return Unauthorized();

            var musteri = await _context.Customers.FindAsync(musteriId.Value);
            if (musteri == null || !musteri.IsActive)
                return NotFound("Profil bulunamadı.");

            if (string.IsNullOrWhiteSpace(dto.Adi) || dto.Adi.Trim().Length < 2)
                return BadRequest("Ad en az 2 karakter olmalıdır.");
            if (string.IsNullOrWhiteSpace(dto.Soyadi) || dto.Soyadi.Trim().Length < 2)
                return BadRequest("Soyad en az 2 karakter olmalıdır.");

            var temizTelefon = (dto.TelefonNo ?? "").Replace(" ", "").Replace("-", "");
            if (temizTelefon.Length != 11 || !temizTelefon.All(char.IsDigit))
                return BadRequest("Telefon 11 haneli ve sadece rakamlardan oluşmalıdır.");

            if (string.IsNullOrWhiteSpace(dto.Email) ||
                !System.Text.RegularExpressions.Regex.IsMatch(
                    dto.Email,
                    @"^[^\s@]+@[^\s@]+\.[^\s@]+$"))
                return BadRequest("Geçerli bir e-posta giriniz.");

            // baska email ile cakısmamasi icin
            var emailKullaniliyor = await _context.Customers
                .AnyAsync(c => c.Id != musteriId.Value &&
                               c.Email == dto.Email &&
                               c.IsActive);
            if (emailKullaniliyor)
                return BadRequest("Bu e-posta başka bir hesap tarafından kullanılıyor.");

            musteri.Adi = dto.Adi.Trim();
            musteri.Soyadi = dto.Soyadi.Trim();
            musteri.TelefonNo = temizTelefon;
            musteri.Email = dto.Email.Trim().ToLowerInvariant();

            await _context.SaveChangesAsync();
            return Ok(new { Mesaj = "Profil bilgileriniz güncellendi." });
        }

        // sifre degistirme - bcrypt verify ediyor
        [Authorize]
        [HttpPut("profilim/sifre-degistir")]
        public async Task<IActionResult> SifreDegistir(SifreDegistirDto dto)
        {
            var musteriId = MevcutMusteriId();
            if (musteriId == null) return Unauthorized();

            var musteri = await _context.Customers.FindAsync(musteriId.Value);
            if (musteri == null || !musteri.IsActive)
                return NotFound("Hesap bulunamadı.");

            if (string.IsNullOrWhiteSpace(dto.EskiSifre))
                return BadRequest("Mevcut şifrenizi girmelisiniz.");
            if (string.IsNullOrWhiteSpace(dto.YeniSifre) || dto.YeniSifre.Length < 8)
                return BadRequest("Yeni şifre en az 8 karakter olmalıdır.");
            if (dto.EskiSifre == dto.YeniSifre)
                return BadRequest("Yeni şifre eskisinden farklı olmalıdır.");

            if (!BCrypt.Net.BCrypt.Verify(dto.EskiSifre, musteri.Sifre))
                return BadRequest("Mevcut şifre hatalı.");

            // yeni sifreyi hash'leyip kaydet
            musteri.Sifre = BCrypt.Net.BCrypt.HashPassword(dto.YeniSifre);
            await _context.SaveChangesAsync();

            return Ok(new { Mesaj = "Şifreniz başarıyla güncellendi." });
        }

        // avatar yukleme - hasar kayittaki foto yukleme mantigiyla ayni
        [Authorize]
        [HttpPost("profilim/avatar-yukle")]
        [RequestSizeLimit(3 * 1024 * 1024)]  
        public async Task<IActionResult> AvatarYukle(IFormFile file, [FromServices] IWebHostEnvironment env)
        {
            var musteriId = MevcutMusteriId();
            if (musteriId == null) return Unauthorized();

            if (file == null || file.Length == 0)
                return BadRequest("Dosya gönderilmedi.");

            const long maxBytes = 2 * 1024 * 1024;
            if (file.Length > maxBytes)
                return BadRequest("Avatar boyutu 2 MB'tan büyük olamaz.");

            var izinliMime = new[] { "image/jpeg", "image/jpg", "image/png", "image/webp" };
            if (!izinliMime.Contains(file.ContentType?.ToLowerInvariant()))
                return BadRequest("Sadece JPG, PNG veya WebP yükleyebilirsiniz.");

            var uzanti = Path.GetExtension(file.FileName)?.ToLowerInvariant();
            var izinliUzanti = new[] { ".jpg", ".jpeg", ".png", ".webp" };
            if (!izinliUzanti.Contains(uzanti))
                return BadRequest("Geçersiz dosya uzantısı.");

            using (var stream = file.OpenReadStream())
            {
                var bytes = new byte[12];
                var okunan = await stream.ReadAsync(bytes);
                if (okunan < 4) return BadRequest("Dosya geçersiz.");

                bool gecerli =
                    (bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF) ||           // JPEG
                    (bytes[0] == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47) ||  // PNG
                    (okunan >= 12 &&
                     bytes[0] == 0x52 && bytes[1] == 0x49 && bytes[2] == 0x46 && bytes[3] == 0x46 &&
                     bytes[8] == 0x57 && bytes[9] == 0x45 && bytes[10] == 0x42 && bytes[11] == 0x50);  // WebP

                if (!gecerli) return BadRequest("Dosya geçerli bir resim değil.");
            }

            var guvenliAd = $"{Guid.NewGuid():N}{uzanti}";
            var hedefKlasor = Path.Combine(env.ContentRootPath, "wwwroot", "uploads", "avatars");
            Directory.CreateDirectory(hedefKlasor);
            var hedefDosya = Path.Combine(hedefKlasor, guvenliAd);

            using (var stream = new FileStream(hedefDosya, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            // eski avatarı temizliyoruz
            var musteri = await _context.Customers.FindAsync(musteriId.Value);
            if (musteri != null)
            {
                if (!string.IsNullOrEmpty(musteri.AvatarUrl) &&
                    musteri.AvatarUrl.StartsWith("/uploads/avatars/"))
                {
                    var eskiDosya = Path.Combine(
                        env.ContentRootPath, "wwwroot",
                        musteri.AvatarUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
                    if (System.IO.File.Exists(eskiDosya))
                    {
                        try { System.IO.File.Delete(eskiDosya); } catch { }
                    }
                }

                musteri.AvatarUrl = $"/uploads/avatars/{guvenliAd}";
                await _context.SaveChangesAsync();
            }

            return Ok(new { Url = musteri?.AvatarUrl, Mesaj = "Avatar güncellendi." });
        }

        // avatarı direkt kaldırmak istersek
        [Authorize]
        [HttpDelete("profilim/avatar-kaldir")]
        public async Task<IActionResult> AvatarKaldir([FromServices] IWebHostEnvironment env)
        {
            var musteriId = MevcutMusteriId();
            if (musteriId == null) return Unauthorized();

            var musteri = await _context.Customers.FindAsync(musteriId.Value);
            if (musteri == null) return NotFound();

            if (!string.IsNullOrEmpty(musteri.AvatarUrl) &&
                musteri.AvatarUrl.StartsWith("/uploads/avatars/"))
            {
                var dosya = Path.Combine(
                    env.ContentRootPath, "wwwroot",
                    musteri.AvatarUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
                if (System.IO.File.Exists(dosya))
                {
                    try { System.IO.File.Delete(dosya); } catch { }
                }
            }

            musteri.AvatarUrl = null;
            await _context.SaveChangesAsync();
            return Ok(new { Mesaj = "Avatar kaldırıldı." });
        }
    }

    public class LoginRequest
    {
        public required string EmailVeyaKimlik { get; set; }
        public required string Sifre { get; set; }
    }

    public class OtpDogrulaRequest
    {
        public required string Email { get; set; }
        public required string Otp { get; set; }
    }
}