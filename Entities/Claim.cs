using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;

namespace InsecASPNET.Entities
{

    public class Claim
    {
        public int Id { get; set; }

        public string HasarTuru { get; set; } = "Diğer";

        public DateTime HasarTarihi { get; set; }

        public string? HasarYeri { get; set; }

        public required string ClaimDescription { get; set; }

        [Precision(18, 2)]
        public decimal? ClaimAmount { get; set; }

        public DateTime ClaimDate { get; set; } = DateTime.Now;

        public required string ClaimStatus { get; set; }

        [Precision(18, 2)]
        public decimal? OnaylananTutar { get; set; }

        public string? AdminNotu { get; set; }

        public string? RetSebebi { get; set; }

        public DateTime? SonuclanmaTarihi { get; set; }

        public bool IsActive { get; set; } = true;

        public int PolicyId { get; set; }

        [JsonIgnore]
        public Policy? Policy { get; set; }

        public ICollection<ClaimImage>? Images { get; set; }
    }
}
