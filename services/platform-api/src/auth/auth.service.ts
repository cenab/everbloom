import { Injectable, Logger } from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';
import { getSupabaseClient, DbUser, DbMagicLink, DbAuthSession } from '../utils/supabase';
import type {
  User,
  AuthSession,
  MagicLinkRequestResponse,
} from '../types';

/**
 * Production auth service using Supabase/Postgres.
 * Handles magic link authentication and session management.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly MAGIC_LINK_EXPIRY_MINUTES = 15;
  private readonly SESSION_EXPIRY_DAYS = 7;

  /**
   * Hash a token for secure storage using SHA-256
   */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generate a secure random token
   */
  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Convert database user to API user type
   */
  private dbUserToUser(dbUser: DbUser): User {
    return {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name || undefined,
      planTier: dbUser.plan_tier as 'free' | 'starter' | 'premium',
      stripeCustomerId: dbUser.stripe_customer_id || undefined,
      createdAt: dbUser.created_at,
    };
  }

  /**
   * Find or create a user by email
   */
  private async findOrCreateUser(email: string): Promise<User> {
    const supabase = getSupabaseClient();

    // Check if user exists
    const { data: existingUser, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (existingUser && !findError) {
      return this.dbUserToUser(existingUser as DbUser);
    }

    // Create new user
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        email,
        plan_tier: 'free',
      })
      .select()
      .single();

    if (createError || !newUser) {
      this.logger.error('Failed to create user', createError);
      throw new Error('Failed to create user');
    }

    return this.dbUserToUser(newUser as DbUser);
  }

  /**
   * Request a magic link for the given email.
   * In dev mode, logs the link to console.
   * In production, would send via SendGrid.
   */
  async requestMagicLink(email: string): Promise<MagicLinkRequestResponse> {
    const supabase = getSupabaseClient();
    const token = this.generateToken();
    const hashedToken = this.hashToken(token);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.MAGIC_LINK_EXPIRY_MINUTES);

    // Delete any existing magic links for this email
    await supabase
      .from('magic_links')
      .delete()
      .eq('email', email);

    // Store the magic link
    const { error } = await supabase
      .from('magic_links')
      .insert({
        email,
        token_hash: hashedToken,
        expires_at: expiresAt.toISOString(),
      });

    if (error) {
      this.logger.error('Failed to create magic link', error);
      throw new Error('Failed to create magic link');
    }

    // Build magic link URL
    const platformUrl = process.env.PLATFORM_URL || 'http://localhost:3000';
    const magicLinkUrl = `${platformUrl}/auth/verify?token=${token}`;

    // In dev mode, log the magic link to console
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n========================================');
      console.log('🔐 MAGIC LINK (dev mode)');
      console.log(`   Email: ${email}`);
      console.log(`   Link: ${magicLinkUrl}`);
      console.log(`   Expires: ${expiresAt.toISOString()}`);
      console.log('========================================\n');
    }

    // TODO: In production, send email via SendGrid
    // await this.sendMagicLinkEmail(email, magicLinkUrl);

    return {
      message: 'If an account exists for this email, a magic link has been sent.',
    };
  }

  /**
   * Verify a magic link token and create a session.
   * Returns null if token is invalid or expired.
   */
  async verifyMagicLink(token: string): Promise<AuthSession | null> {
    const supabase = getSupabaseClient();
    const hashedToken = this.hashToken(token);

    // Find the magic link
    const { data: magicLink, error: findError } = await supabase
      .from('magic_links')
      .select('*')
      .eq('token_hash', hashedToken)
      .is('used_at', null)
      .single();

    if (findError || !magicLink) {
      this.logger.warn('Magic link not found or already used');
      return null;
    }

    const dbMagicLink = magicLink as DbMagicLink;

    // Check expiry
    if (new Date() > new Date(dbMagicLink.expires_at)) {
      this.logger.warn('Magic link expired');
      // Delete expired link
      await supabase.from('magic_links').delete().eq('id', dbMagicLink.id);
      return null;
    }

    // Mark magic link as used
    await supabase
      .from('magic_links')
      .update({ used_at: new Date().toISOString() })
      .eq('id', dbMagicLink.id);

    // Find or create the user
    const user = await this.findOrCreateUser(dbMagicLink.email);

    // Create session
    const sessionToken = this.generateToken();
    const sessionHashedToken = this.hashToken(sessionToken);
    const sessionExpiresAt = new Date();
    sessionExpiresAt.setDate(sessionExpiresAt.getDate() + this.SESSION_EXPIRY_DAYS);

    const { error: sessionError } = await supabase
      .from('auth_sessions')
      .insert({
        user_id: user.id,
        token_hash: sessionHashedToken,
        expires_at: sessionExpiresAt.toISOString(),
      });

    if (sessionError) {
      this.logger.error('Failed to create session', sessionError);
      throw new Error('Failed to create session');
    }

    return {
      user,
      token: sessionToken,
      expiresAt: sessionExpiresAt.toISOString(),
    };
  }

  /**
   * Validate a session token and return the user.
   * Returns null if session is invalid or expired.
   */
  async validateSession(token: string): Promise<User | null> {
    const supabase = getSupabaseClient();
    const hashedToken = this.hashToken(token);

    // Find the session
    const { data: session, error: findError } = await supabase
      .from('auth_sessions')
      .select('*')
      .eq('token_hash', hashedToken)
      .single();

    if (findError || !session) {
      return null;
    }

    const dbSession = session as DbAuthSession;

    // Check expiry
    if (new Date() > new Date(dbSession.expires_at)) {
      // Delete expired session
      await supabase.from('auth_sessions').delete().eq('id', dbSession.id);
      return null;
    }

    // Get the user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', dbSession.user_id)
      .single();

    if (userError || !user) {
      return null;
    }

    return this.dbUserToUser(user as DbUser);
  }

  /**
   * Invalidate a session (logout)
   */
  async logout(token: string): Promise<void> {
    const supabase = getSupabaseClient();
    const hashedToken = this.hashToken(token);

    await supabase
      .from('auth_sessions')
      .delete()
      .eq('token_hash', hashedToken);
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    const supabase = getSupabaseClient();

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return null;
    }

    return this.dbUserToUser(user as DbUser);
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    const supabase = getSupabaseClient();

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return null;
    }

    return this.dbUserToUser(user as DbUser);
  }

  /**
   * Update user's Stripe customer ID
   */
  async updateStripeCustomerId(userId: string, stripeCustomerId: string): Promise<void> {
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('users')
      .update({ stripe_customer_id: stripeCustomerId })
      .eq('id', userId);

    if (error) {
      this.logger.error('Failed to update Stripe customer ID', error);
      throw new Error('Failed to update Stripe customer ID');
    }
  }

  /**
   * Update user's plan tier
   */
  async updatePlanTier(userId: string, planTier: 'free' | 'starter' | 'premium'): Promise<void> {
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('users')
      .update({ plan_tier: planTier })
      .eq('id', userId);

    if (error) {
      this.logger.error('Failed to update plan tier', error);
      throw new Error('Failed to update plan tier');
    }
  }
}
