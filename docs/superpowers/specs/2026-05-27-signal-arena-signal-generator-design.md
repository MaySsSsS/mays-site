# Signal Arena Signal Generator Design

## Goal

Add a deterministic pre-AI signal generation layer so the trading AI receives structured, auditable trading signals instead of an empty `signals` array.

## Current Problem

Signal Arena Runner currently sends account, holdings, recent trades, top movers, snapshots, and constraints to the AI. The `signals` field is always empty, so the AI repeatedly concludes that there is no clear buy signal. This is conservative and safe, but it makes market analysis shallow because the AI has to infer signal quality from raw top mover rows.

## Design

Create `workers/signal-arena-api/src/signal-generator.ts` with one public function:

```ts
generateTradingSignals(input): TradingSignal[]
```

The generator is deterministic and uses only already-fetched upstream data:

- CN top movers become momentum or pullback entry signals.
- Existing holdings become take-profit, stop-loss, or rebalance watch signals.
- Recent same-symbol sell trades reduce buy confidence and prevent immediate churn.
- Cash ratio controls whether new buy candidates are allowed.

The AI still makes the final decision. Signals are evidence, not commands.

## Signal Types

- `pullback_entry`: Moderate positive A-share movement, enough cash, no recent same-symbol sell, and no existing position.
- `momentum_watch`: Strong short-term movement that is worth tracking but may be too extended for immediate buy.
- `take_profit_watch`: Existing holding has material profit and should be evaluated for partial sell or continued hold.
- `stop_loss_watch`: Existing holding drawdown is large enough to evaluate risk reduction.
- `position_rebalance`: Existing holding or cash ratio suggests portfolio-level caution.

## Public Trace

Each run stores the generated signals inside `decisionTrace.signalContext`. The public API sanitizes this field and the frontend can show it as "前置信号". This makes it easy to verify whether the new layer is active.

## Validation

Automated tests must prove:

- The generator creates non-empty signals from realistic top movers and holdings.
- Recent sells suppress immediate buy signals for the same symbol.
- Runner sends generated signals into the AI prompt instead of `signals: []`.
- Public sanitization keeps signal context visible while preserving the existing secret whitelist behavior.

Manual/online validation after deployment:

- Trigger a dry-run during an A-share safe session when possible.
- Query `https://signal-arena-api.maysssss.cn/api/public/all` and confirm latest logs include `decisionTrace.signalContext`.
- Review old D1 logs qualitatively: historical raw inputs are incomplete, so old data can validate explanatory coverage, not exact trade profitability.
