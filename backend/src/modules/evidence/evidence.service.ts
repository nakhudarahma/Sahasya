import { CreateIncidentDto, IncidentRecord, TimelineEntry } from './evidence.interface';
import { supabase } from '../../config/supabase.config';

export class EvidenceService {
  // ── Create Incident ──────────────────────────────────────────────────────
  async createIncident(userId: string, data: CreateIncidentDto): Promise<IncidentRecord> {
    const summary = data.summary || data.description || '';

    // Insert incident
    const { data: incident, error } = await supabase
      .from('incidents')
      .insert({
        user_id: userId,
        type: data.type || 'SOS Triggered',
        location: data.location || 'Unknown',
        duration_seconds: data.durationSeconds || 0,
        summary,
      })
      .select()
      .single();

    if (error || !incident) {
      console.error('Incident Creation Error:', error);
      throw Object.assign(new Error(`Failed to create incident: ${error?.message || 'Unknown database error'}`), { statusCode: 500, details: error });
    }

    // Insert timeline entries
    const timelineEntries: TimelineEntry[] = [];
    if (data.timeline && data.timeline.length > 0) {
      const rows = data.timeline.map((t, i) => ({
        incident_id: incident.id,
        time: t.time,
        event: t.event,
        sort_order: i,
      }));

      const { data: tlData, error: tlError } = await supabase
        .from('incident_timeline')
        .insert(rows)
        .select();

      if (!tlError && tlData) {
        timelineEntries.push(...tlData.map((t: any) => ({ time: t.time, event: t.event })));
      }
    }

    return {
      id: incident.id,
      date: incident.created_at,
      type: incident.type,
      location: incident.location,
      durationSeconds: incident.duration_seconds,
      summary: incident.summary || '',
      timeline: timelineEntries,
    };
  }

  // ── List User Incidents ──────────────────────────────────────────────────
  async listUserIncidents(userId: string): Promise<IncidentRecord[]> {
    const { data: incidents, error } = await supabase
      .from('incidents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw Object.assign(new Error('Failed to fetch incidents'), { statusCode: 500, details: error });
    }

    if (!incidents || incidents.length === 0) return [];

    // Fetch all timeline entries for these incidents in one query
    const incidentIds = incidents.map((i: any) => i.id);
    const { data: timelines } = await supabase
      .from('incident_timeline')
      .select('*')
      .in('incident_id', incidentIds)
      .order('sort_order', { ascending: true });

    // Group timelines by incident_id
    const timelineMap = new Map<string, TimelineEntry[]>();
    (timelines || []).forEach((t: any) => {
      if (!timelineMap.has(t.incident_id)) timelineMap.set(t.incident_id, []);
      timelineMap.get(t.incident_id)!.push({ time: t.time, event: t.event });
    });

    return incidents.map((i: any) => ({
      id: i.id,
      date: i.created_at,
      type: i.type,
      location: i.location || 'Unknown',
      durationSeconds: i.duration_seconds || 0,
      summary: i.summary || '',
      timeline: timelineMap.get(i.id) || [],
    }));
  }

  // ── Get Incident By ID ───────────────────────────────────────────────────
  async getIncidentById(userId: string, incidentId: string): Promise<IncidentRecord> {
    const { data: incident, error } = await supabase
      .from('incidents')
      .select('*')
      .eq('id', incidentId)
      .eq('user_id', userId)
      .single();

    if (error || !incident) {
      throw Object.assign(new Error('Incident not found'), { statusCode: 404 });
    }

    const { data: timelines } = await supabase
      .from('incident_timeline')
      .select('*')
      .eq('incident_id', incidentId)
      .order('sort_order', { ascending: true });

    return {
      id: incident.id,
      date: incident.created_at,
      type: incident.type,
      location: incident.location || 'Unknown',
      durationSeconds: incident.duration_seconds || 0,
      summary: incident.summary || '',
      timeline: (timelines || []).map((t: any) => ({ time: t.time, event: t.event })),
    };
  }

  // ── Delete Incident ──────────────────────────────────────────────────────
  async deleteIncident(userId: string, incidentId: string): Promise<void> {
    // Timeline entries cascade-delete automatically via FK
    const { error } = await supabase
      .from('incidents')
      .delete()
      .eq('id', incidentId)
      .eq('user_id', userId);

    if (error) {
      throw Object.assign(new Error('Failed to delete incident'), { statusCode: 500, details: error });
    }
  }

  // ── Update Incident Timeline ───────────────────────────────────────────────
  async updateTimeline(userId: string, incidentId: string, timeline: TimelineEntry[], durationSeconds?: number) {
    // 1. Verify access
    const { data: incident, error: accessError } = await supabase
      .from('incidents')
      .select('id')
      .eq('id', incidentId)
      .eq('user_id', userId)
      .single();

    if (accessError || !incident) {
      throw Object.assign(new Error('Incident not found or access denied'), { statusCode: 403 });
    }

    // Update duration if provided
    if (durationSeconds !== undefined) {
      await supabase.from('incidents').update({ duration_seconds: durationSeconds }).eq('id', incidentId);
    }

    // 2. Clear existing entries
    await supabase.from('incident_timeline').delete().eq('incident_id', incidentId);

    // 3. Insert new entries
    if (timeline && timeline.length > 0) {
      const rows = timeline.map((t, i) => ({
        incident_id: incidentId,
        time: t.time,
        event: t.event,
        sort_order: i,
      }));

      const { data: tlData, error: tlError } = await supabase
        .from('incident_timeline')
        .insert(rows)
        .select();

      if (tlError) {
        throw Object.assign(new Error(`Failed to update timeline: ${tlError.message}`), { statusCode: 500 });
      }
      return tlData;
    }
    return [];
  }

  // ── Upload Evidence ────────────────────────────────────────────────────────
  async uploadSafeEvidence(userId: string, data: any, file: Express.Multer.File) {
    const incidentId = data.incidentId;
    if (!incidentId) throw Object.assign(new Error('Incident ID required'), { statusCode: 400 });

    // Verify incident belongs to user
    const { data: incident, error: accessError } = await supabase
      .from('incidents')
      .select('id')
      .eq('id', incidentId)
      .eq('user_id', userId)
      .single();

    if (accessError || !incident) {
      throw Object.assign(new Error('Incident not found or access denied'), { statusCode: 403 });
    }

    const fileExt = file.originalname.split('.').pop() || 'tmp';
    const filePath = `evidence/${userId}/${incidentId}/${Date.now()}.${fileExt}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('evidence')
      .upload(filePath, file.buffer, {
         contentType: file.mimetype,
         upsert: false
      });

    if (uploadError) {
      throw Object.assign(new Error('Failed to upload file to Supabase'), { statusCode: 500, details: uploadError });
    }

    const mediaType = file.mimetype.startsWith('image/') ? 'image' : 
                      file.mimetype.startsWith('video/') ? 'video' : 'audio';

    const { data: evidenceRow, error: dbError } = await supabase
      .from('evidence_files')
      .insert({
        user_id: userId,
        incident_id: incidentId,
        file_path: uploadData.path,
        media_type: mediaType,
        file_size: file.size,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Failed to insert evidence_files metadata:', dbError);
    }

    return {
      id: evidenceRow?.id || uploadData.path,
      incidentId: incidentId,
      url: uploadData.path,
      type: mediaType,
      uploadedAt: new Date().toISOString(),
      isEncrypted: true,
    };
  }

  // ── List Evidence for Incident ─────────────────────────────────────────────
  async getIncidentEvidence(userId: string, incidentId: string) {
    // 1. Check access
    const { data: incident, error: accessError } = await supabase
      .from('incidents')
      .select('id')
      .eq('id', incidentId)
      .eq('user_id', userId)
      .single();

    if (accessError || !incident) {
      throw Object.assign(new Error('Incident not found or access denied'), { statusCode: 403 });
    }

    // 2. Read from evidence_files table
    const { data: files, error: listError } = await supabase
      .from('evidence_files')
      .select('*')
      .eq('incident_id', incidentId)
      .eq('user_id', userId);

    if (listError || !files || files.length === 0) {
      return [];
    }

    // 3. Generate signed URLs for UI
    const filePaths = files.map(f => f.file_path);

    const { data: signedUrls, error: signError } = await supabase.storage
      .from('evidence')
      .createSignedUrls(filePaths, 3600); // 1 hour

    if (signError) {
       throw Object.assign(new Error('Signing failed'), { statusCode: 500 });
    }

    return signedUrls.map((s, idx) => ({
      id: files[idx].id,
      name: files[idx].file_path.split('/').pop(),
      signedUrl: s.signedUrl,
      mediaType: files[idx].media_type,
      size: files[idx].file_size,
      created_at: files[idx].created_at
    }));
  }
}
