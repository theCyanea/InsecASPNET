using InsecASPNET.Data;
using InsecASPNET.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace InsecASPNET.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ProductsController : ControllerBase
    {
        private readonly InsecDbContext _context;

        public ProductsController(InsecDbContext context)
        {
            _context = context;
        }

        [HttpGet("tum-urunleri-ve-teminatlari-getir")]
        public async Task<IActionResult> TumUrunleriVeTeminatlariGetir()
        {
            // DisplayOrder ASC -> admin'in panelinden ayarladıgı sırayla geliyor
            var urunler = await _context.Products
                .Include(p => p.Coverages)
                .OrderBy(p => p.DisplayOrder)
                .ThenBy(p => p.Id)
                .ToListAsync();

            return Ok(urunler);
        }

        [Authorize(Roles = "Admin")]
        [HttpPost("yeni-urun-ekle")]
        public async Task<IActionResult> YeniUrunEkle(Product yeniUrun)
        {
            _context.Products.Add(yeniUrun);
            await _context.SaveChangesAsync();
            return Ok("Ürün ve alt teminatları sisteme başarıyla kaydedildi!");
        }

        [Authorize(Roles = "Admin")]
        [HttpPut("urun-fiyati-guncelle/{id}")]
        public async Task<IActionResult> UrunFiyatiGuncelle(int id, Product guncelUrunBilgisi)
        {
            var urun = await _context.Products.FindAsync(id);

            if (urun == null)
                return NotFound("Güncellenmek istenen ürün bulunamadı.");

            urun.Price = guncelUrunBilgisi.Price;
            urun.ProductName = guncelUrunBilgisi.ProductName;

            await _context.SaveChangesAsync();
            return Ok(new { Mesaj = "Ürün bilgileri ve fiyatı başarıyla güncellendi!", GuncelFiyat = urun.Price });
        }
    }
}