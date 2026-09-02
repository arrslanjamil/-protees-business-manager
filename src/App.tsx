import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { DataProvider } from '@/context/DataContext'
import { ToastProvider } from '@/context/ToastContext'
import { AppLayout } from '@/components/layout/AppLayout'
import { DashboardPage } from '@/pages/DashboardPage'
import { EmployeesPage } from '@/pages/EmployeesPage'
import { SalaryPage } from '@/pages/SalaryPage'
import { ProteesUnitPage } from '@/pages/ProteesUnitPage'
import { UnitExpensesPage } from '@/pages/UnitExpensesPage'
import { AdvancesPage } from '@/pages/AdvancesPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { UnitsPage } from '@/pages/UnitsPage'
import { KhadimHussainPage } from '@/pages/KhadimHussainPage'

export default function App() {
  return (
    <ToastProvider>
      <DataProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/protees-unit" element={<ProteesUnitPage />} />
              <Route path="/unit-expenses" element={<UnitExpensesPage />} />
              <Route path="/employees" element={<EmployeesPage />} />
              <Route path="/salary" element={<SalaryPage />} />
              <Route path="/advances" element={<AdvancesPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/khadim-hussain" element={<KhadimHussainPage />} />
              <Route path="/units" element={<UnitsPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </DataProvider>
    </ToastProvider>
  )
}
