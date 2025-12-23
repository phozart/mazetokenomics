-- Seed admin user (only if not exists)
INSERT INTO "User" (id, email, name, password, role, "isActive", "createdAt", "updatedAt")
VALUES (
  'admin_maze_001',
  'maze',
  'Admin',
  '$2b$12$EKqq/xH/zPVwhxtEXsC7k.yqsHzcpnKLMeug90zt/Rhuz7x3E4wzm',
  'ADMIN',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;
