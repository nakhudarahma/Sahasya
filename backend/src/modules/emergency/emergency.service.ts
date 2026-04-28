import { TriggerPanicDto, StartTrackingDto, PanicResponse, TrackingResponse } from './emergency.interface';
import { supabase } from '../../config/supabase.config';
import { env } from '../../config/env.config';
import { TelegramService } from '../../common/services/telegram.service';
import { normalizePhone } from '../../common/utils/phone';
import crypto from 'crypto';

export class EmergencyService {
  async triggerPanic(userId: string, data: TriggerPanicDto): Promise<PanicResponse> {
    const rawLocation = data.locationLabel || 'Unknown Location';

    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true });
    const dateStr = now.toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' });
    const timestamp = `${timeStr}, ${dateStr}`;
    
    const hasLocation = rawLocation !== 'Detecting...' && rawLocation !== 'Unknown Location';
    const formattedTitle = hasLocation 
      ? `${dateStr}, ${timeStr} - ${rawLocation}`
      : `${dateStr}, ${timeStr}`;

    const isUpdate = (data as any).isUpdate === true;

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, telegram_chat_id, phone, personal_info')
      .eq('id', userId)
      .maybeSingle();
    
    const userName = profile?.full_name || 'A SAHASYA User';
    const personalMobile = profile?.personal_info?.mobileNumber;
    const userPhone = personalMobile || profile?.phone || 'N/A';
    const telegramChatId = profile?.telegram_chat_id;

    let incidentId = (data as any).incidentId;
    let trackingUrl = null;
    let session = null;

    if (!isUpdate) {
      const shareCode = crypto.randomBytes(4).toString('hex');
      trackingUrl = `${env.FRONTEND_URL}/#track/${shareCode}`;

      const { data: s } = await supabase
        .from('tracking_sessions')
        .insert({ user_id: userId, destination: 'SOS EMERGENCY', share_link: trackingUrl, is_active: true })
        .select().single();
      session = s;

      const { data: incident, error } = await supabase
        .from('incidents')
        .insert({
          user_id: userId,
          type: 'SOS Triggered',
          location: formattedTitle,
          duration_seconds: 0,
          summary: `SOS panic alert triggered. ${hasLocation ? `Location: ${rawLocation}. ` : ''}Emergency contacts alerted.`,
        })
        .select().single();

      if (error || !incident) {
        throw Object.assign(new Error(`Failed to create SOS incident: ${error?.message}`), { statusCode: 500 });
      }
      incidentId = incident.id;

      await supabase.from('incident_timeline').insert({
        incident_id: incidentId,
        time: '00:00',
        event: 'SOS Triggered',
        sort_order: 0,
      });
    }

    const { data: contacts } = await supabase
      .from('emergency_contacts')
      .select('name, phone, telegram_chat_id')
      .eq('user_id', userId);

    const contactList = contacts || [];
    let contactsNotified = 0;
    const deliveryLog: Array<{ contact: string; telegram: string }> = [];

    const telegramBody = isUpdate ?
      `<b>📍 LOCATION REFINED</b>\n\n` +
      `<b>${userName}'s</b> precise location has been captured:\n\n` +
      (hasLocation ? `📍 <b>Pinpoint:</b> ${rawLocation}\n` : '') +
      `🕒 ${timestamp}` :
      `<b>🚨 SAHASYA SOS ALERT</b>\n\n` +
      `<b>${userName}</b> might be in danger and needs help. Please call immediately.\n\n` +
      (userPhone && userPhone !== 'N/A' ? `📞 ${userPhone}\n` : '') +
      (hasLocation ? `📍 <b>Last Seized:</b> ${rawLocation}\n` : '') +
      `🕒 ${timestamp}`;

    // ── SEARCH FOR PERMANENT TELEGRAM LINKS (Optimized Filter) ──
    const phoneNumbers = contactList.map(c => normalizePhone(c.phone)).filter(Boolean);
    const telegramMap = new Map<string, string>();
    
    if (phoneNumbers.length > 0) {
      const { data: permanentLinks } = await supabase
        .from('telegram_links')
        .select('phone_number, telegram_chat_id')
        .in('phone_number', phoneNumbers);
      
      (permanentLinks || []).forEach(link => {
        telegramMap.set(link.phone_number, link.telegram_chat_id);
      });
    }

    console.log(`🚨 SOS BROADCAST — ${contactList.length} contacts`);
    await supabase.from('system_logs').insert({ type: 'SOS_START', message: `SOS TRIGGERED BY ${userName.toUpperCase()}` });

    // ── PARALLEL DISPATCH ──
    const dispatchPromises = contactList.map(async (contact) => {
      const chatId = contact.telegram_chat_id || telegramMap.get(normalizePhone(contact.phone));

      if (chatId) {
        const tgResult = await TelegramService.sendMessage(chatId, telegramBody);
        if (tgResult.success) {
          try {
            await supabase.from('system_logs').insert({ 
              type: 'SOS_DISPATCH', 
              message: `${contact.name} (${contact.phone}) -> ✅ DELIVERED` 
            });
          } catch (e) {}
          return true;
        } else {
          try {
            await supabase.from('system_logs').insert({ 
              type: 'SOS_DISPATCH', 
              message: `${contact.name} -> ❌ FAILED: ${tgResult.detail}` 
            });
          } catch (e) {}
          return false;
        }
      } else {
        try {
          await supabase.from('system_logs').insert({ 
            type: 'SOS_DISPATCH', 
            message: `${contact.name} -> ⚠️ SKIPPED: No Telegram Link` 
          });
        } catch (e) {}
        return false;
      }
    });

    // Add self-alert to parallel dispatch if available
    if (telegramChatId) {
      dispatchPromises.push((async () => {
        const res = await TelegramService.sendMessage(telegramChatId, telegramBody);
        if (res.success) {
          try {
            await supabase.from('system_logs').insert({ 
              type: 'SOS_DISPATCH', 
              message: `Self-Alert: ${userName} -> ✅ SENT` 
            });
          } catch (e) {}
        }
        return res.success;
      })());
    }

    const results = await Promise.all(dispatchPromises);
    contactsNotified = results.filter(Boolean).length;

    console.log(`📊 SUMMARY: ${contactsNotified}/${contactList.length} Reached\n${'─'.repeat(60)}`);
    await supabase.from('system_logs').insert({ type: 'SOS_END', message: `${contactsNotified}/${contactList.length} Contacts Successfully Alerted` });

    return {
      incidentId: incidentId,
      trackId: session?.id,
      status: contactsNotified > 0 ? 'ALERT_DELIVERED' : 'ALERT_SENT_PARTIAL',
      contactsNotified,
      trackingUrl: trackingUrl || undefined,
    };
  }

  async startLiveTracking(userId: string, data: StartTrackingDto): Promise<TrackingResponse> {
    const shareCode = crypto.randomBytes(4).toString('hex');
    const shareLink = `${env.FRONTEND_URL}/#track/${shareCode}`;
    const { data: session } = await supabase.from('tracking_sessions').insert({ user_id: userId, destination: data.destination || 'Unknown', share_link: shareLink, is_active: true }).select().single();
    return { trackId: session?.id, shareLink: session?.share_link, isActive: true };
  }

  async stopTracking(userId: string, trackId: string): Promise<void> {
    await supabase.from('tracking_sessions').update({ is_active: false, ended_at: new Date().toISOString() }).eq('id', trackId).eq('user_id', userId);
  }

  async updateLocation(userId: string, lat: number, lng: number): Promise<void> {
    await supabase.from('profiles').update({ last_location: { lat, lng }, location_updated_at: new Date().toISOString() }).eq('id', userId);
  }

  async triggerFakeCall() {
    return { status: 'CALL_INITIATED' };
  }
}
