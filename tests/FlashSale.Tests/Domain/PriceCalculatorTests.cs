using FlashSale.Web.Domain;

namespace FlashSale.Tests.Domain;

// 規格：specs/flash-sale/price-calculation.feature
// 每個測試方法對應規格中的一個場景；每筆資料列對應該場景「例子」表格中的一列，順序與規格相同。
// 所有輸入與期望值皆直接抄自規格表格（保留原始小數位數），錯誤碼以規格原文字串斷言。
public sealed class PriceCalculatorTests
{
    private readonly PriceCalculator _calculator = new();

    // ── PRC-001：總額等於小計減去折扣，折扣金額向下捨去至分 ─────────────────

    // 單價, 數量, 折扣率, 小計, 折扣金額, 總額
    public static TheoryData<decimal, int, decimal, decimal, decimal, decimal> Prc001HappyExamples => new()
    {
        { 100.00m, 3, 0.10m, 300.00m, 30.00m, 270.00m },
        { 19.99m, 3, 0.15m, 59.97m, 8.99m, 50.98m },
        { 19.99m, 3, 0.155m, 59.97m, 9.29m, 50.68m },
    };

    // @happy 場景大綱: 依折扣率計算小計、折扣金額與總額
    [Theory]
    [MemberData(nameof(Prc001HappyExamples))]
    [Trait("Kind", "happy")]
    [Trait("Rule", "PRC-001")]
    public void Prc001_CalculatesSubtotalDiscountAmountAndTotalByDiscountRate(
        decimal unitPrice, int quantity, decimal discountRate,
        decimal expectedSubtotal, decimal expectedDiscountAmount, decimal expectedTotal)
    {
        var result = _calculator.Calculate(unitPrice, quantity, discountRate);

        Assert.Equal(expectedSubtotal, result.Subtotal);
        Assert.Equal(expectedDiscountAmount, result.DiscountAmount);
        Assert.Equal(expectedTotal, result.Total);
    }

    // 單價, 數量, 折扣率, 小計, 折扣金額, 總額
    public static TheoryData<decimal, int, decimal, decimal, decimal, decimal> Prc001BoundaryExamples => new()
    {
        { 0.01m, 1, 0.50m, 0.01m, 0.00m, 0.01m },
        { 0.99m, 1, 0.50m, 0.99m, 0.49m, 0.50m },
        { 1.15m, 1, 1.00m, 1.15m, 1.15m, 0.00m },
        { 100.00m, 1, 0.00m, 100.00m, 0.00m, 100.00m },
        { 100.00m, 99, 0.00m, 9900.00m, 0.00m, 9900.00m },
        { 100000.00m, 99, 0.00m, 9900000.00m, 0.00m, 9900000.00m },
        { 999.99m, 99, 1.00m, 98999.01m, 98999.01m, 0.00m },
    };

    // @boundary 場景大綱: 捨入、十進位精確度與極值邊界
    [Theory]
    [MemberData(nameof(Prc001BoundaryExamples))]
    [Trait("Kind", "boundary")]
    [Trait("Rule", "PRC-001")]
    public void Prc001_RoundingDecimalPrecisionAndExtremeBoundaries_ProduceExactAmounts(
        decimal unitPrice, int quantity, decimal discountRate,
        decimal expectedSubtotal, decimal expectedDiscountAmount, decimal expectedTotal)
    {
        var result = _calculator.Calculate(unitPrice, quantity, discountRate);

        Assert.Equal(expectedSubtotal, result.Subtotal);
        Assert.Equal(expectedDiscountAmount, result.DiscountAmount);
        Assert.Equal(expectedTotal, result.Total);
    }

    // ── PRC-002：超出範圍或單價不是整分的輸入，必須以錯誤碼拒絕 ─────────────

    // 單價, 數量, 折扣率
    public static TheoryData<decimal, int, decimal> Prc002HappyExamples => new()
    {
        { 100.00m, 3, 0.10m },
        { 19.99m, 3, 0.155m },
    };

    // @happy 場景大綱: 範圍內且單價為整分的輸入可完成計算
    [Theory]
    [MemberData(nameof(Prc002HappyExamples))]
    [Trait("Kind", "happy")]
    [Trait("Rule", "PRC-002")]
    public void Prc002_InRangeWholeCentInput_Succeeds(decimal unitPrice, int quantity, decimal discountRate)
    {
        var result = _calculator.Calculate(unitPrice, quantity, discountRate);

        Assert.True(result.IsSuccess);
    }

    // 單價, 數量, 折扣率
    public static TheoryData<decimal, int, decimal> Prc002BoundaryExamples => new()
    {
        { 100.00m, 1, 0.10m },
        { 100.00m, 99, 0.10m },
        { 0.01m, 1, 0.10m },
        { 100000.00m, 1, 0.10m },
        { 99999.99m, 1, 0.10m },
        { 1.000m, 1, 0.10m },
        { 100.00m, 1, 0.00m },
        { 100.00m, 1, 1.00m },
        { 100.00m, 1, 0.001m },
        { 100.00m, 1, 0.999m },
    };

    // @boundary 場景大綱: 合法範圍的邊界值可完成計算
    [Theory]
    [MemberData(nameof(Prc002BoundaryExamples))]
    [Trait("Kind", "boundary")]
    [Trait("Rule", "PRC-002")]
    public void Prc002_ValidRangeBoundaryValues_Succeed(decimal unitPrice, int quantity, decimal discountRate)
    {
        var result = _calculator.Calculate(unitPrice, quantity, discountRate);

        Assert.True(result.IsSuccess);
    }

    // @error 場景大綱: 拒絕超出範圍的數量（單價 100.00、折扣率 0.10）
    [Theory]
    [InlineData(0)]
    [InlineData(100)]
    [InlineData(-1)]
    [Trait("Kind", "error")]
    [Trait("Rule", "PRC-002")]
    public void Prc002_QuantityOutOfRange_ReturnsQuantityOutOfRange(int quantity)
    {
        var result = _calculator.Calculate(100.00m, quantity, 0.10m);

        Assert.Equal("QUANTITY_OUT_OF_RANGE", result.ErrorCode);
    }

    // 單價
    public static TheoryData<decimal> Prc002UnitPriceOutOfRangeExamples => new()
    {
        0.00m,
        -1.00m,
        100000.01m,
    };

    // @error 場景大綱: 拒絕超出範圍的單價（數量 1、折扣率 0.10）
    [Theory]
    [MemberData(nameof(Prc002UnitPriceOutOfRangeExamples))]
    [Trait("Kind", "error")]
    [Trait("Rule", "PRC-002")]
    public void Prc002_UnitPriceOutOfRange_ReturnsUnitPriceOutOfRange(decimal unitPrice)
    {
        var result = _calculator.Calculate(unitPrice, 1, 0.10m);

        Assert.Equal("UNIT_PRICE_OUT_OF_RANGE", result.ErrorCode);
    }

    // 單價
    public static TheoryData<decimal> Prc002UnitPriceInvalidPrecisionExamples => new()
    {
        1.001m,
        0.015m,
        99999.999m,
        10.0001m,
    };

    // @error 場景大綱: 拒絕在範圍內但不是整分的單價（數量 1、折扣率 0.10）
    [Theory]
    [MemberData(nameof(Prc002UnitPriceInvalidPrecisionExamples))]
    [Trait("Kind", "error")]
    [Trait("Rule", "PRC-002")]
    public void Prc002_UnitPriceInRangeButNotWholeCent_ReturnsUnitPriceInvalidPrecision(decimal unitPrice)
    {
        var result = _calculator.Calculate(unitPrice, 1, 0.10m);

        Assert.Equal("UNIT_PRICE_INVALID_PRECISION", result.ErrorCode);
    }

    // 折扣率
    public static TheoryData<decimal> Prc002DiscountRateOutOfRangeExamples => new()
    {
        1.01m,
        -0.01m,
        1.001m,
        -0.001m,
    };

    // @error 場景大綱: 拒絕超出範圍的折扣率（單價 100.00、數量 1）
    [Theory]
    [MemberData(nameof(Prc002DiscountRateOutOfRangeExamples))]
    [Trait("Kind", "error")]
    [Trait("Rule", "PRC-002")]
    public void Prc002_DiscountRateOutOfRange_ReturnsDiscountRateOutOfRange(decimal discountRate)
    {
        var result = _calculator.Calculate(100.00m, 1, discountRate);

        Assert.Equal("DISCOUNT_RATE_OUT_OF_RANGE", result.ErrorCode);
    }

    // ── PRC-003：計算一律回傳計算結果且不拋出例外，成功與失敗的欄位內容固定 ───

    // @happy 場景: 合法輸入回傳成功的計算結果
    [Fact]
    [Trait("Kind", "happy")]
    [Trait("Rule", "PRC-003")]
    public void Prc003_ValidInput_ReturnsSuccessfulResult()
    {
        var result = _calculator.Calculate(100.00m, 3, 0.10m);

        Assert.True(result.IsSuccess);
        Assert.Equal(300.00m, result.Subtotal);
        Assert.Equal(30.00m, result.DiscountAmount);
        Assert.Equal(270.00m, result.Total);
        Assert.Null(result.ErrorCode);
    }

    // 單價, 數量, 折扣率, 小計, 折扣金額, 總額
    public static TheoryData<decimal, int, decimal, decimal, decimal, decimal> Prc003BoundaryExamples => new()
    {
        { 999.99m, 99, 1.00m, 98999.01m, 98999.01m, 0.00m },
        { 100.00m, 1, 0.00m, 100.00m, 0.00m, 100.00m },
    };

    // @boundary 場景大綱: 成功結果中的 0.00 金額是有值的 0.00，不是無值
    [Theory]
    [MemberData(nameof(Prc003BoundaryExamples))]
    [Trait("Kind", "boundary")]
    [Trait("Rule", "PRC-003")]
    public void Prc003_ZeroAmountInSuccessfulResult_IsZeroValueNotNull(
        decimal unitPrice, int quantity, decimal discountRate,
        decimal expectedSubtotal, decimal expectedDiscountAmount, decimal expectedTotal)
    {
        var result = _calculator.Calculate(unitPrice, quantity, discountRate);

        Assert.True(result.IsSuccess);
        Assert.Equal(expectedSubtotal, result.Subtotal);
        Assert.Equal(expectedDiscountAmount, result.DiscountAmount);
        Assert.Equal(expectedTotal, result.Total);
        Assert.Null(result.ErrorCode);
    }

    // 單價, 數量, 折扣率, 錯誤碼
    public static TheoryData<decimal, int, decimal, string> Prc003ErrorExamples => new()
    {
        { 100.00m, 0, 0.10m, "QUANTITY_OUT_OF_RANGE" },
        { 0.00m, 1, 0.10m, "UNIT_PRICE_OUT_OF_RANGE" },
        { 1.001m, 1, 0.10m, "UNIT_PRICE_INVALID_PRECISION" },
        { 100.00m, 1, 1.01m, "DISCOUNT_RATE_OUT_OF_RANGE" },
    };

    // @error 場景大綱: 不合法的輸入回傳失敗的計算結果，且不拋出例外
    // 「不應拋出例外」：直接呼叫計算方法；若拋出例外，測試即以該例外失敗。
    [Theory]
    [MemberData(nameof(Prc003ErrorExamples))]
    [Trait("Kind", "error")]
    [Trait("Rule", "PRC-003")]
    public void Prc003_InvalidInput_ReturnsFailedResultWithoutThrowing(
        decimal unitPrice, int quantity, decimal discountRate, string expectedErrorCode)
    {
        var result = _calculator.Calculate(unitPrice, quantity, discountRate);

        Assert.False(result.IsSuccess);
        Assert.Equal(expectedErrorCode, result.ErrorCode);
        Assert.Null(result.Subtotal);
        Assert.Null(result.DiscountAmount);
        Assert.Null(result.Total);
    }

    // ── PRC-004：多項檢查同時不通過時，依固定順序只回傳第一個錯誤碼 ─────────

    // 單價, 數量, 折扣率, 錯誤碼
    public static TheoryData<decimal, int, decimal, string> Prc004ErrorExamples => new()
    {
        { 0.00m, 0, 1.50m, "QUANTITY_OUT_OF_RANGE" },
        { 100.00m, 0, 1.50m, "QUANTITY_OUT_OF_RANGE" },
        { 0.00m, 0, 0.10m, "QUANTITY_OUT_OF_RANGE" },
        { 0.00m, 1, 1.50m, "UNIT_PRICE_OUT_OF_RANGE" },
        { -1.00m, -1, -0.01m, "QUANTITY_OUT_OF_RANGE" },
        { 1.001m, 0, 0.10m, "QUANTITY_OUT_OF_RANGE" },
        { 1.001m, 1, 1.50m, "UNIT_PRICE_INVALID_PRECISION" },
    };

    // @error @priority 場景大綱: 多項不合法時依 數量 → 單價 → 折扣率 的順序回傳第一個錯誤碼
    [Theory]
    [MemberData(nameof(Prc004ErrorExamples))]
    [Trait("Kind", "error")]
    [Trait("Rule", "PRC-004")]
    public void Prc004_MultipleInvalidInputs_ReturnsFirstErrorCodeInCheckOrder(
        decimal unitPrice, int quantity, decimal discountRate, string expectedErrorCode)
    {
        var result = _calculator.Calculate(unitPrice, quantity, discountRate);

        Assert.Equal(expectedErrorCode, result.ErrorCode);
    }

    // 單價, 數量, 折扣率, 錯誤碼
    public static TheoryData<decimal, int, decimal, string> Prc004BoundaryExamples => new()
    {
        { 100.00m, 100, -0.01m, "QUANTITY_OUT_OF_RANGE" },
        { 100000.01m, 99, 1.01m, "UNIT_PRICE_OUT_OF_RANGE" },
        { 100000.01m, 100, 1.01m, "QUANTITY_OUT_OF_RANGE" },
        { 0.005m, 1, 0.10m, "UNIT_PRICE_OUT_OF_RANGE" },
        { 100000.001m, 1, 0.10m, "UNIT_PRICE_OUT_OF_RANGE" },
        { 99999.999m, 99, 1.001m, "UNIT_PRICE_INVALID_PRECISION" },
    };

    // @boundary @priority 場景大綱: 邊界外的值同時出現，以及單價範圍與精度同時不通過時的順序
    [Theory]
    [MemberData(nameof(Prc004BoundaryExamples))]
    [Trait("Kind", "boundary")]
    [Trait("Rule", "PRC-004")]
    public void Prc004_OutOfBoundaryCombinationsAndPriceRangeWithPrecision_ReturnsFirstErrorCodeInCheckOrder(
        decimal unitPrice, int quantity, decimal discountRate, string expectedErrorCode)
    {
        var result = _calculator.Calculate(unitPrice, quantity, discountRate);

        Assert.Equal(expectedErrorCode, result.ErrorCode);
    }
}
