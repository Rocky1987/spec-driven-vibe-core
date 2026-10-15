namespace FlashSale.Web.Domain;

// PRC-003：計算結果的五個欄位（是否成功、小計、折扣金額、總額、錯誤碼）。
// 失敗時三個金額欄位為無值（null）；成功時錯誤碼為無值（null）。
public sealed record PriceCalculationResult(
    bool IsSuccess,
    decimal? Subtotal,
    decimal? DiscountAmount,
    decimal? Total,
    string? ErrorCode);
