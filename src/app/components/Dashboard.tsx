// frontend/xboard/app/components/Dashboard.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, ResponsiveContainer } from 'recharts';
import { 
  Users, ShoppingCart, DollarSign, TrendingUp, Store, RefreshCw, 
  LogOut, User, Webhook, Activity, CheckCircle, AlertCircle
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001/api';

interface DashboardProps {
  onLogout: () => void;
}

interface UserInfo {
  email: string;
  shop_domain: string;
  status: string;
  installed_at: string;
}

interface Overview {
  total_customers: string;
  total_orders: string;
  total_revenue: string;
  currency: string;
}

interface OrderByDate {
  order_date: string;
  order_count: string;
  daily_revenue: string;
}

interface TopCustomer {
  customer_email: string;
  customer_name: string;
  order_count: string;
  total_spent: string;
}

interface RecentOrder {
  id: number;
  shopify_order_id: string;
  total_price: string;
  currency: string;
  created_at: string;
}

interface WebhookEvent {
  id: number;
  event_type: string;
  shopify_id: string;
  processed_at: string;
}

interface WebhookStatus {
  webhooks_active: boolean;
  last_webhook_event: string | null;
  webhook_count: number;
  events: WebhookEvent[];
}

export default function Dashboard({ onLogout }: DashboardProps) {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [ordersByDate, setOrdersByDate] = useState<OrderByDate[]>([]);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [webhookStatus, setWebhookStatus] = useState<WebhookStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false); // Used only for manual refresh
  const [lastDashboardUpdate, setLastDashboardUpdate] = useState<Date>(new Date());
  
  const webhookSetupAttempted = useRef(false); // To prevent spamming setup requests
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null); // Ref to store interval ID

  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    return {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };
  };

  // Automated Webhook Setup Function (purely for system use)
  const setupWebhooksAutomatically = useCallback(async () => {
    if (webhookSetupAttempted.current) {
        console.log("Skipping auto-webhook setup attempt as one is already in progress or recently failed.");
        return; 
    }

    webhookSetupAttempted.current = true; // Set flag
    try {
      console.log("Attempting automatic webhook setup...");
      await axios.post(`${API_BASE}/auth/setup-webhooks`, {}, getAuthHeaders());
      // On success, immediately refetch all data to update status
      await fetchAllData(true); 
      console.log("Automatic webhook setup completed!");
      // Reset flag to allow future attempts only if an issue occurs that changes webhookStatus
      webhookSetupAttempted.current = false; // Allow new attempts if needed
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        console.error('Webhook setup failed (auto-attempt):', err.response?.data?.error || err.message);
      } else {
        console.error('Webhook setup failed (auto-attempt):', err);
      }
      // If it failed, don't spam. Wait a bit before allowing another auto-attempt.
      setTimeout(() => webhookSetupAttempted.current = false, 30000); // Allow re-attempt after 30 seconds if it failed
    }
  }, []); 


  const fetchAllData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      
      const [userRes, overviewRes, ordersDateRes, topCustomersRes, recentOrdersRes, webhookRes] = await Promise.all([
        axios.get(`${API_BASE}/me`, getAuthHeaders()),
        axios.get(`${API_BASE}/overview`, getAuthHeaders()),
        axios.get(`${API_BASE}/orders-by-date`, getAuthHeaders()),
        axios.get(`${API_BASE}/top-customers`, getAuthHeaders()),
        axios.get(`${API_BASE}/recent-orders?limit=10`, getAuthHeaders()),
        axios.get(`${API_BASE}/webhook-status`, getAuthHeaders()).catch(() => ({ data: null }))
      ]);

      setUserInfo(userRes.data);
      setOverview(overviewRes.data);
      setOrdersByDate(ordersDateRes.data);
      setTopCustomers(topCustomersRes.data);
      setRecentOrders(recentOrdersRes.data);
      setWebhookStatus(webhookRes.data);
      setLastDashboardUpdate(new Date()); // Update timestamp on successful data fetch

      // If webhooks are NOT active, automatically attempt to set them up in the background
      // This is now guarded by webhookSetupAttempted ref
      if (webhookRes.data && !webhookRes.data.webhooks_active && !webhookSetupAttempted.current) {
          setupWebhooksAutomatically(); 
      }

    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        console.error('Failed to fetch data (axios error):', err.response?.data?.error || err.message);
        const status = err.response?.status;
        if (status === 401 || status === 403) {
          onLogout();
        }
      } else {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error('Failed to fetch data:', error);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [onLogout, setupWebhooksAutomatically]);


  // Effect for initial data fetch and setting up polling
  useEffect(() => {
    // Clear any existing interval to prevent duplicates
    if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
    }

    // Initial data fetch
    fetchAllData(); 

    // Set up polling
    pollingIntervalRef.current = setInterval(() => {
        console.log("Polling for dashboard updates...");
        fetchAllData(true); // Call silent fetch
    }, 15000); // Polling every 15 seconds for faster updates

    // Cleanup function to clear interval on component unmount
    return () => {
      if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
      }
    };
  }, [fetchAllData]); // Only fetchAllData as dependency


  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      await axios.post(`${API_BASE}/sync`, {}, getAuthHeaders()); 
      await fetchAllData(); // Fetches latest data after sync
      console.log("Dashboard manually refreshed and synced!");
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        console.error('Manual Refresh/Sync failed:', err.response?.data?.error || err.message);
        const status = err.response?.status;
        if (status === 401 || status === 403) {
            onLogout();
        }
      } else {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error('Manual Refresh/Sync failed:', error);
      }
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading your dashboard...</div>
      </div>
    );
  }

  const avgOrderValue = overview && Number(overview.total_orders) > 0 
    ? Math.round(Number(overview.total_revenue) / Number(overview.total_orders)) 
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Store className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">XBoard</h1>
                <p className="text-sm text-gray-500">Your Shopify Analytics</p>
              </div>
            </div>
            
            {/* User Info & Controls */}
            <div className="flex items-center space-x-4">
              {/* Live Sync Status (simplified) */}
              <div className="flex items-center space-x-2 bg-gray-50 rounded-lg px-3 py-2">
                <div className={`w-2 h-2 rounded-full ${webhookStatus?.webhooks_active ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                <span className="text-xs text-gray-600">
                  {webhookStatus?.webhooks_active ? 'Live Sync Active' : 'Initializing Sync'}
                </span>
              </div>

              <div className="flex items-center space-x-2 bg-gray-50 rounded-lg px-3 py-2">
                <User className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-700">{userInfo?.email}</span>
              </div>
              
              <button
                onClick={handleManualRefresh}
                disabled={refreshing}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Refresh Data</span>
              </button>
              
              <button
                onClick={onLogout}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Store Info Banner with Automated Status */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-blue-900">
                📊 Analytics for {userInfo?.shop_domain}
              </h2>
              <p className="text-blue-700 text-sm">
                Status: {userInfo?.status} • Connected since: {new Date(userInfo?.installed_at || '').toLocaleDateString()}
              </p>
              <p className="text-blue-600 text-xs mt-1">
                Last dashboard update: {lastDashboardUpdate.toLocaleTimeString()}
              </p>
            </div>
            
            {/* Webhook Status Display (Automated, subtle) */}
            <div className="text-right flex items-center space-x-2">
                <Webhook className="w-4 h-4 text-blue-600" />
                {webhookStatus?.webhooks_active ? (
                    <span className="text-green-700 text-sm font-medium">Real-time Webhooks Active</span>
                ) : (
                    <span className="text-amber-700 text-sm font-medium">Webhooks Initializing...</span>
                )}
            </div>
          </div>
        </div>

        {/* Webhook Activity Indicator (only show if webhooks are active) */}
        {webhookStatus?.events && webhookStatus.events.length > 0 && webhookStatus.webhooks_active && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-green-600" />
                <span className="text-green-800 text-sm font-medium">Recent Real-time Activity</span>
              </div>
              <div className="text-green-700 text-xs">
                {webhookStatus.webhook_count} events processed
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {webhookStatus.events.slice(0, 3).map((event) => (
                <span key={event.id} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                  {event.event_type} • {new Date(event.processed_at).toLocaleTimeString()}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Overview Cards (same as before) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Customers</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{overview?.total_customers || '0'}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{overview?.total_orders || '0'}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {overview?.currency === 'USD' ? '$' : '₹'}{overview?.total_revenue || '0'}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {overview?.currency === 'USD' ? '$' : '₹'}{avgOrderValue}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts Grid (same as before) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 Daily Revenue Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={ordersByDate}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="order_date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="daily_revenue" stroke="#3B82F6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">👥 Top Customers by Spend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topCustomers}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="customer_email" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total_spent" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Orders Table (enhanced with real-time indicator) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">🛒 Recent Orders</h3>
            {webhookStatus?.webhooks_active && ( // Only show live updates if webhooks are active
              <div className="flex items-center space-x-2 text-sm text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Live Updates</span>
              </div>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Currency
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                      No orders found for your store
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((order, index) => (
                    <tr 
                      key={order.id} 
                      className={`hover:bg-gray-50 ${index < 3 ? 'bg-blue-50/30' : ''}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{order.shopify_order_id}
                        {index < 3 && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            New
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.currency === 'USD' ? '$' : '₹'}{order.total_price}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.currency}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}