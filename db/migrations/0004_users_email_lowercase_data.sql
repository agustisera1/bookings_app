-- Before users_email_lowercase: existing rows must already satisfy the CHECK. Two emails that
-- collide once lowercased fail here on unique_email, on purpose: that's a duplicate account to resolve by hand.
UPDATE "users" SET "email" = lower("email") WHERE "email" <> lower("email");
