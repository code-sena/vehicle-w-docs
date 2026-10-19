# Sequence — Loyalty points and coupon redemption (RF-024, RF-025, RF-026)

Source: `payment-service` `LoyaltyController` (`/api/v1/loyalty`), `CustomerPromotionService.RedeemAsync`,
`LoyaltyService.BalanceAsync`, `LoyaltyRewardService`, `Promotion.Redeem`, `AmountDueCalculator`.
Checked against the code on 2026-10-19.

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    actor A as Admin
    participant W as Web / app (through the gateway)
    participant P as payment-service (.NET)
    participant B as booking-service
    participant DB as SQL Server (payment, promotion)
    participant MQ as RabbitMQ (carwash.events)
    participant N as notification-service

    Note over A,P: The admin creates the coupons: POST /api/v1/admin/promotions<br/>(type, value, dates, limits, RequiredPoints)

    rect rgb(235, 245, 235)
    Note over P,N: Earning points: when a payment is approved (see SEQ-05)
    P->>DB: loyalty_transaction EARNED (sum of the points of the booking lines)
    P->>DB: active coupons whose RequiredPoints fall between the old and the new balance
    P->>MQ: payment.loyalty_points_earned {points, balance, unlocked coupons}
    MQ->>N: LOYALTY_POINTS_EARNED (+ PROMOTION_AVAILABLE per unlocked coupon)
    N-->>C: inbox, push and email
    end

    C->>W: My points / Coupons
    W->>P: GET /api/v1/loyalty/balance
    P->>DB: last balance_after of the user
    W->>P: GET /api/v1/loyalty/promotions
    P-->>W: coupons in force, marked unlocked or locked by points

    C->>W: Apply coupon CODE to booking 123 (before paying)
    W->>P: POST /api/v1/loyalty/redeem {bookingId, code}
    P->>B: GET /bookings/{id} (client JWT)
    B-->>P: status, total, owner
    P->>DB: approved or open payment of the booking?
    alt booking already has a reported or approved payment
        P-->>W: 409 PAYMENT_ALREADY_REPORTED | PAYMENT_ALREADY_APPROVED
    else unknown code
        P-->>W: 404 PROMOTION_NOT_FOUND
    else
        P->>DB: amount due, points, redemptions (on the booking, total, by the user)
        P->>P: Promotion.Redeem: dates, points, not on this booking yet,<br/>minimum purchase, total limit, limit per user
        alt rule broken
            P-->>W: 400 PROMOTION_NOT_REDEEMABLE | PROMOTION_ALREADY_REDEEMED |<br/>PROMOTION_MIN_PURCHASE_NOT_MET | PROMOTION_EXHAUSTED |<br/>PROMOTION_CUSTOMER_LIMIT_REACHED
        else
            P->>DB: booking_promotion (applied_amount)
            P->>MQ: payment.promotion_redeemed
            P-->>W: 200 {discount, new amount due}
            MQ->>N: PROMOTION_REDEEMED
        end
    end

    Note over W,P: The next payment of the booking is created for<br/>total − coupons (PaymentPolicy.AmountDue)
    Note over P,DB: A refund reverses the points the booking earned<br/>(loyalty_transaction REVERSED)
```

Points are not spent when a coupon is used: `RequiredPoints` is the level that unlocks it, and the
balance keeps growing with each paid booking. Ledger rules: [class-payment](./class-payment.md).
