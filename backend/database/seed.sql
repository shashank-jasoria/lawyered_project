-- Drop tables if they exist (for a clean reset)
DROP TABLE IF EXISTS asset_shares CASCADE;
DROP TABLE IF EXISTS assets CASCADE;
DROP TABLE IF EXISTS conversation_messages CASCADE;
DROP TABLE IF EXISTS beneficiaries CASCADE;
DROP TABLE IF EXISTS wills CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Wills table
CREATE TABLE wills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'draft',
    person_name VARCHAR(255),
    person_age INTEGER,
    person_address TEXT,
    sound_mind BOOLEAN,
    revocation_line TEXT,
    executor_id UUID,
    guardian_id UUID,
    signature_date DATE,
    signature_place VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Beneficiaries table (people involved)
CREATE TABLE beneficiaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    will_id UUID NOT NULL REFERENCES wills(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    relationship VARCHAR(100) NOT NULL,
    is_executor BOOLEAN DEFAULT false,
    is_guardian BOOLEAN DEFAULT false,
    is_witness BOOLEAN DEFAULT false,
    share_percentage DECIMAL(5,2),
    type VARCHAR(20) DEFAULT 'beneficiary'
);

-- Assets table
CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    will_id UUID NOT NULL REFERENCES wills(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    total_value DECIMAL(15,2)
);

-- Asset shares table
CREATE TABLE asset_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    beneficiary_id UUID NOT NULL REFERENCES beneficiaries(id) ON DELETE CASCADE,
    share_percentage DECIMAL(5,2) NOT NULL,
    specific_item VARCHAR(255),
    UNIQUE(asset_id, beneficiary_id)
);

-- Conversation messages table
CREATE TABLE conversation_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    will_id UUID NOT NULL REFERENCES wills(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    structured_data_snapshot JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ==================== SAMPLE DATA ====================

-- 1. Demo user (password 'password123' hashed with bcrypt)
INSERT INTO users (id, email, password_hash) VALUES
    ('d0d0d0d0-0000-0000-0000-000000000001', 'demo@lawyered.com', '$2b$12$LJ3m4ys3GZ0X2RQjvYH/8Oq4e6F7.q7K7ZNqGfMzq0fQ5M5g');

-- 2. A half‑drafted will for the demo user
INSERT INTO wills (id, user_id, status, person_name, person_age, person_address, sound_mind, revocation_line)
VALUES
    ('w1000000-0000-0000-0000-000000000001', 'd0d0d0d0-0000-0000-0000-000000000001', 'draft',
     'Ravi Kumar', 45, '123 MG Road, Mumbai', true,
     'I hereby revoke all previous wills and codicils.');

-- Add a few beneficiaries to the draft will
INSERT INTO beneficiaries (id, will_id, full_name, relationship, type) VALUES
    ('b1000000-0000-0000-0000-000000000001', 'w1000000-0000-0000-0000-000000000001', 'Sita Kumar', 'spouse', 'beneficiary'),
    ('b1000000-0000-0000-0000-000000000002', 'w1000000-0000-0000-0000-000000000001', 'Amit Kumar', 'son', 'beneficiary'),
    ('b1000000-0000-0000-0000-000000000003', 'w1000000-0000-0000-0000-000000000001', 'Neha Kumar', 'daughter', 'beneficiary');

-- Add an asset (house) with shares split 50/50 between the two kids
INSERT INTO assets (id, will_id, description, type) VALUES
    ('a1000000-0000-0000-0000-000000000001', 'w1000000-0000-0000-0000-000000000001', 'House in Pune', 'real_estate');

INSERT INTO asset_shares (asset_id, beneficiary_id, share_percentage) VALUES
    ('a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000002', 50.00),
    ('a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000003', 50.00);

-- 3. A completed, valid will for the demo user (used to show final result)
INSERT INTO wills (id, user_id, status, person_name, person_age, person_address, sound_mind, revocation_line, signature_date, signature_place)
VALUES
    ('w2000000-0000-0000-0000-000000000001', 'd0d0d0d0-0000-0000-0000-000000000001', 'completed',
     'Ravi Kumar', 45, '123 MG Road, Mumbai', true,
     'I hereby revoke all previous wills and codicils.',
     '2026-01-15', 'Mumbai');

-- Executor (one of the beneficiaries also acts as executor)
INSERT INTO beneficiaries (id, will_id, full_name, relationship, is_executor, type) VALUES
    ('b2000000-0000-0000-0000-000000000001', 'w2000000-0000-0000-0000-000000000001', 'Sita Kumar', 'spouse', true, 'executor');

-- Set executor_id on the will
UPDATE wills SET executor_id = 'b2000000-0000-0000-0000-000000000001' WHERE id = 'w2000000-0000-0000-0000-000000000001';

-- Guardian for minor child (e.g., a friend)
INSERT INTO beneficiaries (id, will_id, full_name, relationship, is_guardian, type) VALUES
    ('b2000000-0000-0000-0000-000000000002', 'w2000000-0000-0000-0000-000000000001', 'Rajesh Patel', 'friend', true, 'guardian');
UPDATE wills SET guardian_id = 'b2000000-0000-0000-0000-000000000002' WHERE id = 'w2000000-0000-0000-0000-000000000001';

-- Beneficiaries (two children)
INSERT INTO beneficiaries (id, will_id, full_name, relationship, type) VALUES
    ('b2000000-0000-0000-0000-000000000003', 'w2000000-0000-0000-0000-000000000001', 'Amit Kumar', 'son', 'beneficiary'),
    ('b2000000-0000-0000-0000-000000000004', 'w2000000-0000-0000-0000-000000000001', 'Neha Kumar', 'daughter', 'beneficiary');

-- Assets and shares
INSERT INTO assets (id, will_id, description, type, total_value) VALUES
    ('a2000000-0000-0000-0000-000000000001', 'w2000000-0000-0000-0000-000000000001', 'House in Pune', 'real_estate', 15000000.00),
    ('a2000000-0000-0000-0000-000000000002', 'w2000000-0000-0000-0000-000000000001', 'Savings Account #1234567890', 'bank_account', 2000000.00);

INSERT INTO asset_shares (asset_id, beneficiary_id, share_percentage) VALUES
    ('a2000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000003', 50.00),
    ('a2000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000004', 50.00),
    ('a2000000-0000-0000-0000-000000000002', 'b2000000-0000-0000-0000-000000000003', 100.00); -- whole savings to son

-- Witnesses (two distinct people, not beneficiaries)
INSERT INTO beneficiaries (id, will_id, full_name, relationship, is_witness, type) VALUES
    ('b2000000-0000-0000-0000-000000000005', 'w2000000-0000-0000-0000-000000000001', 'Anil Sharma', 'neighbour', true, 'witness'),
    ('b2000000-0000-0000-0000-000000000006', 'w2000000-0000-0000-0000-000000000001', 'Pooja Mehta', 'colleague', true, 'witness');