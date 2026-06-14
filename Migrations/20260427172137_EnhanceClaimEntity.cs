using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InsecASPNET.Migrations
{
    /// <inheritdoc />
    public partial class EnhanceClaimEntity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AdminNotu",
                table: "Claims",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "HasarTarihi",
                table: "Claims",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "HasarTuru",
                table: "Claims",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "HasarYeri",
                table: "Claims",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "OnaylananTutar",
                table: "Claims",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RetSebebi",
                table: "Claims",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "SonuclanmaTarihi",
                table: "Claims",
                type: "datetime2",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AdminNotu",
                table: "Claims");

            migrationBuilder.DropColumn(
                name: "HasarTarihi",
                table: "Claims");

            migrationBuilder.DropColumn(
                name: "HasarTuru",
                table: "Claims");

            migrationBuilder.DropColumn(
                name: "HasarYeri",
                table: "Claims");

            migrationBuilder.DropColumn(
                name: "OnaylananTutar",
                table: "Claims");

            migrationBuilder.DropColumn(
                name: "RetSebebi",
                table: "Claims");

            migrationBuilder.DropColumn(
                name: "SonuclanmaTarihi",
                table: "Claims");
        }
    }
}
