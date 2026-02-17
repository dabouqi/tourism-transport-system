import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Loader2, Download, AlertCircle } from "lucide-react";
import { formatDateTime, formatDate as formatDateLib } from "@/lib/dateFormatter";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

// استخدام formatDate من المكتبة بدلاً من دالة محلية
const formatDate = formatDateLib;

export default function Reports() {
  const [reportType, setReportType] = useState<"monthly" | "client-detailed" | "client-monthly">("monthly");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);

  const clientsQuery = trpc.clients.list.useQuery();
  const splitReceivables = trpc.dashboard.getSplitReceivables.useQuery();
  const monthlyReportQuery = trpc.reports.monthlyReport.useQuery(
    { year: selectedYear, month: selectedMonth },
    { enabled: reportType === "monthly" }
  );

  const clientDetailedQuery = trpc.reports.clientDetailedReport.useQuery(
    { clientId: selectedClientId || 0 },
    { enabled: reportType === "client-detailed" && selectedClientId !== null }
  );

  const clientMonthlyQuery = trpc.reports.clientMonthlyReport.useQuery(
    { clientId: selectedClientId || 0, year: selectedYear, month: selectedMonth },
    { enabled: reportType === "client-monthly" && selectedClientId !== null }
  );

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const handleExportMonthly = () => {
    if (!monthlyReportQuery.data) return;
    const csv = "اسم العميل,إجمالي الحجوزات,إجمالي الدفعات,الفرق,عدد الحجوزات,عدد الدفعات\n" +
      monthlyReportQuery.data.map((row: any) =>
        `${row.clientName},${row.totalBookingAmount},${row.totalPaymentAmount},${row.difference},${row.bookingCount},${row.paymentCount}`
      ).join("\n");
    
    const element = document.createElement("a");
    element.setAttribute("href", "data:text/csv;charset=utf-8," + encodeURIComponent(csv));
    element.setAttribute("download", `monthly-report-${selectedYear}-${selectedMonth}.csv`);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">التقارير</h1>
        <p className="text-muted-foreground">تقارير شاملة عن الحجوزات والدفعات</p>
      </div>

      {/* Split Receivables Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm bg-purple-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-purple-700">الذمم الحالية</p>
                <p className="text-2xl font-bold text-purple-600">د.ا {(splitReceivables.data?.current ?? 0).toFixed(2)}</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-100"><AlertCircle className="w-6 h-6 text-purple-600" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-blue-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-blue-700">الذمم المستقبلية</p>
                <p className="text-2xl font-bold text-blue-600">د.ا {(splitReceivables.data?.future ?? 0).toFixed(2)}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-100"><AlertCircle className="w-6 h-6 text-blue-600" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* اختيار نوع التقرير */}
      <Card>
        <CardHeader>
          <CardTitle>اختر نوع التقرير</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Button
              variant={reportType === "monthly" ? "default" : "outline"}
              onClick={() => setReportType("monthly")}
              className="w-full"
            >
              التقرير الشهري العام
            </Button>
            <Button
              variant={reportType === "client-detailed" ? "default" : "outline"}
              onClick={() => setReportType("client-detailed")}
              className="w-full"
            >
              تقرير العميل الشامل
            </Button>
            <Button
              variant={reportType === "client-monthly" ? "default" : "outline"}
              onClick={() => setReportType("client-monthly")}
              className="w-full"
            >
              تقرير العميل الشهري
            </Button>
          </div>

          {/* خيارات الفلترة */}
          <div className="grid grid-cols-3 gap-4 pt-4">
            <div>
              <label className="text-sm font-medium">السنة</label>
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">الشهر</label>
              <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month} value={month.toString()}>
                      {new Date(2024, month - 1).toLocaleDateString("ar-SA", { month: "long" })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(reportType === "client-detailed" || reportType === "client-monthly") && (
              <div>
                <label className="text-sm font-medium">العميل</label>
                <Select
                  value={selectedClientId?.toString() || ""}
                  onValueChange={(v) => setSelectedClientId(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر عميل" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientsQuery.data?.map((client: any) => (
                      <SelectItem key={client.id} value={client.id.toString()}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* التقرير الشهري العام */}
      {reportType === "monthly" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>التقرير الشهري العام</CardTitle>
              <CardDescription>
                {new Date(selectedYear, selectedMonth - 1).toLocaleDateString("ar-SA", {
                  year: "numeric",
                  month: "long",
                })}
              </CardDescription>
            </div>
            <Button onClick={handleExportMonthly} variant="outline" size="sm">
              <Download className="w-4 h-4 ml-2" />
              تحميل
            </Button>
          </CardHeader>
          <CardContent>
            {monthlyReportQuery.isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : monthlyReportQuery.data && monthlyReportQuery.data.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>اسم العميل</TableHead>
                      <TableHead>إجمالي الحجوزات</TableHead>
                      <TableHead>إجمالي الدفعات</TableHead>
                      <TableHead>الفرق</TableHead>
                      <TableHead>عدد الحجوزات</TableHead>
                      <TableHead>عدد الدفعات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyReportQuery.data.map((row: any) => (
                      <TableRow key={row.clientId}>
                        <TableCell className="font-medium">{row.clientName}</TableCell>
                        <TableCell>{formatCurrency(row.totalBookingAmount)}</TableCell>
                        <TableCell>{formatCurrency(row.totalPaymentAmount)}</TableCell>
                        <TableCell
                          className={row.difference > 0 ? "text-red-600 font-medium" : "text-green-600 font-medium"}
                        >
                          {formatCurrency(row.difference)}
                        </TableCell>
                        <TableCell>{row.bookingCount}</TableCell>
                        <TableCell>{row.paymentCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">لا توجد بيانات</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* تقرير العميل الشامل */}
      {reportType === "client-detailed" && clientDetailedQuery.data && (
        <div className="space-y-6">
          {/* معلومات العميل */}
          <Card>
            <CardHeader>
              <CardTitle>{clientDetailedQuery.data.client.name}</CardTitle>
              <CardDescription>تقرير شامل</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">الهاتف</p>
                <p className="font-medium">{clientDetailedQuery.data.client.phone}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">البريد الإلكتروني</p>
                <p className="font-medium">{clientDetailedQuery.data.client.email || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">العنوان</p>
                <p className="font-medium">{clientDetailedQuery.data.client.address || "-"}</p>
              </div>
            </CardContent>
          </Card>

          {/* الملخص المالي */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">إجمالي الحجوزات</p>
                <p className="text-2xl font-bold">{formatCurrency(clientDetailedQuery.data.summary.totalBookingAmount)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">إجمالي الدفعات</p>
                <p className="text-2xl font-bold">{formatCurrency(clientDetailedQuery.data.summary.totalPaidAmount)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">إجمالي الذمم</p>
                <p className="text-2xl font-bold">{formatCurrency(clientDetailedQuery.data.summary.totalReceivableAmount)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">الرصيد</p>
                <p
                  className={`text-2xl font-bold ${
                    clientDetailedQuery.data.summary.balance > 0 ? "text-red-600" : "text-green-600"
                  }`}
                >
                  {formatCurrency(clientDetailedQuery.data.summary.balance)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* الحجوزات */}
          <Card>
            <CardHeader>
              <CardTitle>الحجوزات ({clientDetailedQuery.data.bookings.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {clientDetailedQuery.data.bookings.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>رقم الحجز</TableHead>
                        <TableHead>الموقع</TableHead>
                        <TableHead>التاريخ</TableHead>
                        <TableHead>السعر</TableHead>
                        <TableHead>الحالة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clientDetailedQuery.data.bookings.map((booking: any) => (
                        <TableRow key={booking.id}>
                          <TableCell>{booking.bookingNumber}</TableCell>
                          <TableCell>{booking.pickupLocation}</TableCell>
                          <TableCell>{formatDate(booking.pickupDateTime)}</TableCell>
                          <TableCell>{formatCurrency(booking.fare)}</TableCell>
                          <TableCell>{booking.status}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">لا توجد حجوزات</p>
              )}
            </CardContent>
          </Card>

          {/* الدفعات */}
          <Card>
            <CardHeader>
              <CardTitle>الدفعات ({clientDetailedQuery.data.payments.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {clientDetailedQuery.data.payments.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>المبلغ</TableHead>
                        <TableHead>طريقة الدفع</TableHead>
                        <TableHead>التاريخ</TableHead>
                        <TableHead>رقم المرجع</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clientDetailedQuery.data.payments.map((payment: any) => (
                        <TableRow key={payment.id}>
                          <TableCell>{formatCurrency(payment.amount)}</TableCell>
                          <TableCell>{payment.paymentMethod}</TableCell>
                          <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                          <TableCell>{payment.referenceNumber || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">لا توجد دفعات</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* تقرير العميل الشهري */}
      {reportType === "client-monthly" && clientMonthlyQuery.data && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{clientMonthlyQuery.data.client.name}</CardTitle>
              <CardDescription>
                {new Date(selectedYear, selectedMonth - 1).toLocaleDateString("ar-SA", {
                  year: "numeric",
                  month: "long",
                })}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الحجوزات</p>
                <p className="text-2xl font-bold">{formatCurrency(clientMonthlyQuery.data.summary.totalBookingAmount)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الدفعات</p>
                <p className="text-2xl font-bold">{formatCurrency(clientMonthlyQuery.data.summary.totalPaymentAmount)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">الفرق</p>
                <p
                  className={`text-2xl font-bold ${
                    clientMonthlyQuery.data.summary.difference > 0 ? "text-red-600" : "text-green-600"
                  }`}
                >
                  {formatCurrency(clientMonthlyQuery.data.summary.difference)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">عدد الحجوزات</p>
                <p className="text-2xl font-bold">{clientMonthlyQuery.data.summary.bookingCount}</p>
              </div>
            </CardContent>
          </Card>

          {/* الحجوزات الشهرية */}
          <Card>
            <CardHeader>
              <CardTitle>الحجوزات</CardTitle>
            </CardHeader>
            <CardContent>
              {clientMonthlyQuery.data.bookings.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>رقم الحجز</TableHead>
                        <TableHead>الموقع</TableHead>
                        <TableHead>التاريخ</TableHead>
                        <TableHead>السعر</TableHead>
                        <TableHead>الحالة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clientMonthlyQuery.data.bookings.map((booking: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell>{booking.bookingNumber}</TableCell>
                          <TableCell>{booking.pickupLocation}</TableCell>
                          <TableCell>{formatDate(booking.pickupDateTime)}</TableCell>
                          <TableCell>{formatCurrency(booking.fare)}</TableCell>
                          <TableCell>{booking.status}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">لا توجد حجوزات في هذا الشهر</p>
              )}
            </CardContent>
          </Card>

          {/* الدفعات الشهرية */}
          <Card>
            <CardHeader>
              <CardTitle>الدفعات</CardTitle>
            </CardHeader>
            <CardContent>
              {clientMonthlyQuery.data.payments.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">المبلغ</TableHead>
                        <TableHead className="text-right">طريقة الدفع</TableHead>
                        <TableHead className="text-right">التاريخ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clientMonthlyQuery.data.payments.map((payment: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell>{formatCurrency(payment.amount)}</TableCell>
                          <TableCell>{payment.paymentMethod}</TableCell>
                          <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">لا توجد دفعات في هذا الشهر</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
