using Microsoft.EntityFrameworkCore;

namespace InsecASPNET.Entities
{
    public class Policy
    {
        public int Id { get; set; }
        public required string PolicyNumber { get; set; }
        // police islemlerinde saat önemli olabileceği icin
        // DateOnly yerine bu sefer DateTime yaptık
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        // küsüratlar sigortacılıkta önemli olacağı için precision yani hassasiyetini
        // ayarlamamız gerekiyor. "18, 2" standardını kullanıyoruz
        [Precision(18, 2)] 
        public decimal Price { get; set; }
        public bool IsActive { get; set; } = true;
        public string Status { get; set; } = "Teklif";
        // iliskiler yani bağlantılar:
        public int ProductId { get; set; }
        public Product? Product { get; set; }
        public int CustomerId { get; set; }
        public Customer? Customer { get; set; }
        public int? InsuredPersonId { get; set; }
        public InsuredPerson? InsuredPerson { get; set; }
        public ICollection<PolicyCoverage>? PolicyCoverages { get; set; }
        public string? RiskDataJson { get; set; }
    }
}
