import { RegisterUserDto, LoginUserDto, UpdateProfileDto, EmergencyContactDto, AuthResponse } from './auth.interface';
import { supabase } from '../../config/supabase.config';
import { normalizePhone } from '../../common/utils/phone';

export class AuthService {
  // ── Register ─────────────────────────────────────────────────────────────
  async registerUser(data: RegisterUserDto): Promise<AuthResponse> {
    // 1. Create auth user in Supabase
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });

    if (authError || !authData.user) {
      throw Object.assign(new Error(authError?.message || 'Registration failed'), { statusCode: 400 });
    }

    // Supabase returns a fake user (identities: []) if the email already exists
    if (authData.user.identities && authData.user.identities.length === 0) {
      throw Object.assign(new Error('User with this email already exists. Please log in instead.'), { statusCode: 400 });
    }

    const userId = authData.user.id;

    // 2. Compute initials
    const initials = data.fullName
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    // 3. Create or Update profile row (upsert is safer if auth succeeded but profile failed before)
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({ 
        id: userId, 
        full_name: data.fullName.trim(), 
        phone: data.phone || null,
        initials 
      }, { onConflict: 'id' });

    if (profileError) {
      console.error('Critical Profile Insert Error:', profileError);
      // Clean up the auth user if profile creation fails? 
      // For now, at least throw so the UI knows it failed.
      throw Object.assign(new Error(`Account created but profile setup failed: ${profileError.message}`), { 
        statusCode: 500, 
        details: profileError 
      });
    }

    // 4. Insert emergency contacts (if any)
    const contacts: EmergencyContactDto[] = [];
    if (data.emergencyContacts && data.emergencyContacts.length > 0) {
      const validContacts = data.emergencyContacts.filter((c) => c.name.trim());
      if (validContacts.length > 0) {
        const rows = validContacts.map((c) => ({
          user_id: userId,
          name: c.name.trim(),
          phone: c.phone.trim(),
        }));

        const { data: insertedContacts, error: contactsError } = await supabase
          .from('emergency_contacts')
          .insert(rows)
          .select();

        if (contactsError) {
          console.error('Emergency contacts insert error:', contactsError);
        } else if (insertedContacts) {
          contacts.push(...insertedContacts.map((c: any) => ({ id: c.id, name: c.name, phone: c.phone })));
        }
      }
    }

    return {
      user: {
        id: userId,
        email: data.email,
        name: data.fullName.trim(),
        initials,
        phone: data.phone || null,
        onboardingCompleted: false,
        personalInfo: {},
        locationSharing: true,
        riskAlerts: true,
        sosNotifications: true,
        saveHistory: true,
      },
      session: authData.session
        ? { access_token: authData.session.access_token, refresh_token: authData.session.refresh_token }
        : null,
      emergencyContacts: contacts,
    };
  }

  // ── Login ────────────────────────────────────────────────────────────────
  async loginUser(data: LoginUserDto): Promise<AuthResponse> {
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error || !authData.user) {
      throw Object.assign(new Error(error?.message || 'Invalid email or password'), { statusCode: 401 });
    }

    const userId = authData.user.id;
    
    const [profileResult, contactsResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('full_name, initials, phone, onboarding_completed, personal_info, location_sharing, risk_alerts, sos_notifications, save_history, telegram_chat_id')
        .eq('id', userId)
        .maybeSingle(),
      supabase
        .from('emergency_contacts')
        .select('id, name, phone, telegram_chat_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
    ]);

    const { data: profile } = profileResult;
    const { data: contacts } = contactsResult;

    const res: AuthResponse = {
      user: {
        id: userId,
        email: data.email,
        name: profile?.full_name || authData.user.email || '',
        initials: profile?.initials || '',
        phone: profile?.phone || null,
        onboardingCompleted: profile?.onboarding_completed || false,
        personalInfo: profile?.personal_info || {},
        locationSharing: profile?.location_sharing ?? false,
        riskAlerts: profile?.risk_alerts ?? true,
        sosNotifications: profile?.sos_notifications ?? true,
        saveHistory: profile?.save_history ?? true,
        telegram_chat_id: profile?.telegram_chat_id || null,
        stats: {
          reportsCount: (await supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('user_id', userId)).count || 0
        }
      },
      session: {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
      },
      emergencyContacts: await this.enrichWithTelegramLinks(userId, (contacts || []).map((c: any) => ({ id: c.id, name: c.name, phone: c.phone, telegram_chat_id: c.telegram_chat_id }))),
    };

    const enrichedUser = await this.enrichWithTelegramLinks(userId, [res.user]);
    res.user = enrichedUser[0];
    return res;
  }

  // ── Verify Password (for Vault/Profile re-auth) ───────────────────────────
  async verifyPassword(email: string, password: string): Promise<boolean> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      return false;
    }

    return true;
  }

  // ── Logout ───────────────────────────────────────────────────────────────
  async logoutUser(token: string): Promise<void> {
    // Basic sign out
    await supabase.auth.signOut();
  }

  // ── Refresh Token ────────────────────────────────────────────────────────
  async refreshToken(refreshToken: string) {
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data.session) {
      throw Object.assign(new Error(error?.message || 'Refresh failed'), { statusCode: 401 });
    }
    return {
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      }
    };
  }

  // ── Get Profile ──────────────────────────────────────────────────────────
  async getProfile(userId: string) {
    const [profileResult, authResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, initials, phone, onboarding_completed, personal_info, location_sharing, risk_alerts, sos_notifications, save_history, created_at, telegram_chat_id')
        .eq('id', userId)
        .maybeSingle(),
      supabase.auth.admin.getUserById(userId)
    ]);

    const { data: profile, error } = profileResult;
    const { data: authUser } = authResult;

    if (error || !profile) {
      throw Object.assign(new Error('Profile not found'), { statusCode: 404 });
    }

    const profileData = {
      id: profile.id,
      name: profile.full_name,
      email: authUser?.user?.email || '',
      phone: profile.phone || '',
      initials: profile.initials,
      onboardingCompleted: profile.onboarding_completed,
      personalInfo: profile.personal_info,
      locationSharing: profile.location_sharing ?? false,
      riskAlerts: profile.risk_alerts ?? true,
      sosNotifications: profile.sos_notifications ?? true,
      saveHistory: profile.save_history ?? true,
      createdAt: profile.created_at,
      telegram_chat_id: profile.telegram_chat_id || null,
    };

    const enriched = await this.enrichWithTelegramLinks(userId, [profileData]);
    return enriched[0];
  }

  /**
   * Helper to fetch the full AuthResponse structure
   */
  private async fetchAuthResponse(userId: string): Promise<AuthResponse> {
    const { data: userRaw } = await supabase.auth.admin.getUserById(userId);
    if (!userRaw?.user) throw new Error('Auth user not found');

    const [profileResult, contactsResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle(),
      supabase
        .from('emergency_contacts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
    ]);

    const profile = profileResult.data;
    const contacts = contactsResult.data || [];

    const userObj = {
      id: userId,
      email: userRaw.user.email || '',
      name: profile?.full_name || userRaw.user.email || '',
      initials: profile?.initials || '',
      phone: profile?.phone || null,
      onboardingCompleted: profile?.onboarding_completed || false,
      personalInfo: profile?.personal_info || {},
      locationSharing: profile?.location_sharing ?? false,
      riskAlerts: profile?.risk_alerts ?? true,
      sosNotifications: profile?.sos_notifications ?? true,
      saveHistory: profile?.save_history ?? true,
      telegram_chat_id: profile?.telegram_chat_id || null,
      stats: {
        reportsCount: (await supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('user_id', userId)).count || 0
      }
    };

    const enrichedUser = await this.enrichWithTelegramLinks(userId, [userObj]);

    return {
      user: enrichedUser[0],
      session: null, // Session tokens not needed for simple profile update refresh
      emergencyContacts: await this.enrichWithTelegramLinks(userId, contacts.map((c: any) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        telegram_chat_id: c.telegram_chat_id
      })))
    };
  }

  // ── Update Profile ───────────────────────────────────────────────────────
  async updateProfile(userId: string, data: any) {
    const updates: any = {};
    
    if (data.fullName) {
      updates.full_name = data.fullName.trim();
      updates.initials = updates.full_name
        .split(/\s+/)
        .map((w: string) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    
    if (data.phone !== undefined) updates.phone = data.phone;
    if (data.onboardingCompleted !== undefined) updates.onboarding_completed = data.onboardingCompleted;
    if (data.personalInfo !== undefined) {
      // Fetch existing profile to merge personal_info
      const { data: existing } = await supabase
        .from('profiles')
        .select('personal_info')
        .eq('id', userId)
        .single();
      
      updates.personal_info = {
        ...(existing?.personal_info || {}),
        ...data.personalInfo
      };
    }
    if (data.locationSharing !== undefined) updates.location_sharing = data.locationSharing;
    if (data.riskAlerts !== undefined) updates.risk_alerts = data.riskAlerts;
    if (data.sosNotifications !== undefined) updates.sos_notifications = data.sosNotifications;
    if (data.saveHistory !== undefined) updates.save_history = data.saveHistory;

    // Use update to modify the existing profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (updateError) {
      console.error('Profile Update/Upsert Error:', updateError);
      throw Object.assign(new Error('Failed to save profile details'), { statusCode: 500, details: updateError });
    }

    // Return the full updated profile correctly formatted for the frontend
    return this.fetchAuthResponse(userId);
  }

  // ── Get Emergency Contacts ───────────────────────────────────────────────
  async getContacts(userId: string) {
    const { data, error } = await supabase
      .from('emergency_contacts')
      .select('id, name, phone, telegram_chat_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      throw Object.assign(new Error('Failed to fetch contacts'), { statusCode: 500, details: error });
    }

    const formatted = (data || []).map((c: any) => ({ 
      id: c.id, 
      name: c.name, 
      phone: c.phone, 
      telegram_chat_id: c.telegram_chat_id 
    }));
    return this.enrichWithTelegramLinks(userId, formatted);
  }

  // ── Helper: Enrich Contacts with Permanent Telegram Links ────────────────
  private async enrichWithTelegramLinks(userId: string, contacts: any[]) {
    if (contacts.length === 0) return [];

    // Fetch permanent links to catch contacts who linked before being added to this user's list
    const { data: permanentLinks } = await supabase.from('telegram_links').select('phone_number, telegram_chat_id');
    const linkMap = new Map();
    (permanentLinks || []).forEach(l => linkMap.set(l.phone_number, l.telegram_chat_id));

    return contacts.map(c => ({
      ...c,
      telegram_chat_id: c.telegram_chat_id || linkMap.get(normalizePhone(c.phone)) || null
    }));
  }

  // ── Update Emergency Contacts (replace all) ──────────────────────────────
  async updateContacts(userId: string, contacts: EmergencyContactDto[]) {
    // Delete existing contacts
    const { error: deleteError } = await supabase
      .from('emergency_contacts')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      throw Object.assign(new Error('Failed to update contacts'), { statusCode: 500, details: deleteError });
    }

    // Insert new ones
    const validContacts = contacts.filter((c) => c.name && c.name.trim());
    if (validContacts.length > 0) {
      const rows = validContacts.map((c) => ({
        user_id: userId,
        name: c.name.trim(),
        phone: (c.phone || '').trim(),
      }));

      const { data, error: insertError } = await supabase
        .from('emergency_contacts')
        .insert(rows)
        .select();

      if (insertError) {
        throw Object.assign(new Error('Failed to insert contacts'), { statusCode: 500, details: insertError });
      }

      const formatted = (data || []).map((c: any) => ({ id: c.id, name: c.name, phone: c.phone, telegram_chat_id: c.telegram_chat_id }));
      return this.enrichWithTelegramLinks(userId, formatted);
    }

    return [];
  }
}
