// frontend/xboard/app/components/Dashboard.tsx
'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, ResponsiveContainer } from 'recharts';
import { Users, ShoppingCart, DollarSign, TrendingUp, Store, RefreshCw, LogOut, User } from 'lucide-react';

const API_BASE = 'https://xboard-backend-gexu.onrender.com/api';

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

export default function Dashboard({ onLogout }: DashboardProps) {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [ordersByDate, setOrdersByDate] = useState<OrderByDate[]>([]);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    return {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };
  };

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      // Fetch user info, which includes their associated shop_domain
      const [userRes, overviewRes, ordersDateRes, topCustomersRes, recentOrdersRes] = await Promise.all([
        axios.get(`${API_BASE}/me`, getAuthHeaders()),
        axios.get(`${API_BASE}/overview`, getAuthHeaders()),
        axios.get(`${API_BASE}/orders-by-date`, getAuthHeaders()),
        axios.get(`${API_BASE}/top-customers`, getAuthHeaders()),
        axios.get(`${API_BASE}/recent-orders?limit=5`, getAuthHeaders())
      ]);

      setUserInfo(userRes.data);
      setOverview(overviewRes.data);
      setOrdersByDate(ordersDateRes.data);
      setTopCustomers(topCustomersRes.data);
      setRecentOrders(recentOrdersRes.data);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        console.error('Failed to fetch data (axios error):', err.response?.data?.error || err.message);
        const status = err.response?.status;
        if (status === 401 || status === 403) {
          // Token expired or invalid, log out
          onLogout();
        }
      } else {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error('Failed to fetch data:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Step 1: Trigger the backend to sync data from Shopify for this tenant
      await axios.post(`${API_BASE}/sync`, {}, getAuthHeaders()); 
      
      // Step 2: After the backend sync, fetch the latest dashboard data from our DB
      await fetchAllData(); 
      console.log("Dashboard refreshed and synced!");
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        console.error('Refresh/Sync failed (axios error):', err.response?.data?.error || err.message);
        // If the sync itself fails (e.g., Shopify token expired), you might want to logout
        if (err.response?.status === 401 || err.response?.status === 403) {
            onLogout();
        }
      } else {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error('Refresh/Sync failed:', error);
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
    : 0; // Handle division by zero

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
                <p className="text-sm text-gray-500">Your Shopify Analytics Dashboard</p>
              </div>
            </div>
            
            {/* User Info & Controls */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-gray-50 rounded-lg px-3 py-2">
                <User className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-700">{userInfo?.email}</span>
              </div>
              
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
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
        {/* Store Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-blue-900">
                📊 Analytics for {userInfo?.shop_domain}
              </h2>
              <p className="text-blue-700 text-sm">
                Status: {userInfo?.status} • Connected since: {new Date(userInfo?.installed_at || '').toLocaleDateString()}
              </p>
            </div>
            <div className="text-sm text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
              🔒 Private Dashboard
            </div>
          </div>
        </div>

        {/* Overview Cards */}
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

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Daily Revenue Chart */}
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

          {/* Top Customers Chart */}
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

        {/* Recent Orders Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">🛒 Recent Orders</h3>
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
                  recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{order.shopify_order_id}
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