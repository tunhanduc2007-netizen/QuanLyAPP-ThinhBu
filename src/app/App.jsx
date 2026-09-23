import React from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { FinanceProvider, useFinance } from '@/context/FinanceContext';
import BottomNav from '@/components/layout/BottomNav';
import Toast from '@/components/layout/Toast';
import AddTransactionModal from '@/components/modals/AddTransactionModal';
import TransferModal from '@/components/modals/TransferModal';
import AIAssistantModal from '@/components/modals/AIAssistantModal';
import AIProposalModal from '@/components/modals/AIProposalModal';
import AIInsightsModal from '@/components/modals/AIInsightsModal';
import NewGoalModal from '@/components/modals/NewGoalModal';
import FriendQrModal from '@/components/modals/FriendQrModal';

import DashboardPage from '@/pages/DashboardPage';
import CalendarPage from '@/pages/CalendarPage';
import TransactionsPage from '@/pages/TransactionsPage';
import WalletsPage from '@/pages/WalletsPage';
import RankingPage from '@/pages/RankingPage';
import FriendsPage from '@/pages/FriendsPage';
import SettingsPage from '@/pages/SettingsPage';
import LoginPage from '@/pages/LoginPage';

function MainAppShell() {
  const { isLoggedIn, loading } = useAuth();
  const { activeTab } = useFinance();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-app)', color: 'var(--primary-green)', fontWeight: 800 }}>
        Đang khởi động FinTrack Pro...
      </div>
    );
  }

  if (!isLoggedIn) {
    return <LoginPage />;
  }

  return (
    <div className="mobile-viewport" id="mobileApp">
      {/* Screen container */}
      <div className="screen-container">
        {activeTab === 'dashboard' && <DashboardPage />}
        {activeTab === 'calendar' && <CalendarPage />}
        {activeTab === 'transactions' && <TransactionsPage />}
        {activeTab === 'wallets' && <WalletsPage />}
        {activeTab === 'ranking' && <RankingPage />}
        {activeTab === 'friends' && <FriendsPage />}
        {activeTab === 'settings' && <SettingsPage />}
      </div>

      {/* Bottom Nav */}
      <BottomNav />

      {/* Modals & Sheets */}
      <AddTransactionModal />
      <TransferModal />
      <AIAssistantModal />
      <AIProposalModal />
      <AIInsightsModal />
      <NewGoalModal />
      <FriendQrModal />

      {/* Global Toast */}
      <Toast />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <FinanceProvider>
        <MainAppShell />
      </FinanceProvider>
    </AuthProvider>
  );
}
