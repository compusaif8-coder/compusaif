---
description: Real Firebase Analytics Implementation Plan
---

# Real Firebase Analytics Dashboard - Implementation Plan

## Overview
Transform the current analytics dashboard to use real Firebase Analytics (GA4) data via BigQuery, matching the official Firebase Analytics console.

---

## Phase 1: Firebase Analytics & BigQuery Setup

### Step 1.1: Enable Firebase Analytics (GA4)
1. Go to Firebase Console: https://console.firebase.google.com
2. Select your project: `epic-electronics-274dd`
3. Navigate to: **Analytics** → **Dashboard**
4. Ensure Firebase Analytics is enabled (it should already be if you see data)
5. Note: Web analytics uses GA4 automatically in Firebase SDK v9+

### Step 1.2: Enable BigQuery Export
1. In Firebase Console, go to: **Project Settings** (gear icon)
2. Navigate to: **Integrations** tab
3. Find **BigQuery** card
4. Click **Link** to connect BigQuery
5. Configure export settings:
   - ✅ **Enable** daily export
   - ✅ **Enable** streaming export (real-time data, ~15 min delay)
   - Select region: Choose closest to Egypt (europe-west1 or us-east1)
   - Dataset location: Same as region
6. Click **Link to BigQuery**
7. Wait 24-48 hours for first data export to populate

**Important Notes:**
- BigQuery has a **free tier**: 10GB storage, 1TB queries/month
- Streaming export costs extra but provides near real-time data
- Data exports start from the day you enable BigQuery (no historical data before that)

---

## Phase 2: Update Firebase SDK Configuration

### Step 2.1: Install Required Dependencies
```bash
npm install firebase @google-cloud/bigquery dotenv
```

### Step 2.2: Enable Analytics in Firebase Config
Update `src/lib/firebase.ts` to ensure Analytics is initialized:

```typescript
import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  // ... existing config
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Initialize Analytics
export const analytics = await isSupported() ? getAnalytics(app) : null;
```

### Step 2.3: Track Events with Firebase Analytics
Update `src/lib/analytics.ts` to use Firebase Analytics events:

```typescript
import { analytics } from './firebase';
import { logEvent } from 'firebase/analytics';

// Track page views
export const trackPageView = (page: string) => {
  if (analytics) {
    logEvent(analytics, 'page_view', {
      page_path: page,
      page_title: document.title,
    });
  }
};

// Track other events
export const trackEvent = (eventName: string, params?: any) => {
  if (analytics) {
    logEvent(analytics, eventName, params);
  }
};
```

---

## Phase 3: Build Backend API for BigQuery

### Step 3.1: Create Cloud Functions Directory
```bash
mkdir -p functions/src
cd functions
npm init -y
npm install firebase-functions firebase-admin @google-cloud/bigquery cors express
npm install --save-dev @types/cors @types/express typescript
```

### Step 3.2: Initialize Firebase Functions
```bash
firebase init functions
# Select: TypeScript
# Use ESLint: Yes
# Install dependencies: Yes
```

### Step 3.3: Create BigQuery Analytics API

**File: `functions/src/index.ts`**

```typescript
import * as functions from 'firebase-functions';
import { BigQuery } from '@google-cloud/bigquery';
import * as cors from 'cors';
import * as express from 'express';

const app = express();
app.use(cors({ origin: true }));

const bigquery = new BigQuery({
  projectId: 'epic-electronics-274dd',
});

// Get analytics data for time range
app.get('/analytics', async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const projectId = 'epic-electronics-274dd';
    const datasetId = 'analytics_YOUR_DATASET_ID'; // Replace after BigQuery setup
    
    // Query total users
    const usersQuery = `
      SELECT 
        COUNT(DISTINCT user_pseudo_id) as total_users
      FROM \`${projectId}.${datasetId}.events_*\`
      WHERE _TABLE_SUFFIX BETWEEN 
        FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY))
        AND FORMAT_DATE('%Y%m%d', CURRENT_DATE())
    `;
    
    const [usersResult] = await bigquery.query({ query: usersQuery });
    
    res.json({
      totalUsers: usersResult[0]?.total_users || 0,
      // Add more metrics...
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

export const api = functions.https.onRequest(app);
```

### Step 3.4: Deploy Cloud Functions
```bash
firebase deploy --only functions
```

---

## Phase 4: BigQuery Queries for Each Metric

### Query Templates (for `functions/src/queries.ts`)

```typescript
export const getQueries = (projectId: string, datasetId: string, days: number) => {
  const tablePattern = `\`${projectId}.${datasetId}.events_*\``;
  const dateFilter = `WHERE _TABLE_SUFFIX BETWEEN 
    FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY))
    AND FORMAT_DATE('%Y%m%d', CURRENT_DATE())`;

  return {
    // Total Users
    totalUsers: `
      SELECT COUNT(DISTINCT user_pseudo_id) as count
      FROM ${tablePattern} ${dateFilter}
    `,
    
    // Active Users (last 24h)
    activeUsers: `
      SELECT COUNT(DISTINCT user_pseudo_id) as count
      FROM ${tablePattern}
      WHERE _TABLE_SUFFIX = FORMAT_DATE('%Y%m%d', CURRENT_DATE())
        AND event_name = 'user_engagement'
    `,
    
    // Sessions
    sessions: `
      SELECT COUNT(*) as count
      FROM ${tablePattern} ${dateFilter}
      WHERE event_name = 'session_start'
    `,
    
    // Page Views
    pageViews: `
      SELECT COUNT(*) as count
      FROM ${tablePattern} ${dateFilter}
      WHERE event_name = 'page_view'
    `,
    
    // Top Pages
    topPages: `
      SELECT 
        (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'page_location') as page,
        COUNT(*) as views
      FROM ${tablePattern} ${dateFilter}
      WHERE event_name = 'page_view'
      GROUP BY page
      ORDER BY views DESC
      LIMIT 10
    `,
    
    // Traffic Sources
    trafficSources: `
      SELECT 
        traffic_source.source as source,
        traffic_source.medium as medium,
        COUNT(DISTINCT user_pseudo_id) as users
      FROM ${tablePattern} ${dateFilter}
      GROUP BY source, medium
      ORDER BY users DESC
    `,
    
    // Device Breakdown
    devices: `
      SELECT 
        device.category as device_category,
        COUNT(DISTINCT user_pseudo_id) as users
      FROM ${tablePattern} ${dateFilter}
      GROUP BY device_category
    `,
    
    // Countries
    countries: `
      SELECT 
        geo.country as country,
        COUNT(DISTINCT user_pseudo_id) as users
      FROM ${tablePattern} ${dateFilter}
      GROUP BY country
      ORDER BY users DESC
    `,
    
    // Engagement Time
    avgEngagementTime: `
      SELECT 
        AVG((SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'engagement_time_msec')) as avg_time
      FROM ${tablePattern} ${dateFilter}
      WHERE event_name = 'user_engagement'
    `,
  };
};
```

---

## Phase 5: Build React Dashboard

### Step 5.1: Create API Service

**File: `src/services/analyticsApi.ts`**

```typescript
const API_BASE_URL = 'https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/api';

export interface AnalyticsData {
  totalUsers: number;
  activeUsers: number;
  sessions: number;
  pageViews: number;
  avgEngagementTime: number;
  topPages: Array<{ page: string; views: number }>;
  trafficSources: Array<{ source: string; medium: string; users: number }>;
  devices: Array<{ category: string; users: number }>;
  countries: Array<{ country: string; users: number }>;
}

export const fetchAnalytics = async (days: number = 30): Promise<AnalyticsData> => {
  const response = await fetch(`${API_BASE_URL}/analytics?days=${days}`);
  if (!response.ok) {
    throw new Error('Failed to fetch analytics');
  }
  return response.json();
};
```

### Step 5.2: Update Analytics Hook

**File: `src/hooks/useFirebaseAnalytics.ts`**

```typescript
import { useState, useEffect } from 'react';
import { fetchAnalytics, AnalyticsData } from '@/services/analyticsApi';

export const useFirebaseAnalytics = (timeRange: number) => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const analyticsData = await fetchAnalytics(timeRange);
        setData(analyticsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [timeRange]);

  return { data, loading, error };
};
```

### Step 5.3: Update Analytics Page

Update `src/pages/admin/Analytics.tsx` to use the new hook and display GA4 data.

---

## Phase 6: Chart Implementation

### Step 6.1: Install Chart Library
```bash
npm install recharts
```

### Step 6.2: Create Chart Components

**Example: Daily Visitors Chart**

```typescript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DailyVisitorsChartProps {
  data: Array<{ date: string; visitors: number }>;
}

export const DailyVisitorsChart: React.FC<DailyVisitorsChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="visitors" stroke="#8884d8" />
      </LineChart>
    </ResponsiveContainer>
  );
};
```

---

## Phase 7: Security & Optimization

### Step 7.1: Secure Cloud Functions
- Add Firebase Authentication check
- Implement rate limiting
- Use environment variables for sensitive data

### Step 7.2: Cache Results
- Use Firebase Functions caching
- Implement client-side caching with React Query
- Set appropriate cache TTL (5-15 minutes)

### Step 7.3: Optimize BigQuery Queries
- Use partitioned tables
- Limit date ranges
- Batch multiple queries
- Use query cache

---

## Phase 8: Testing & Validation

### Step 8.1: Compare with Firebase Console
1. Open Firebase Analytics Dashboard
2. Select same time range in custom dashboard
3. Compare metrics:
   - Total users
   - Active users
   - Sessions
   - Page views
   - Top pages
   - Device breakdown
   - Traffic sources

### Step 8.2: Verify Data Accuracy
- Check if numbers match (±5% acceptable)
- Investigate discrepancies
- Document any known differences

---

## Timeline Estimate

- **Phase 1-2 (Setup)**: 1-2 hours
- **Phase 3-4 (Backend)**: 4-6 hours
- **Phase 5-6 (Frontend)**: 4-6 hours
- **Phase 7-8 (Polish)**: 2-4 hours
- **Total**: 11-18 hours

**Note**: BigQuery data export requires 24-48 hours to start populating after enabling.

---

## Cost Estimate (Monthly)

- **BigQuery**: Free tier covers most small-medium sites
  - Storage: 10GB free
  - Queries: 1TB free
- **Cloud Functions**: Free tier covers most cases
  - 2M invocations/month free
  - 400K GB-seconds compute free
- **Estimated cost for medium traffic site**: $0-5/month

---

## Known Limitations

1. **Data Delay**: BigQuery streaming has 15-30 min delay
2. **Historical Data**: Only from BigQuery enable date forward
3. **Web vs App**: Firebase Analytics for web has some limitations vs mobile
4. **Sampling**: Very high traffic sites may see sampled data
5. **Custom Dimensions**: Limited compared to GA360

---

## Troubleshooting

### BigQuery Not Showing Data
- Wait 24-48 hours after enabling
- Check if Analytics SDK is properly initialized
- Verify events are being sent (Firebase DebugView)

### Quota Exceeded
- Reduce query frequency
- Implement caching
- Optimize queries

### Permission Errors
- Ensure Cloud Function has BigQuery Data Viewer role
- Check Firebase Admin SDK initialization

---

## Resources

- [Firebase Analytics Documentation](https://firebase.google.com/docs/analytics)
- [BigQuery Export Schema](https://support.google.com/analytics/answer/7029846)
- [GA4 BigQuery Guide](https://firebase.google.com/docs/projects/bigquery-export)
- [Cloud Functions Documentation](https://firebase.google.com/docs/functions)
