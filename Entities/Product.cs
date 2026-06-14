namespace InsecASPNET.Entities
{
    public class Product
    {
        public int Id { get; set; }
        public required string ProductName { get; set; }
        public string? ProductDescription { get; set; }

        public decimal Price { get; set; }

        public int DisplayOrder { get; set; } = 0;

        public bool CanCustomStartDate { get; set; } = true;

        public string AllowedDurationsDays { get; set; } = "365";

        public string? ProductCode { get; set; }

        public List<Coverage> Coverages { get; set; } = new();
    }
}
