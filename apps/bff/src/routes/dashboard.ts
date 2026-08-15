import { Router, Request, Response } from 'express';
import { DashboardData, DashboardRequest } from '@saas/shared-types';

const router = Router();

type HomeVariant = DashboardData['variant'];

function resolveHomeVariant(roleNames: string[] | undefined): HomeVariant {
  const normalizedRoles = new Set((roleNames ?? []).map((role) => role.toLowerCase()));

  if (normalizedRoles.has('admin')) {
    return 'admin';
  }

  if (normalizedRoles.has('sales')) {
    return 'sales';
  }

  if (normalizedRoles.has('crm')) {
    return 'crm';
  }

  if (normalizedRoles.has('marketing')) {
    return 'marketing';
  }

  return 'general';
}

function buildDashboard(variant: HomeVariant, name: string): DashboardData {
  const dashboards: Record<HomeVariant, DashboardData> = {
    admin: {
      variant: 'admin',
      welcomeMessage: `Welcome back, ${name}!`,
      summaryMessage: 'Here is a quick snapshot of your business performance.',
      kpiCards: [
        { label: 'Total Revenue', value: '$328,420', delta: '+12.4%', trend: 'up' },
        { label: 'Active Users', value: '24,981', delta: '+8.2%', trend: 'up' },
        { label: 'Conversion Rate', value: '5.62%', delta: '-0.6%', trend: 'down' },
        { label: 'Avg. Order Value', value: '$57.18', delta: '+3.1%', trend: 'up' },
      ],
      revenueSeries: [65, 52, 78, 83, 70, 91, 88, 72, 95, 86, 99, 92],
      revenueSummary: {
        value: '$328.4k',
        delta: '-7.0% from last month',
        details: [
          { label: 'Pipeline', value: '$412k' },
          { label: 'Target', value: '92%' },
          { label: 'Forecast', value: 'Strong', tone: 'accent' },
        ],
      },
      channelBreakdown: [
        { label: 'Organic Search', value: 38 },
        { label: 'Paid Ads', value: 27 },
        { label: 'Direct', value: 19 },
        { label: 'Referral', value: 16 },
      ],
      topCampaigns: [
        { name: 'Spring Promo', spend: '$8,240', roas: '4.9x' },
        { name: 'Retargeting Q1', spend: '$5,120', roas: '4.1x' },
        { name: 'New Users Push', spend: '$3,880', roas: '3.7x' },
        { name: 'Brand Lift', spend: '$2,640', roas: '3.2x' },
      ],
    },
    sales: {
      variant: 'sales',
      welcomeMessage: `Sales cockpit, ${name}`,
      summaryMessage: 'Pipeline movement, quota coverage, and high-value opportunities for the current cycle.',
      kpiCards: [
        { label: 'Open Pipeline', value: '$842,000', delta: '+9.8%', trend: 'up' },
        { label: 'Qualified Leads', value: '186', delta: '+14.2%', trend: 'up' },
        { label: 'Win Rate', value: '31.4%', delta: '+2.1%', trend: 'up' },
        { label: 'At-Risk Deals', value: '12', delta: '-4.0%', trend: 'up' },
      ],
      revenueSeries: [48, 54, 57, 66, 72, 74, 83, 88, 91, 97, 104, 112],
      revenueSummary: {
        value: '$842k',
        delta: '+8.0% pipeline growth',
        details: [
          { label: 'Quota coverage', value: '118%' },
          { label: 'Avg. deal age', value: '22 days' },
          { label: 'Next best action', value: 'Follow up', tone: 'accent' },
        ],
      },
      channelBreakdown: [
        { label: 'Enterprise', value: 42 },
        { label: 'Mid-market', value: 31 },
        { label: 'SMB', value: 18 },
        { label: 'Partners', value: 9 },
      ],
      topCampaigns: [
        { name: 'North Region Renewal', spend: '$214k', roas: '92%' },
        { name: 'Enterprise Expansion', spend: '$188k', roas: '81%' },
        { name: 'Partner Sourced Deals', spend: '$96k', roas: '74%' },
        { name: 'Dormant Account Revival', spend: '$62k', roas: '58%' },
      ],
    },
    crm: {
      variant: 'crm',
      welcomeMessage: `CRM workspace, ${name}`,
      summaryMessage: 'Customer activity, contact freshness, and service follow-ups for relationship teams.',
      kpiCards: [
        { label: 'Active Accounts', value: '1,248', delta: '+5.6%', trend: 'up' },
        { label: 'New Contacts', value: '342', delta: '+11.7%', trend: 'up' },
        { label: 'Open Follow-ups', value: '64', delta: '-6.5%', trend: 'up' },
        { label: 'Data Quality', value: '93%', delta: '+1.8%', trend: 'up' },
      ],
      revenueSeries: [71, 69, 73, 77, 76, 82, 84, 87, 86, 90, 92, 95],
      revenueSummary: {
        value: '1.2k accounts',
        delta: '+47 account updates this week',
        details: [
          { label: 'Stale contacts', value: '28' },
          { label: 'Meetings logged', value: '146' },
          { label: 'Health', value: 'Stable', tone: 'accent' },
        ],
      },
      channelBreakdown: [
        { label: 'Healthy', value: 52 },
        { label: 'Needs attention', value: 24 },
        { label: 'Renewal soon', value: 16 },
        { label: 'Escalated', value: 8 },
      ],
      topCampaigns: [
        { name: 'Priority Follow-ups', spend: '64 tasks', roas: 'Today' },
        { name: 'Renewal Check-ins', spend: '31 accounts', roas: 'This week' },
        { name: 'Contact Cleanup', spend: '28 records', roas: 'Open' },
        { name: 'Executive Reviews', spend: '12 meetings', roas: 'Planned' },
      ],
    },
    marketing: {
      variant: 'marketing',
      welcomeMessage: `Marketing pulse, ${name}`,
      summaryMessage: 'Campaign reach, lead quality, and channel mix for current marketing programs.',
      kpiCards: [
        { label: 'Campaign Reach', value: '1.8M', delta: '+18.6%', trend: 'up' },
        { label: 'MQLs', value: '2,436', delta: '+12.1%', trend: 'up' },
        { label: 'Cost per Lead', value: '$18.40', delta: '-7.3%', trend: 'up' },
        { label: 'Engagement Rate', value: '6.9%', delta: '+0.8%', trend: 'up' },
      ],
      revenueSeries: [38, 45, 49, 58, 62, 67, 71, 76, 84, 89, 96, 103],
      revenueSummary: {
        value: '2.4k MQLs',
        delta: '+263 leads from last month',
        details: [
          { label: 'Budget used', value: '71%' },
          { label: 'Best channel', value: 'Search' },
          { label: 'Creative test', value: 'Variant B', tone: 'accent' },
        ],
      },
      channelBreakdown: [
        { label: 'Search', value: 36 },
        { label: 'Social', value: 29 },
        { label: 'Events', value: 21 },
        { label: 'Email', value: 14 },
      ],
      topCampaigns: [
        { name: 'Brand Awareness', spend: '$32,400', roas: '6.1%' },
        { name: 'Product Webinar', spend: '$14,800', roas: '412 MQLs' },
        { name: 'Search Capture', spend: '$22,700', roas: '$16 CPL' },
        { name: 'Customer Newsletter', spend: '$4,200', roas: '41% open' },
      ],
    },
    general: {
      variant: 'general',
      welcomeMessage: `Welcome, ${name}!`,
      summaryMessage: 'Your workspace is ready. Use the menu to open the areas assigned to you.',
      kpiCards: [],
      revenueSeries: [],
      revenueSummary: {
        value: '',
        delta: '',
        details: [],
      },
      channelBreakdown: [],
      topCampaigns: [],
    },
  };

  return dashboards[variant];
}

router.post('/dashboard', async (req: Request, res: Response) => {
  try {
    const payload = req.body as DashboardRequest;
    const email = payload?.user?.email?.toLowerCase().trim();
    const name = payload?.user?.name || 'there';

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'user.email is required',
      });
    }

    const dashboard = buildDashboard(resolveHomeVariant(payload.user.roleNames), name);

    res.json(dashboard);
  } catch (error) {
    console.error('Error building dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load dashboard',
    });
  }
});

export default router;
