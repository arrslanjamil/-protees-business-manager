import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Scissors, ShieldCheck, ShoppingBag, Sparkles, Store } from 'lucide-react'
import { DataProvider } from '@/context/DataContext'
import { CollectionsProvider } from '@/context/CollectionsContext'
import { MasterDataProvider } from '@/context/MasterDataContext'
import { AttendanceProvider } from '@/context/AttendanceContext'
import { ToastProvider } from '@/context/ToastContext'
import { AuthProvider } from '@/context/AuthContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/pages/LoginPage'
import { ActivityLogPage } from '@/pages/ActivityLogPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { EmployeesPage } from '@/pages/EmployeesPage'
import { SalaryPage } from '@/pages/SalaryPage'
import { ProteesUnitPage } from '@/pages/ProteesUnitPage'
import { UnitExpensesPage } from '@/pages/UnitExpensesPage'
import { AdvancesPage } from '@/pages/AdvancesPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { ZakatPage } from '@/pages/ZakatPage'
import { UnitsPage } from '@/pages/UnitsPage'
import { CollectionsPage } from '@/pages/CollectionsPage'
import { CreditorsPage } from '@/pages/CreditorsPage'
import { CreditorDetailPage } from '@/pages/CreditorDetailPage'
import { MasterDataPage } from '@/pages/MasterDataPage'
import { AttendanceDashboardPage } from '@/pages/AttendanceDashboardPage'
import { AttendancePage } from '@/pages/AttendancePage'
import { AttendanceSettingsPage } from '@/pages/AttendanceSettingsPage'
import { FactoryAuthProvider } from '@/context/FactoryAuthContext'
import { FactoryRoot } from '@/pages/factory/FactoryRoot'
import { FactoryDashboardPage } from '@/pages/factory/FactoryDashboardPage'
import { FactoryProductsPage } from '@/pages/factory/FactoryProductsPage'
import { FactoryProductDetailPage } from '@/pages/factory/FactoryProductDetailPage'
import { FactoryProductionPlansPage } from '@/pages/factory/FactoryProductionPlansPage'
import { FactoryTeamMembersPage } from '@/pages/factory/FactoryTeamMembersPage'
import { FactoryComingSoonPage } from '@/pages/factory/FactoryComingSoonPage'

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <MasterDataProvider>
            <CollectionsProvider>
              <AttendanceProvider>
                <DataProvider>
                  <BrowserRouter>
                    <Routes>
                      <Route path="/login" element={<LoginPage />} />

                      <Route element={<ProtectedRoute />}>
                        <Route element={<AppLayout />}>
                          <Route path="/" element={<DashboardPage />} />
                          <Route path="/protees-unit" element={<ProteesUnitPage />} />
                          <Route path="/unit-expenses" element={<UnitExpensesPage />} />
                          <Route path="/employees" element={<EmployeesPage />} />
                          <Route path="/salary" element={<SalaryPage />} />
                          <Route path="/advances" element={<AdvancesPage />} />
                          <Route path="/zakat" element={<ZakatPage />} />
                          <Route path="/collections" element={<CollectionsPage />} />
                          <Route path="/creditors" element={<CreditorsPage />} />
                          <Route path="/creditors/:id" element={<CreditorDetailPage />} />
                          <Route path="/settings" element={<MasterDataPage />} />
                          <Route path="/attendance" element={<AttendanceDashboardPage />} />
                          <Route path="/attendance/records" element={<AttendancePage />} />
                          <Route path="/attendance/settings" element={<AttendanceSettingsPage />} />
                          <Route path="/reports" element={<ReportsPage />} />
                          <Route path="/units" element={<UnitsPage />} />
                          <Route path="/activity-log" element={<ActivityLogPage />} />
                        </Route>
                      </Route>

                      <Route
                        path="/factory/*"
                        element={
                          <FactoryAuthProvider>
                            <FactoryRoot />
                          </FactoryAuthProvider>
                        }
                      >
                        <Route index element={<FactoryDashboardPage />} />
                        <Route path="products" element={<FactoryProductsPage />} />
                        <Route path="products/:id" element={<FactoryProductDetailPage />} />
                        <Route path="plans" element={<FactoryProductionPlansPage />} />
                        <Route path="team" element={<FactoryTeamMembersPage />} />
                        <Route path="digital-print" element={<FactoryComingSoonPage icon={Sparkles} title="Digital Print" phase="Phase 2" />} />
                        <Route path="cutting" element={<FactoryComingSoonPage icon={Scissors} title="Cutting" phase="Phase 2" />} />
                        <Route path="stitching" element={<FactoryComingSoonPage icon={ShoppingBag} title="Stitching" phase="Phase 3" />} />
                        <Route path="quality" element={<FactoryComingSoonPage icon={ShieldCheck} title="Quality" phase="Phase 4" />} />
                        <Route path="store" element={<FactoryComingSoonPage icon={Store} title="Store" phase="Phase 4" />} />
                        <Route path="shopify" element={<FactoryComingSoonPage icon={ShoppingBag} title="Shopify" phase="Phase 5" />} />
                      </Route>
                    </Routes>
                  </BrowserRouter>
                </DataProvider>
              </AttendanceProvider>
            </CollectionsProvider>
          </MasterDataProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}
