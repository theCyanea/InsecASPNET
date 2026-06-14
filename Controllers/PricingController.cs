using InsecASPNET.Data;
using InsecASPNET.Models.Pricing;
using InsecASPNET.Services.Pricing;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace InsecASPNET.Controllers
{
    
    [Route("api/[controller]")]
    [ApiController]
    public class PricingController : ControllerBase
    {
        private readonly InsecDbContext _context;
        private readonly IEnumerable<IPricingStrategy> _strategiler;
        private readonly DefaultPricingStrategy _varsayilanStrategy;

        public PricingController(
            InsecDbContext context,
            IEnumerable<IPricingStrategy> strategiler,
            DefaultPricingStrategy varsayilanStrategy)
        {
            _context = context;
            _strategiler = strategiler;
            _varsayilanStrategy = varsayilanStrategy;
        }

        // risk semasını gosteriyoruz
        [HttpGet("risk-semasi/{productCode}")]
        public IActionResult RiskSemasiniGetir(string productCode)
        {
            if (string.IsNullOrWhiteSpace(productCode))
                return Ok(new List<RiskParameter>());

            if (RiskSchemas.Sema.TryGetValue(productCode, out var liste))
            {
                // DisplayOrder'a gore sırala
                var sirali = liste.OrderBy(p => p.DisplayOrder).ToList();
                return Ok(sirali);
            }

            return Ok(new List<RiskParameter>());
        }

        // teklif olustururken her input degistiginde risk faktörü degistigi icin bu endpointi cagırır
        // kullanıcı yaptıgı her degisikligin fiyatı nasıl etkilediğini görür
        [HttpPost("teklif-hesapla")]
        public async Task<IActionResult> TeklifHesapla([FromBody] TeklifHesaplaDto dto)
        {
            if (dto == null || dto.ProductId <= 0)
                return BadRequest(new { Mesaj = "Geçersiz istek: ProductId zorunlu." });

            var urun = await _context.Products
                .Include(u => u.Coverages)
                .FirstOrDefaultAsync(u => u.Id == dto.ProductId);

            if (urun == null)
                return NotFound(new { Mesaj = "Ürün bulunamadı." });

            var secilenTeminatlar = urun.Coverages
                .Where(c => dto.SelectedCoverageIds.Contains(c.Id))
                .ToList();

            // zorunlu teminatlar mutlaka dahil edilmeli
            foreach (var zorunlu in urun.Coverages.Where(c => c.IsRequired))
            {
                if (!secilenTeminatlar.Any(t => t.Id == zorunlu.Id))
                    secilenTeminatlar.Add(zorunlu);
            }

            var strategy = SecStrategy(urun.ProductCode);

            var riskDict = dto.RiskParameters ?? new Dictionary<string, string>();
            var sonuc = strategy.Hesapla(urun, secilenTeminatlar, riskDict);

            return Ok(sonuc);
        }

        // her strategy'nin ProductCode'u var: ürüne göre farklı strategy kullaniyoruz
        // bulamazsa default strategy'yi kullanıyor 
        private IPricingStrategy SecStrategy(string? productCode)
        {
            if (string.IsNullOrWhiteSpace(productCode))
                return _varsayilanStrategy;

            var match = _strategiler.FirstOrDefault(s =>
                string.Equals(s.ProductCode, productCode, StringComparison.OrdinalIgnoreCase));

            return match ?? _varsayilanStrategy;
        }
    }
}
