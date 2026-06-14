using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InsecASPNET.Migrations
{
    /// <inheritdoc />
    public partial class SifreVeRolEklendi : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Rol",
                table: "Customers",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Sifre",
                table: "Customers",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Rol",
                table: "Customers");

            migrationBuilder.DropColumn(
                name: "Sifre",
                table: "Customers");
        }
    }
}
