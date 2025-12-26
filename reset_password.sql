UPDATE users 
SET password_hash = '$2a$12$yLl5ZF9ePm00QU/5bo39iOLXMw09b6DxLYdOvrh4HwSINPDWMFzba', 
    email_verified = true 
WHERE email LIKE '%maffei%';
