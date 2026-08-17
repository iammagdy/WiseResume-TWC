import { Permission, Role } from '@/lib/appwrite';

/** Owner-only document permissions for client-created WiseHire records. */
export function wisehireOwnerPermissions(userId: string): string[] {
  return [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
  ];
}
