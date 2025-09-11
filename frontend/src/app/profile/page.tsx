'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { UserIcon, HeartIcon, ChartBarIcon, KeyIcon, EnvelopeIcon, PencilIcon, CheckIcon, XMarkIcon, ExclamationTriangleIcon, TrashIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import { authAPI } from '@/lib/api';
import CategoriesList from '@/components/CategoriesList';
import { Navigation } from '@/components/Navigation';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  
  // Password update state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    password: '',
    confirmPassword: ''
  });
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  // Profile edit state
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    email: ''
  });
  const [profileErrors, setProfileErrors] = useState<string[]>([]);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  
  // Account deletion state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // Favorites search state
  const [favoritesSearchTerm, setFavoritesSearchTerm] = useState('');

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);
  
  const loadUserData = async () => {
    try {
      setLoading(true);
      const profileResponse = await authAPI.getProfile();
      
      console.log('Profile response:', profileResponse);
      
      // Handle profile data
      if (profileResponse && profileResponse.user) {
        setProfileData(profileResponse.user);
        setProfileForm({
          firstName: profileResponse.user.firstName,
          lastName: profileResponse.user.lastName,
          email: profileResponse.user.email
        });
      }
    } catch (err) {
      console.error('Error loading user data:', err);
    } finally {
      setLoading(false);
    }
  };


  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordErrors([]);
    setPasswordSuccess('');
    
    if (passwordForm.password !== passwordForm.confirmPassword) {
      setPasswordErrors(['Password confirmation does not match']);
      return;
    }
    
    try {
      setPasswordLoading(true);
      await authAPI.updatePassword(passwordForm);
      setPasswordSuccess('Password updated successfully!');
      setPasswordForm({ currentPassword: '', password: '', confirmPassword: '' });
      setShowPasswordForm(false);
    } catch (err: any) {
      const errors = err.response?.data?.errors || [{ message: err.response?.data?.message || 'Failed to update password' }];
      setPasswordErrors(errors.map((e: any) => e.message));
    } finally {
      setPasswordLoading(false);
    }
  };
  
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileErrors([]);
    setProfileSuccess('');
    
    try {
      setProfileLoading(true);
      const response = await authAPI.updateProfile(profileForm);
      setProfileSuccess('Profile updated successfully!');
      setEditingProfile(false);
      
      // Update user context
      if (updateUser) {
        await updateUser();
      }
      
      // Update local profile data
      setProfileData(response.user);
    } catch (err: any) {
      const errors = err.response?.data?.errors || [{ message: err.response?.data?.message || 'Failed to update profile' }];
      setProfileErrors(errors.map((e: any) => e.message));
    } finally {
      setProfileLoading(false);
    }
  };
  
  const cancelProfileEdit = () => {
    setEditingProfile(false);
    setProfileForm({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || ''
    });
    setProfileErrors([]);
    setProfileSuccess('');
  };
  
  const cancelPasswordUpdate = () => {
    setShowPasswordForm(false);
    setPasswordForm({ currentPassword: '', password: '', confirmPassword: '' });
    setPasswordErrors([]);
    setPasswordSuccess('');
  };
  
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      alert('Please type DELETE to confirm account deletion.');
      return;
    }
    
    try {
      setDeleteLoading(true);
      await authAPI.deleteAccount();
      
      // Redirect to home page
      window.location.href = '/';
    } catch (err: any) {
      alert('Failed to delete account: ' + (err.response?.data?.message || 'Unknown error'));
    } finally {
      setDeleteLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-600 mb-4">Please log in to view your profile.</p>
          <a 
            href="/login" 
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent mb-3">
            🚀 Mission Control
          </h1>
          <p className="text-xl text-purple-300/90 font-medium">
            ✨ Your intergalactic crossword command center
          </p>
        </div>

        {/* Profile Information */}
        <div className="bg-gradient-to-br from-gray-800/80 via-purple-800/60 to-blue-800/60 rounded-2xl shadow-2xl border border-purple-500/30 p-8 mb-8 relative overflow-hidden backdrop-blur-lg">
          {/* Background cosmic elements */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-6 right-6 w-20 h-20 bg-purple-400/30 rounded-full blur-xl animate-pulse"></div>
            <div className="absolute bottom-6 left-6 w-16 h-16 bg-cyan-400/30 rounded-full blur-lg animate-pulse" style={{animationDelay: '1.5s'}}></div>
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center mb-8">
              <div className="bg-gradient-to-br from-purple-500 to-blue-500 rounded-full p-4 mr-6 shadow-lg">
                <UserIcon className="h-10 w-10 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-300 to-cyan-300 bg-clip-text text-transparent">
                  🌟 {user.firstName} {user.lastName}
                </h2>
                <p className="text-purple-300/90 text-lg font-medium">{user.email}</p>
              </div>
            </div>

            {/* Enhanced Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-purple-700/60 to-purple-600/80 rounded-xl p-6 border border-purple-400/50 shadow-lg hover:shadow-purple-400/30 transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center">
                  <div className="bg-purple-400 rounded-full p-2 mr-4 shadow-md">
                    <ChartBarIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-purple-200">⭐ Cosmic Points</p>
                    <p className="text-2xl font-bold text-white">{user.points.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-blue-700/60 to-blue-600/80 rounded-xl p-6 border border-blue-400/50 shadow-lg hover:shadow-blue-400/30 transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center">
                  <div className="bg-blue-400 rounded-full p-2 mr-4 shadow-md">
                    <ChartBarIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-blue-200">🏆 Achievements</p>
                    <p className="text-2xl font-bold text-white">
                      {profileData?.stats?.totalAchievements || 0}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-cyan-700/60 to-cyan-600/80 rounded-xl p-6 border border-cyan-400/50 shadow-lg hover:shadow-cyan-400/30 transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center">
                  <div className="bg-cyan-400 rounded-full p-2 mr-4 shadow-md">
                    <UserIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-cyan-200">First Launched</p>
                    <p className="text-lg font-bold text-white">
                      {new Date(user.createdAt || Date.now()).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Favorite Categories Management */}
        <div className="bg-gradient-to-br from-purple-800/70 via-blue-800/70 to-indigo-800/70 rounded-2xl shadow-2xl border border-purple-500/40 p-8 mb-8 relative overflow-hidden backdrop-blur-lg">
          {/* Cosmic background elements */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-4 right-8 w-32 h-32 bg-purple-400/40 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-8 left-4 w-24 h-24 bg-cyan-400/40 rounded-full blur-2xl animate-pulse" style={{animationDelay: '1s'}}></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-indigo-400/30 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative">
                <HeartIconSolid className="h-6 w-6 text-red-500 animate-pulse" />
                <div className="absolute inset-0 h-6 w-6 text-red-300 animate-ping"></div>
              </div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-300 via-cyan-300 to-blue-300 bg-clip-text text-transparent">
                Stellar Collection
              </h3>
            </div>
            <p className="text-purple-200/90 mb-8 text-lg leading-relaxed">
              Discover and save your favorite puzzle categories from across the galaxy! Click the heart to build your personal constellation of challenges.
            </p>
            
            {/* External Search Bar */}
            <div className="mb-6">
              <div className="relative max-w-md">
                <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-purple-300" />
                <input
                  type="text"
                  placeholder="🔍 Search the cosmic categories..."
                  value={favoritesSearchTerm}
                  onChange={(e) => setFavoritesSearchTerm(e.target.value)}
                  className="pl-12 pr-12 py-3 w-full border-2 border-purple-500/50 rounded-xl focus:ring-4 focus:ring-purple-400/50 focus:border-purple-400 bg-gray-800/80 backdrop-blur-sm transition-all duration-300 placeholder-purple-300 text-white shadow-lg hover:shadow-purple-400/30"
                />
                {favoritesSearchTerm && (
                  <button
                    onClick={() => setFavoritesSearchTerm('')}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-purple-300 hover:text-white transition-all duration-200 hover:scale-110"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
            
            {/* Scrollable Categories Area */}
            <div className="max-h-96 overflow-y-auto overflow-x-hidden rounded-xl border border-purple-500/40 bg-gray-800/60 backdrop-blur-sm shadow-inner p-4">
              <CategoriesList 
                showSearch={false}
                showStats={false} 
                limit={50} 
                compact={true}
                externalSearchTerm={favoritesSearchTerm}
                onSearchChange={setFavoritesSearchTerm}
              />
            </div>
          </div>
        </div>

        {/* Account Settings */}
        <div className="bg-gradient-to-br from-gray-800/80 via-indigo-800/60 to-purple-800/60 rounded-2xl shadow-2xl border border-indigo-500/40 p-8 mb-8 relative overflow-hidden backdrop-blur-lg">
          {/* Background cosmic elements */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-4 right-4 w-24 h-24 bg-indigo-400/30 rounded-full blur-2xl animate-pulse"></div>
            <div className="absolute bottom-4 left-4 w-20 h-20 bg-purple-400/30 rounded-full blur-xl animate-pulse" style={{animationDelay: '2s'}}></div>
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full p-3 shadow-lg">
                <UserIcon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-indigo-300 via-purple-300 to-cyan-300 bg-clip-text text-transparent">
                Navigation Panel
              </h3>
            </div>
          
          {/* Profile Information Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-white flex items-center">
                <UserIcon className="h-5 w-5 mr-2 text-purple-300" />
                Profile Information
              </h4>
              {!editingProfile && (
                <button
                  onClick={() => setEditingProfile(true)}
                  className="inline-flex items-center px-3 py-1 text-sm bg-purple-600/60 text-purple-200 rounded-md hover:bg-purple-500/70 transition-colors"
                >
                  <PencilIcon className="h-4 w-4 mr-1" />
                  Edit
                </button>
              )}
            </div>
            
            {editingProfile ? (
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-purple-200 mb-1">First Name</label>
                    <input
                      type="text"
                      value={profileForm.firstName}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, firstName: e.target.value }))}
                      className="w-full px-3 py-2 border border-purple-500/50 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-gray-700/80 text-white placeholder-gray-300"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-purple-200 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={profileForm.lastName}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, lastName: e.target.value }))}
                      className="w-full px-3 py-2 border border-purple-500/50 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-gray-700/80 text-white placeholder-gray-300"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  />
                </div>
                
                {profileErrors.length > 0 && (
                  <div className="bg-red-900/60 border border-red-500/50 rounded-md p-3">
                    <ul className="text-sm text-red-200 space-y-1">
                      {profileErrors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {profileSuccess && (
                  <div className="bg-green-900/60 border border-green-500/50 rounded-md p-3">
                    <p className="text-sm text-green-200">{profileSuccess}</p>
                  </div>
                )}
                
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={profileLoading}
                    className="inline-flex items-center px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {profileLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Updating...
                      </>
                    ) : (
                      <>
                        <CheckIcon className="h-4 w-4 mr-1" />
                        Save Changes
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={cancelProfileEdit}
                    className="inline-flex items-center px-4 py-2 bg-gray-600/60 text-gray-200 rounded-md hover:bg-gray-500/70 transition-colors"
                  >
                    <XMarkIcon className="h-4 w-4 mr-1" />
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="bg-gray-700/60 rounded-md p-4 border border-gray-600/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-purple-200">Name</p>
                    <p className="text-white">{user?.firstName} {user?.lastName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-purple-200">Email</p>
                    <p className="text-white">{user?.email}</p>
                  </div>
                </div>
                {profileData && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-500/50">
                    <div>
                      <p className="text-sm font-medium text-purple-200">Member Since</p>
                      <p className="text-white">{new Date(profileData.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-purple-200">Puzzles Played</p>
                      <p className="text-white">{profileData.stats?.totalPuzzlesPlayed || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-purple-200">Achievements</p>
                      <p className="text-white">{profileData.stats?.totalAchievements || 0}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Password Section */}
          {profileData?.hasPassword && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-white flex items-center">
                  <KeyIcon className="h-5 w-5 mr-2 text-purple-300" />
                  Password & Security
                </h4>
                {!showPasswordForm && (
                  <button
                    onClick={() => setShowPasswordForm(true)}
                    className="inline-flex items-center px-3 py-1 text-sm bg-purple-600/60 text-purple-200 rounded-md hover:bg-purple-500/70 transition-colors"
                  >
                    <KeyIcon className="h-4 w-4 mr-1" />
                    Change Password
                  </button>
                )}
              </div>
              
              {showPasswordForm ? (
                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-purple-200 mb-1">Current Password</label>
                    <input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                      className="w-full px-3 py-2 border border-purple-500/50 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-gray-700/80 text-white placeholder-gray-300"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-purple-200 mb-1">New Password</label>
                    <input
                      type="password"
                      value={passwordForm.password}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full px-3 py-2 border border-purple-500/50 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-gray-700/80 text-white placeholder-gray-300"
                      required
                      minLength={8}
                    />
                    <p className="text-xs text-purple-300/80 mt-1">Must be at least 8 characters with uppercase, lowercase, and number</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-purple-200 mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className="w-full px-3 py-2 border border-purple-500/50 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-gray-700/80 text-white placeholder-gray-300"
                      required
                    />
                  </div>
                  
                  {passwordErrors.length > 0 && (
                    <div className="bg-red-900/60 border border-red-500/50 rounded-md p-3">
                      <ul className="text-sm text-red-200 space-y-1">
                        {passwordErrors.map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {passwordSuccess && (
                    <div className="bg-green-900/60 border border-green-500/50 rounded-md p-3">
                      <p className="text-sm text-green-200">{passwordSuccess}</p>
                    </div>
                  )}
                  
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={passwordLoading}
                      className="inline-flex items-center px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {passwordLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Updating...
                        </>
                      ) : (
                        <>
                          <CheckIcon className="h-4 w-4 mr-1" />
                          Update Password
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={cancelPasswordUpdate}
                      className="inline-flex items-center px-4 py-2 bg-gray-600/60 text-gray-200 rounded-md hover:bg-gray-500/70 transition-colors"
                    >
                      <XMarkIcon className="h-4 w-4 mr-1" />
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="bg-gray-700/60 rounded-md p-4 border border-gray-600/50">
                  <p className="text-gray-200">Password was last updated on your account creation date.</p>
                  <p className="text-sm text-purple-300/80 mt-1">For security, we recommend updating your password regularly.</p>
                </div>
              )}
            </div>
          )}
          
          {/* Google OAuth Users */}
          {profileData?.isGoogleUser && !profileData?.hasPassword && (
            <div className="bg-blue-900/60 border border-blue-500/50 rounded-md p-4">
              <h4 className="font-medium text-blue-200 mb-2 flex items-center">
                <EnvelopeIcon className="h-5 w-5 mr-2" />
                Google Account
              </h4>
              <p className="text-blue-300 text-sm">
                You signed up using Google OAuth. Your account is secured through Google's authentication system.
              </p>
            </div>
          )}
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-gradient-to-br from-red-900/70 via-red-800/70 to-orange-900/70 rounded-2xl shadow-2xl border-2 border-red-500/50 p-8 relative overflow-hidden backdrop-blur-lg">
          {/* Warning background elements */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-4 right-4 w-20 h-20 bg-red-400/30 rounded-full blur-xl animate-pulse"></div>
            <div className="absolute bottom-4 left-4 w-16 h-16 bg-orange-400/30 rounded-full blur-lg animate-pulse" style={{animationDelay: '1s'}}></div>
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-gradient-to-br from-red-500 to-orange-500 rounded-full p-3 shadow-lg animate-pulse">
                <ExclamationTriangleIcon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-red-400 via-red-300 to-orange-300 bg-clip-text text-transparent">
                Red Alert Zone
              </h3>
            </div>
          
          <div className="bg-red-900/60 rounded-md p-4 border border-red-600/50">
            <h4 className="font-medium text-red-200 mb-2">Delete Account</h4>
            <p className="text-red-300 text-sm mb-4">
              Once you delete your account, there is no going back. This will permanently delete your profile, 
              progress, achievements, and all associated data.
            </p>
            
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-400 transition-colors"
              >
                <TrashIcon className="h-4 w-4 mr-1" />
                Delete Account
              </button>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-red-200 mb-2">
                    Type <span className="font-bold">DELETE</span> to confirm:
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    className="w-full max-w-xs px-3 py-2 border border-red-500/50 rounded-md focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent bg-gray-700/80 text-white placeholder-gray-300"
                    placeholder="DELETE"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteLoading || deleteConfirmText !== 'DELETE'}
                    className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {deleteLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Deleting...
                      </>
                    ) : (
                      <>
                        <TrashIcon className="h-4 w-4 mr-1" />
                        Permanently Delete Account
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmText('');
                    }}
                    className="inline-flex items-center px-4 py-2 bg-gray-600/60 text-gray-200 rounded-md hover:bg-gray-500/70 transition-colors"
                  >
                    <XMarkIcon className="h-4 w-4 mr-1" />
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
      </div>
    </div>
  );
}