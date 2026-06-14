using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InsecASPNET.Migrations
{
    /// <inheritdoc />
    public partial class ProductIdEklendi : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ProductId",
                table: "Policies",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_Policies_ProductId",
                table: "Policies",
                column: "ProductId");

            migrationBuilder.AddForeignKey(
                name: "FK_Policies_Products_ProductId",
                table: "Policies",
                column: "ProductId",
                principalTable: "Products",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Policies_Products_ProductId",
                table: "Policies");

            migrationBuilder.DropIndex(
                name: "IX_Policies_ProductId",
                table: "Policies");

            migrationBuilder.DropColumn(
                name: "ProductId",
                table: "Policies");
        }
    }
}
