using System.Text.Json.Serialization;

namespace InsecASPNET.Entities
{
    public class PolicyCoverage
    {
        public int Id { get; set; }

        public int PolicyId { get; set; }
        [JsonIgnore]
        public Policy? Policy { get; set; }

        public int CoverageId { get; set; }
        public Coverage? Coverage { get; set; }
    }
}
