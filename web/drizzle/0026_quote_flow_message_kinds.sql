ALTER TYPE "public"."message_kind" ADD VALUE IF NOT EXISTS 'quote-sent';--> statement-breakpoint
ALTER TYPE "public"."message_kind" ADD VALUE IF NOT EXISTS 'deposit-received';--> statement-breakpoint
ALTER TYPE "public"."message_kind" ADD VALUE IF NOT EXISTS 'balance-paid';
