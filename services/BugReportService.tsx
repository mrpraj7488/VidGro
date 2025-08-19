import { supabase } from '../lib/supabase';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

export interface BugReport {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'System' | 'Mobile App Technical';
  issue_type?: string;
  device_info?: any;
  app_version?: string;
}

export interface BugReportResponse {
  bug_id: string;
  success: boolean;
  message: string;
  estimated_response_time: string;
}

export interface BugReportStatus {
  bug_id: string;
  status: 'new' | 'in_progress' | 'fixed';
  admin_notes?: string;
  resolution_notes?: string;
  updated_at: string;
}

class BugReportService {
  private getDeviceInfo() {
    return {
      platform: Platform.OS,
      version: Platform.Version,
      device: Device.deviceName || 'Unknown',
      model: Device.modelName || 'Unknown',
      os: Device.osName || 'Unknown',
      osVersion: Device.osVersion || 'Unknown',
      brand: Device.brand || 'Unknown',
      manufacturer: Device.manufacturer || 'Unknown'
    };
  }

  private getAppVersion() {
    return Constants.expoConfig?.version || 'Unknown';
  }

  private determinePriority(description: string, title: string): 'low' | 'medium' | 'high' | 'critical' {
    const criticalKeywords = ['crash', 'crashes', 'crashed', 'freeze', 'frozen', 'freezes', 'error', 'errors', 'failed', 'fails', 'failure', 'failures'];
    const highKeywords = ['slow', 'slower', 'slowly', 'lag', 'lags', 'laggy', 'unresponsive', 'not working', 'broken', 'break', 'breaks'];
    const mediumKeywords = ['issue', 'issues', 'problem', 'problems', 'bug', 'bugs', 'glitch', 'glitches'];
    
    const text = (description + ' ' + title).toLowerCase();
    
    if (criticalKeywords.some(keyword => text.includes(keyword))) {
      return 'critical';
    } else if (highKeywords.some(keyword => text.includes(keyword))) {
      return 'high';
    } else if (mediumKeywords.some(keyword => text.includes(keyword))) {
      return 'medium';
    }
    
    return 'low';
  }

  private determineCategory(description: string, title: string): 'System' | 'Mobile App Technical' {
    const systemKeywords = ['server', 'database', 'backend', 'api', 'network', 'connection', 'timeout', 'server error', 'database error'];
    const text = (description + ' ' + title).toLowerCase();
    
    if (systemKeywords.some(keyword => text.includes(keyword))) {
      return 'System';
    }
    
    return 'Mobile App Technical';
  }

  async submitBugReport(report: BugReport): Promise<BugReportResponse> {
    try {
      // Auto-determine priority and category if not provided
      const priority = report.priority || this.determinePriority(report.description, report.title);
      const category = report.category || this.determineCategory(report.description, report.title);
      
      // Get device and app information
      const deviceInfo = this.getDeviceInfo();
      const appVersion = this.getAppVersion();
      
      // Get current user if authenticated
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.rpc('insert_bug_report_from_mobile', {
        p_title: report.title,
        p_description: report.description,
        p_priority: priority,
        p_category: category,
        p_user_id: user?.id || null,
        p_user_email: user?.email || null,
        p_device_info: deviceInfo,
        p_app_version: appVersion,
        p_issue_type: report.issue_type || 'technical'
      });

      if (error) {
        console.error('Error submitting bug report:', error);
        throw new Error(error.message);
      }

      if (data && data.length > 0) {
        const result = data[0];
        
        // Store the bug report ID locally for status tracking
        this.storeBugReportLocally(result.bug_id, {
          title: report.title,
          description: report.description,
          priority,
          category,
          status: 'new',
          created_at: new Date().toISOString(),
          estimated_response_time: result.estimated_response_time
        });

        return {
          bug_id: result.bug_id,
          success: result.success,
          message: result.message,
          estimated_response_time: result.estimated_response_time
        };
      }

      throw new Error('Failed to submit bug report');
    } catch (error) {
      console.error('Error in submitBugReport:', error);
      throw error;
    }
  }

  async getBugReportStatus(bugId: string): Promise<BugReportStatus | null> {
    try {
      const { data, error } = await supabase
        .from('bug_reports')
        .select('bug_id, status, admin_notes, resolution_notes, updated_at')
        .eq('bug_id', bugId)
        .single();

      if (error) {
        console.error('Error fetching bug report status:', error);
        return null;
      }

      return {
        bug_id: data.bug_id,
        status: data.status,
        admin_notes: data.admin_notes,
        resolution_notes: data.resolution_notes,
        updated_at: data.updated_at
      };
    } catch (error) {
      console.error('Error in getBugReportStatus:', error);
      return null;
    }
  }

  async getUserBugReports(userId: string): Promise<BugReportStatus[]> {
    try {
      const { data, error } = await supabase
        .from('bug_reports')
        .select('bug_id, status, admin_notes, resolution_notes, updated_at, title, description')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user bug reports:', error);
        return [];
      }

      return data.map(report => ({
        bug_id: report.bug_id,
        status: report.status,
        admin_notes: report.admin_notes,
        resolution_notes: report.resolution_notes,
        updated_at: report.updated_at
      }));
    } catch (error) {
      console.error('Error in getUserBugReports:', error);
      return [];
    }
  }

  // Local storage methods for offline support
  private storeBugReportLocally(bugId: string, report: any) {
    try {
      const storedReports = this.getStoredBugReports();
      storedReports[bugId] = report;
      localStorage.setItem('mobile_bug_reports', JSON.stringify(storedReports));
    } catch (error) {
      console.error('Error storing bug report locally:', error);
    }
  }

  private getStoredBugReports(): Record<string, any> {
    try {
      const stored = localStorage.getItem('mobile_bug_reports');
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Error getting stored bug reports:', error);
      return {};
    }
  }

  getStoredBugReport(bugId: string): any {
    const storedReports = this.getStoredBugReports();
    return storedReports[bugId] || null;
  }

  // Get estimated response time based on priority
  getEstimatedResponseTime(priority: string): string {
    switch (priority) {
      case 'critical':
        return '1 hour';
      case 'high':
        return '2-4 hours';
      case 'medium':
        return '4-8 hours';
      case 'low':
        return '24 hours';
      default:
        return '4-8 hours';
    }
  }

  // Get status description for user display
  getStatusDescription(status: string): string {
    switch (status) {
      case 'new':
        return 'Your report has been received and is being reviewed by our team.';
      case 'in_progress':
        return 'Our team is actively working on resolving this issue.';
      case 'fixed':
        return 'This issue has been resolved. Please update your app if you haven\'t already.';
      default:
        return 'Status unknown.';
    }
  }

  // Get priority description for user display
  getPriorityDescription(priority: string): string {
    switch (priority) {
      case 'critical':
        return 'Critical issues are addressed within 1 hour.';
      case 'high':
        return 'High priority issues are addressed within 2-4 hours.';
      case 'medium':
        return 'Medium priority issues are addressed within 4-8 hours.';
      case 'low':
        return 'Low priority issues are addressed within 24 hours.';
      default:
        return 'Priority level unknown.';
    }
  }
}

export default new BugReportService();
