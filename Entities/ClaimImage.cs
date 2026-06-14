using System.Text.Json.Serialization;

namespace InsecASPNET.Entities
{
    public class ClaimImage
    {
        public int Id { get; set; }
        public required string ImageUrl { get; set; }
        public DateTime UploadDate { get; set; } = DateTime.Now;
        public int ClaimId { get; set; }
        [JsonIgnore]
        public Claim? Claim { get; set; }
    }
}
