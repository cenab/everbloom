import { Injectable, Logger } from '@nestjs/common';
import { getSupabaseClient } from '../utils/supabase';

/**
 * Admin role levels
 */
export type AdminRole = 'owner' | 'admin' | 'readonly';

/**
 * Admin record from the database
 */
export interface Admin {
  sub: string;
  email: string;
  role: AdminRole;
  disabledAt: string | null;
  createdAt: string;
}

/**
 * Authorization error reasons for logging
 */
export type AdminAuthErrorReason =
  | 'admin_not_found'
  | 'admin_disabled'
  | 'admin_insufficient_role';

/**
 * Result of admin authorization check
 */
export type AdminAuthResult =
  | { authorized: true; admin: Admin }
  | { authorized: false; reason: AdminAuthErrorReason; message: string };

/**
 * Service for admin authorization
 *
 * Checks the admins table to determine if a user (by sub) is authorized
 * to perform admin operations.
 *
 * Admin bootstrap: Insert admin record manually with the user's Supabase sub
 * after their first login. Get the sub from the JWT claims.
 */
@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  // Cache admins for 5 minutes to reduce DB queries
  private adminCache: Map<string, { admin: Admin; cachedAt: number }> = new Map();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Check if a user is an authorized admin
   *
   * @param sub - The user's Supabase Auth subject ID
   * @param requiredRole - Minimum role required (optional)
   * @returns Authorization result
   */
  async checkAdmin(
    sub: string,
    requiredRole?: AdminRole,
  ): Promise<AdminAuthResult> {
    // Check cache first
    const cached = this.adminCache.get(sub);
    if (cached && Date.now() - cached.cachedAt < this.CACHE_TTL_MS) {
      return this.validateAdmin(cached.admin, requiredRole);
    }

    const supabase = getSupabaseClient();

    // Fetch admin by sub (the Supabase Auth user ID)
    const { data, error } = await supabase
      .from('admins')
      .select('sub, email, role, disabled_at, created_at')
      .eq('sub', sub)
      .single();

    if (error || !data) {
      this.logger.warn(`Admin not found for sub: ${sub}`);
      return {
        authorized: false,
        reason: 'admin_not_found',
        message: 'User is not an admin',
      };
    }

    const admin: Admin = {
      sub: data.sub,
      email: data.email,
      role: data.role as AdminRole,
      disabledAt: data.disabled_at,
      createdAt: data.created_at,
    };

    // Cache the result
    this.adminCache.set(sub, { admin, cachedAt: Date.now() });

    return this.validateAdmin(admin, requiredRole);
  }

  /**
   * Validate an admin record
   */
  private validateAdmin(admin: Admin, requiredRole?: AdminRole): AdminAuthResult {
    // Check if admin is disabled
    if (admin.disabledAt) {
      this.logger.warn(`Admin disabled: ${admin.sub}`);
      return {
        authorized: false,
        reason: 'admin_disabled',
        message: 'Admin account is disabled',
      };
    }

    // Check role if required
    if (requiredRole && !this.hasRequiredRole(admin.role, requiredRole)) {
      this.logger.warn(`Admin insufficient role: ${admin.sub} has ${admin.role}, needs ${requiredRole}`);
      return {
        authorized: false,
        reason: 'admin_insufficient_role',
        message: `Requires ${requiredRole} role`,
      };
    }

    return { authorized: true, admin };
  }

  /**
   * Check if a role meets the required level
   * Role hierarchy: owner > admin > readonly
   */
  private hasRequiredRole(userRole: AdminRole, requiredRole: AdminRole): boolean {
    const roleHierarchy: Record<AdminRole, number> = {
      owner: 3,
      admin: 2,
      readonly: 1,
    };

    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
  }

  /**
   * Clear the admin cache (useful for testing or after role changes)
   */
  clearCache(): void {
    this.adminCache.clear();
  }

  /**
   * Remove a specific admin from cache (after role update)
   */
  invalidateCache(sub: string): void {
    this.adminCache.delete(sub);
  }
}
