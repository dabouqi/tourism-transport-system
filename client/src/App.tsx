import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import DashboardLayout from "@/components/DashboardLayout";
import Dashboard from "@/pages/Dashboard";
import Bookings from "@/pages/Bookings";
import Fleet from "@/pages/Fleet";
import Drivers from "@/pages/Drivers";
import Maintenance from "@/pages/Maintenance";
import Tracking from "@/pages/Tracking";
import Alerts from "@/pages/Alerts";
import Reports from "@/pages/Reports";
import Finances from "@/pages/Finances";
import FinancialReports from "@/pages/FinancialReports";
import AdvancedFinances from "@/pages/AdvancedFinances";
import ExternalPartners from "@/pages/ExternalPartners";
import Clients from "@/pages/Clients";
import Receivables from "@/pages/Receivables";
import Invoices from "@/pages/Invoices";
import CompletedBookingsReport from "@/pages/CompletedBookingsReport";
import BookingsArchive from "@/pages/BookingsArchive";
import ClientAccountStatement from "@/pages/ClientAccountStatement";
import CustomerTransactions from "@/pages/CustomerTransactions";
import DataManagement from "@/pages/DataManagement";
import ReceivablesReport from "@/pages/ReceivablesReport";
import OverdueReceivables from "@/pages/OverdueReceivables";
import ExpenseCategories from "@/pages/ExpenseCategories";
import ExpenseCategoryDetail from "@/pages/ExpenseCategoryDetail";
import PendingMessages from "@/pages/PendingMessages";
import WhatsAppSettings from "@/pages/WhatsAppSettings";
import MessageCenter from "@/pages/MessageCenter";
import ComprehensiveFinancialDashboard from "@/pages/ComprehensiveFinancialDashboard";
import WhatsAppManager from "@/pages/WhatsAppManager";
import SubmitExpense from "@/pages/SubmitExpense";
import ManageExpenses from "@/pages/ManageExpenses";
import ExpensePayment from "@/pages/ExpensePayment";
import ExpensesIncome from "@/pages/ExpensesIncome";
import CancelledOrders from "@/pages/CancelledOrders";
// import CompanyEmailManagement from "@/pages/CompanyEmailManagement";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

function Router() {
  return (
    <Switch>
      <Route path={"/dashboard"}>
        {() => (
          <DashboardLayout>
            <Dashboard />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/bookings"}>
        {() => (
          <DashboardLayout>
            <Bookings />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/fleet"}>
        {() => (
          <DashboardLayout>
            <Fleet />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/drivers"}>
        {() => (
          <DashboardLayout>
            <Drivers />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/maintenance"}>
        {() => (
          <DashboardLayout>
            <Maintenance />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/tracking"}>
        {() => (
          <DashboardLayout>
            <Tracking />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/alerts"}>
        {() => (
          <DashboardLayout>
            <Alerts />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/reports"}>
        {() => (
          <DashboardLayout>
            <FinancialReports />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/finances"}>
        {() => (
          <DashboardLayout>
            <Finances />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/advanced-finances"}>
        {() => (
          <DashboardLayout>
            <AdvancedFinances />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/clients"}>
        {() => (
          <DashboardLayout>
            <Clients />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/receivables"}>
        {() => (
          <DashboardLayout>
            <Receivables />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/invoices"}>
        {() => (
          <DashboardLayout>
            <Invoices />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/client-account-statement"}>
        {() => (
          <DashboardLayout>
            <ClientAccountStatement />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/"}>
        {() => (
          <DashboardLayout>
            <Dashboard />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/completed-bookings-report"}>
        {() => (
          <DashboardLayout>
            <CompletedBookingsReport />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/bookings-archive"}>
        {() => (
          <DashboardLayout>
            <BookingsArchive />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/customer-transactions/:clientId"}>
        {() => (
          <DashboardLayout>
            <CustomerTransactions />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/data-management"}>
        {() => (
          <DashboardLayout>
            <DataManagement />
          </DashboardLayout>
        )}
      </Route>
      {/* <Route path={"/company-emails"}>
        {() => (
          <DashboardLayout>
            <CompanyEmailManagement />
          </DashboardLayout>
        )}
      </Route> */}
      <Route path={"/receivables-report"}>
        {() => (
          <DashboardLayout>
            <ReceivablesReport />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/overdue-receivables"}>
        {() => (
          <DashboardLayout>
            <OverdueReceivables />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/external-partners"}>
        {() => (
          <DashboardLayout>
            <ExternalPartners />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/expense-categories/:id"}>
        {() => (
          <DashboardLayout>
            <ExpenseCategoryDetail />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/expense-categories"}>
        {() => (
          <DashboardLayout>
            <ExpenseCategories />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/pending-messages"}>
        {() => (
          <DashboardLayout>
            <PendingMessages />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/whatsapp-settings"}>
        {() => (
          <DashboardLayout>
            <WhatsAppSettings />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/message-center"}>
        {() => (
          <DashboardLayout>
            <MessageCenter />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/comprehensive-financial-dashboard"}>
        {() => (
          <DashboardLayout>
            <ComprehensiveFinancialDashboard />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/whatsapp-manager"}>
        {() => (
          <DashboardLayout>
            <WhatsAppManager />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/submit-expense"}>
        {() => (
          <DashboardLayout>
            <SubmitExpense />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/manage-expenses"}>
        {() => (
          <DashboardLayout>
            <ManageExpenses />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/expense-payment"}>
        {() => (
          <DashboardLayout>
            <ExpensePayment />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/expenses-income"}>
        {() => (
          <DashboardLayout>
            <ExpensesIncome />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/cancelled-orders"}>
        {() => (
          <DashboardLayout>
            <CancelledOrders />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
