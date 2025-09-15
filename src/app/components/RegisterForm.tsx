'use client';

import { useState } from 'react';
import axios, { AxiosError } from 'axios';
import {
  Store,
  Mail,
  Lock,
  Key,
  Globe,
  UserPlus,
  Info,
  Eye,
  EyeOff,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001/api';

interface RegisterFormProps {
  onSuccess: (token: string) => void;
  onSwitchToLogin: () => void;
}

interface FormData {
  email: string;
  password: string;
  shopDomain: string;
  accessToken: string;
  scopes: string;
}

interface RegisterResponse {
  success: boolean;
  token?: string;
  error?: string;
}

interface ErrorResponse {
  error?: string;
}

export default function RegisterForm({ onSuccess, onSwitchToLogin }: RegisterFormProps) {
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    shopDomain: '',
    accessToken: '',
    scopes: 'read_customers,read_orders,read_products',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [showToken, setShowToken] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post<RegisterResponse>(`${API_BASE}/auth/register`, formData);

      if (response.data?.success && response.data.token) {
        onSuccess(response.data.token);
      } else {
        setError(response.data?.error || 'Registration failed');
      }
    } catch (err: unknown) {
      if (axios.isAxiosError<ErrorResponse>(err)) {
        const axiosErr = err as AxiosError<ErrorResponse>;
        const serverMessage = axiosErr.response?.data?.error || axiosErr.message;
        setError(serverMessage || 'Registration failed');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-md w-full space-y-8 p-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center shadow-md">
              <Store className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Connect Your Store</h2>
          <p className="mt-2 text-gray-600">Set up your Shopify analytics dashboard</p>
        </div>

        {/* Register Form */}
        <div className="bg-white rounded-xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Your Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400"
                  placeholder="your@email.com"
                />
              </div>
            </div>

            {/* Password with toggle */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Create Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400"
                  placeholder="Create a secure password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Shopify Details */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Shopify Store Details</h3>

              {/* Domain */}
              <div>
                <label htmlFor="shopDomain" className="block text-sm font-medium text-gray-700 mb-2">
                  Store Domain
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    id="shopDomain"
                    name="shopDomain"
                    type="text"
                    required
                    value={formData.shopDomain}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400"
                    placeholder="your-store.myshopify.com"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1 flex items-center">
                  <Info className="w-3 h-3 mr-1" /> Example: mystore.myshopify.com
                </p>
              </div>

              {/* Access Token with toggle */}
              <div className="mt-4">
                <label htmlFor="accessToken" className="block text-sm font-medium text-gray-700 mb-2">
                  Admin API Access Token
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    id="accessToken"
                    name="accessToken"
                    type={showToken ? 'text' : 'password'}
                    required
                    value={formData.accessToken}
                    onChange={handleChange}
                    className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400"
                    placeholder="shpat_..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(prev => !prev)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showToken ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1 flex items-center">
                  <Info className="w-3 h-3 mr-1" /> Found in Shopify admin → Apps → Develop apps
                </p>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-lg shadow-sm text-white font-medium bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <UserPlus className="w-5 h-5 mr-2" />
                  Connect Store & Create Account
                </>
              )}
            </button>
          </form>

          {/* Switch to Login */}
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <button
                onClick={onSwitchToLogin}
                className="text-blue-600 hover:text-blue-500 font-medium"
              >
                Sign in here
              </button>
            </p>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
          <h3 className="font-medium text-blue-900 mb-2">📋 How to get your API token:</h3>
          <ol className="text-blue-800 space-y-1 list-decimal list-inside">
            <li>Go to your Shopify Admin</li>
            <li>Settings → Apps and sales channels</li>
            <li>Develop apps → Create an app</li>
            <li>Configure Admin API access scopes</li>
            <li>Install app and copy the displayed access token (it shows only once!)</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
