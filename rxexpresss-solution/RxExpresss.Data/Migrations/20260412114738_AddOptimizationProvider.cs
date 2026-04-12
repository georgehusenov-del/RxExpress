using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RxExpresss.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddOptimizationProvider : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "OptimizationProvider",
                table: "RoutePlans",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "OptimizationProvider",
                table: "RoutePlans");
        }
    }
}
