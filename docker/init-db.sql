-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    subscription_status VARCHAR(50) DEFAULT 'free',
    branding_enabled BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    verification_expires TIMESTAMP,
    reset_token VARCHAR(255),
    reset_expires TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create app_settings table
CREATE TABLE IF NOT EXISTS app_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default pricing config
INSERT INTO app_settings (key, value)
VALUES ('pricing_config', '{"monthly": {"usd": 4.99, "eur": 4.99, "variant_id": ""}, "yearly": {"usd": 49.00, "eur": 49.00, "variant_id": ""}, "lifetime": {"enabled": true, "usd": 99.00, "eur": 99.00, "variant_id": ""}, "discount": {"percent": 0, "active": false}}')
ON CONFLICT (key) DO NOTHING;

-- Create protected_pages table
CREATE TABLE IF NOT EXISTS protected_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    notion_url TEXT NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    custom_domain VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    title VARCHAR(255) DEFAULT 'Pagina Protetta',
    visits_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create custom_domains table
CREATE TABLE IF NOT EXISTS custom_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    domain VARCHAR(255) UNIQUE NOT NULL,
    page_id UUID REFERENCES protected_pages(id) ON DELETE CASCADE,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create access_logs table
CREATE TABLE IF NOT EXISTS access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    protected_page_id UUID REFERENCES protected_pages(id) ON DELETE CASCADE,
    ip_hash VARCHAR(64),
    success BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pages_user_id ON protected_pages(user_id);
CREATE INDEX IF NOT EXISTS idx_pages_slug ON protected_pages(slug);
CREATE INDEX IF NOT EXISTS idx_logs_page_id ON access_logs(protected_page_id);
CREATE INDEX IF NOT EXISTS idx_custom_domains_domain ON custom_domains(domain);