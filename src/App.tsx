import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { DataProvider } from '@/context/DataContext'
import { AppLayout } from '@/components/layout/AppLayout'
import { DashboardPage } from '@/pages/DashboardPage'
import { EmployeesPage } from '@/pages/EmployeesPage'
import { SalaryPage } from '@/pages/SalaryPage'
import { AdvancesPage } from '@/pages/AdvancesPage'
import { UnitsPage } from '@/pages/UnitsPage'
import { ExpensesPage } from '@/pages/ExpensesPage'

export default function App() {
  return (
    <DataProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/employees" element={<EmployeesPage />} />
            <Route path="/salary" element={<SalaryPage />} />
            <Route path="/advances" element={<AdvancesPage />} />
            <Route path="/units" element={<UnitsPage />} />
            <Route path="/expenses" element={<ExpensesPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </DataProvider>
  )
}
