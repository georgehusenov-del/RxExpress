using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RxExpresss.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCircuitFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CircuitPlanId",
                table: "RoutePlans",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CircuitStopId",
                table: "Orders",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CircuitDriverId",
                table: "Drivers",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CircuitPlanId",
                table: "RoutePlans");

            migrationBuilder.DropColumn(
                name: "CircuitStopId",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "CircuitDriverId",
                table: "Drivers");
        }
    }
}
