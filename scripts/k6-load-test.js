import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const orderCountsTrend = new Trend('order_counts_duration');
const ordersFilterTrend = new Trend('orders_filter_duration');
const dashboardOverviewTrend = new Trend('dashboard_overview_duration');
const branchMetricsTrend = new Trend('branch_metrics_duration');

export const options = {
  stages: [
    { duration: '3s', target: 5 },
    { duration: '10s', target: 15 },
    { duration: '3s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<120'], // P95 latency must be under 120ms
    order_counts_duration: ['p(95)<120'],
    orders_filter_duration: ['p(95)<120'],
    dashboard_overview_duration: ['p(95)<120'],
    branch_metrics_duration: ['p(95)<120'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:4000';

export function setup() {
  const loginRes = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({
      email: 'admin@platform.local',
      password: 'Password123!',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(loginRes, {
    'login succeeded': (r) => r.status === 200 && r.json('accessToken') !== undefined,
  });

  return { token: loginRes.json('accessToken') };
}

export default function (data) {
  const params = {
    headers: {
      Authorization: `Bearer ${data.token}`,
      'Content-Type': 'application/json',
    },
  };

  // 1. Order queue volume counts (aggregating 11 queues)
  const resCounts = http.get(`${BASE_URL}/api/v1/admin/orders/counts`, params);
  orderCountsTrend.add(resCounts.timings.duration);
  check(resCounts, {
    'order counts 200': (r) => r.status === 200,
  });

  // 2. Order queue filtering (NEW status)
  const resOrders = http.get(`${BASE_URL}/api/v1/admin/orders?status=NEW&limit=20`, params);
  ordersFilterTrend.add(resOrders.timings.duration);
  check(resOrders, {
    'orders filter 200': (r) => r.status === 200,
  });

  // 3. Executive dashboard overview
  const resDashboard = http.get(`${BASE_URL}/api/v1/admin/dashboard/overview`, params);
  dashboardOverviewTrend.add(resDashboard.timings.duration);
  check(resDashboard, {
    'dashboard overview 200': (r) => r.status === 200,
  });

  // 4. Campus branch performance metrics
  const resBranches = http.get(`${BASE_URL}/api/v1/admin/branches/metrics`, params);
  branchMetricsTrend.add(resBranches.timings.duration);
  check(resBranches, {
    'branch metrics 200': (r) => r.status === 200,
  });

  sleep(0.05);
}
