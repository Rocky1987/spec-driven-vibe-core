# language: zh-TW
# 規格（L1）：價格計算的 Web 介面。金額規則一律引用 price-calculation.feature，本檔不重述。
# 本檔只能由 Spec Agent 修改。

@level:L1
功能: 限量搶購價格計算頁面
  作為購買者
  我需要在網頁輸入條件並看到折扣後金額

  # 表單欄位名稱固定為 unitPrice、quantity、discountRate。

  @rule:WEB-001
  Rule: 首頁顯示價格計算表單
    GET / 回應 200，頁面含 unitPrice、quantity、discountRate 三個輸入欄位與送出按鈕。

  @rule:WEB-002
  Rule: 輸入合法時顯示小計、折扣金額與總額
    POST /price 回應 200，頁面顯示的小計、折扣金額、總額，
    必須等於 PRC-001 對同一組輸入的計算結果。

    場景: 合法輸入
      假設 unitPrice 為 19.99、quantity 為 3、discountRate 為 0.15
      當 送出表單
      那麼 回應 200
      而且 頁面顯示小計 59.97、折扣金額 8.99、總額 50.98

  @rule:WEB-003
  Rule: 輸入不合法時回應 400 並顯示錯誤碼
    錯誤碼與優先順序沿用 PRC-002、PRC-004，頁面不得顯示小計、折扣金額、總額。

    場景大綱: 不合法輸入
      當 以 unitPrice <單價>、quantity <數量>、discountRate <折扣率> 送出表單
      那麼 回應 400
      而且 頁面顯示錯誤碼 <錯誤碼>

      例子:
        | 單價   | 數量 | 折扣率 | 錯誤碼                       |
        | 100.00 | 0    | 0.10   | QUANTITY_OUT_OF_RANGE        |
        | 0.00   | 1    | 0.10   | UNIT_PRICE_OUT_OF_RANGE      |
        | 19.999 | 1    | 0.10   | UNIT_PRICE_INVALID_PRECISION |
        | 100.00 | 1    | 1.01   | DISCOUNT_RATE_OUT_OF_RANGE   |
        | 0.00   | 0    | 2.00   | QUANTITY_OUT_OF_RANGE        |

  @rule:WEB-004
  Rule: 頁面不自行計算，一律呼叫 PriceCalculator
    以 WEB-002 與 WEB-003 的結果間接驗證，不另寫測試。
