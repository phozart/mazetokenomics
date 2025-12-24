-- Seed admin user (only if not exists)
-- Default password: ChangeMe123! (bcrypt hash with 12 rounds)
-- IMPORTANT: Change password immediately after first login!
INSERT INTO "User" (id, email, name, password, role, "isActive", "createdAt", "updatedAt")
VALUES (
  'admin_001',
  'admin',
  'Admin',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4Y3vjmHLb1q7iGPq',
  'ADMIN',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;
