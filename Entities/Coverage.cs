using System.Text.Json.Serialization;

namespace InsecASPNET.Entities
{
    public class Coverage
    {
        public int Id { get; set; }
        public required string CoverageName { get; set; }
        public decimal CoveragePrice { get; set; }

        public bool IsRequired { get; set; } = false;

        public int ProductId { get; set; }
        [JsonIgnore]
        public Product? Product { get; set; }
    }
}
