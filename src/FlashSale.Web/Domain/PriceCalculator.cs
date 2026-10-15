namespace FlashSale.Web.Domain;

// 規格：specs/flash-sale/price-calculation.feature（PRC-001 至 PRC-004）。
public sealed class PriceCalculator
{
    private const int MinQuantity = 1;
    private const int MaxQuantity = 99;
    private const decimal MinUnitPrice = 0.01m;
    private const decimal MaxUnitPrice = 100_000.00m;

    public PriceCalculationResult Calculate(decimal unitPrice, int quantity, decimal discountRate)
    {
        // PRC-004：數量 → 單價（範圍，再整分）→ 折扣率，只回傳第一個錯誤。
        if (quantity < MinQuantity || quantity > MaxQuantity)
            return Fail("QUANTITY_OUT_OF_RANGE");

        if (unitPrice < MinUnitPrice || unitPrice > MaxUnitPrice)
            return Fail("UNIT_PRICE_OUT_OF_RANGE");

        if (unitPrice * 100m != decimal.Truncate(unitPrice * 100m))
            return Fail("UNIT_PRICE_INVALID_PRECISION");

        if (discountRate < 0m || discountRate > 1m)
            return Fail("DISCOUNT_RATE_OUT_OF_RANGE");

        // PRC-001：折扣金額只在相乘之後向下捨去至分一次。
        var subtotal = unitPrice * quantity;
        var discount = decimal.Round(subtotal * discountRate, 2, MidpointRounding.ToZero);
        return new PriceCalculationResult(true, subtotal, discount, subtotal - discount, null);
    }

    private static PriceCalculationResult Fail(string errorCode) =>
        new(false, null, null, null, errorCode);
}
