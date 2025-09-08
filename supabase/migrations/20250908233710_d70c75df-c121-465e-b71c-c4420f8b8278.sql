-- Disable email confirmation requirement
UPDATE auth.config 
SET enable_signup = true, 
    disable_signup = false,
    enable_confirmations = false,
    email_confirm_changes = false
WHERE NOT EXISTS (SELECT 1 FROM auth.config);

-- If no config exists, insert default config with email confirmation disabled
INSERT INTO auth.config (enable_signup, disable_signup, enable_confirmations, email_confirm_changes)
SELECT true, false, false, false
WHERE NOT EXISTS (SELECT 1 FROM auth.config);