import { CreateReportDto, ReportRecord } from './reporting.interface';
import { supabase } from '../../config/supabase.config';

export class ReportingService {
  // ── Submit Report ────────────────────────────────────────────────────────
  async submitReport(userId: string | null, data: CreateReportDto): Promise<ReportRecord> {
    // Handle frontend 'anonymous' or 'isAnonymous' naming
    const isAnon = data.anonymous ?? data.isAnonymous ?? true;

    console.log(`🚀 Attempting Report Insert for User: ${userId}`, { isAnon, type: data.type });

    const { data: report, error: reportError } = await supabase
      .from('reports')
      .insert({
        user_id: isAnon ? null : userId,
        is_anonymous: isAnon,
        type: data.type,
        category: data.category || null,
        description: data.description || 'No description',
        location: data.location || 'Not specified',
        escalation: data.escalation || 'store',
        evidence_id: data.evidenceId || null,
        status: 'PENDING',
      })
      .select()
      .single();

    if (reportError) {
      console.error('❌ Supabase [reports] Insert Error:', reportError);
      throw new Error(`DB Error: ${reportError.message}`);
    }

    if (!report) {
      console.error('❌ No report returned after insert');
      throw new Error('Failed to create report record');
    }

    console.log('✅ Report Created Successfully:', report.id);

    // Insert timeline entries if provided
    if (data.timeline && data.timeline.length > 0) {
      const timelineEntries = data.timeline.map((entry, index) => ({
        report_id: report.id,
        time: entry.time,
        event: entry.event,
        sort_order: index
      }));

      const { error: timelineError } = await supabase
        .from('report_timeline')
        .insert(timelineEntries);

      if (timelineError) {
        console.error('⚠️ Supabase [report_timeline] Insert Error:', timelineError);
      }
    }

    return {
      id: report.id,
      type: report.type,
      category: report.category,
      description: report.description,
      location: report.location || 'Not specified',
      isAnonymous: report.is_anonymous,
      escalation: report.escalation,
      evidenceId: report.evidence_id,
      status: report.status,
      date: report.created_at,
    };
  }

  // ── List User Reports ────────────────────────────────────────────────────
  async getMyReports(userId: string): Promise<ReportRecord[]> {
    const { data: reports, error } = await supabase
      .from('reports')
      .select('*')
      .or(`user_id.eq.${userId},is_anonymous.eq.true`)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('❌ getMyReports Error:', error);
      throw Object.assign(new Error('Failed to fetch reports'), { statusCode: 500, details: error });
    }

    const results = (reports || []).map((r: any) => ({
      id: r.id,
      type: r.type,
      category: r.category,
      description: r.description,
      location: r.location || 'Not specified',
      isAnonymous: r.is_anonymous,
      escalation: r.escalation,
      evidenceId: r.evidence_id,
      status: r.status,
      date: r.created_at,
    }));

    return results;
  }

  // ── Delete Report ────────────────────────────────────────────────────────
  async deleteReport(userId: string, reportId: string): Promise<void> {
    // Determine if it belongs to user OR is an orphan/anonymous report
    const { error } = await supabase
      .from('reports')
      .delete()
      .eq('id', reportId)
      .or(`user_id.eq.${userId},user_id.is.null`);

    if (error) {
      throw Object.assign(new Error('Failed to delete report'), { statusCode: 500, details: error });
    }
  }
}
