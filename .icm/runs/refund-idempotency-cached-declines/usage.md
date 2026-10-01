# Usage: refund-idempotency-cached-declines

- usage: define start 2026-10-01T12:48:45Z harness=claude-cloud session=9166b69c-7d13-5639-b1d9-5d2368ec47a6 source=transcript model=anthropic/claude-opus-5-5 in=8 out=1070 cache_read=326142 cache_write=66981 cost_usd=0.6225 turns=1
- usage: define end 2026-10-01T12:52:59Z harness=claude-cloud session=9166b69c-7d13-5639-b1d9-5d2368ec47a6 source=transcript model=anthropic/claude-opus-5-5 in=42 out=16442 cache_read=2606500 cache_write=109724 cost_usd=1.7281 turns=1
- usage: build start 2026-10-01T12:54:46Z harness=claude-cloud session=9166b69c-7d13-5639-b1d9-5d2368ec47a6 source=transcript model=anthropic/claude-opus-5-5 in=64 out=18343 cache_read=4109947 cache_write=140501 cost_usd=2.3131 turns=2
- usage: build end 2026-10-01T13:06:16Z harness=claude-cloud session=9166b69c-7d13-5639-b1d9-5d2368ec47a6 source=transcript model=anthropic/claude-opus-5-5 in=186 out=58072 cache_read=18800596 cache_write=243043 cost_usd=6.8666 turns=2
- usage: release start 2026-10-01T13:15:27Z harness=claude-cloud session=9166b69c-7d13-5639-b1d9-5d2368ec47a6 source=transcript model=anthropic/claude-opus-5-5 in=192 out=59435 cache_read=19666732 cache_write=253818 cost_usd=7.1534 turns=3
