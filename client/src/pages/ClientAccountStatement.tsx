import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Printer, Download, DollarSign, CreditCard, Wallet } from "lucide-react";

export default function ClientAccountStatement() {
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const clients = trpc.clients.list.useQuery();
  const accountStatement = trpc.clients.getAccountStatement.useQuery(
    {
      clientId: parseInt(selectedClientId),
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    },
    { enabled: !!selectedClientId }
  );

  const selectedClient = clients.data?.find(
    (c: any) => c.id === parseInt(selectedClientId)
  );

  // حساب الإحصائيات
  const statistics = useMemo(() => {
    if (!accountStatement.data || accountStatement.data.length === 0) {
      return {
        totalIncome: 0,
        totalPayments: 0,
        balance: 0
      };
    }

    const totalIncome = accountStatement.data
      .filter((t: any) => t.type === 'income')
      .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);

    const totalPayments = accountStatement.data
      .filter((t: any) => t.type === 'payment')
      .reduce((sum: number, t: any) => sum + Math.abs(parseFloat(t.amount)), 0);

    const balance = totalIncome - totalPayments;

    return { totalIncome, totalPayments, balance };
  }, [accountStatement.data]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "JOD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US");
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">حركة حساب العميل</h1>
        <div className="flex gap-2">
          <Button onClick={() => window.print()} variant="outline">
            <Printer className="ml-2 h-4 w-4" />
            طباعة
          </Button>
          <Button variant="outline">
            <Download className="ml-2 h-4 w-4" />
            تصدير
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>الفلاتر</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">اختر العميل</label>
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger>
                <SelectValue placeholder="اختر عميل" />
              </SelectTrigger>
              <SelectContent>
                {clients.data?.map((client: any) => (
                  <SelectItem key={client.id} value={client.id.toString()}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">من التاريخ</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">إلى التاريخ</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedClient && (
        <Card>
          <CardHeader>
            <CardTitle>معلومات العميل</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">اسم العميل</p>
                <p className="font-semibold">{selectedClient.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">النوع</p>
                <p className="font-semibold">
                  {selectedClient.type === "individual" ? "فرد" : "شركة"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">الهاتف</p>
                <p className="font-semibold">{selectedClient.phone || "-"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* البوكسات الإحصائية الملونة */}
      {selectedClient && accountStatement.data && accountStatement.data.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* إجمالي الدخل */}
          <Card className="border-l-4 border-l-green-500 bg-gradient-to-br from-green-50 to-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">إجمالي الدخل</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(statistics.totalIncome)}
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* إجمالي الدفعات */}
          <Card className="border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50 to-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">إجمالي الدفعات</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(statistics.totalPayments)}
                  </p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <CreditCard className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* الرصيد */}
          <Card className={`border-l-4 ${statistics.balance >= 0 ? 'border-l-orange-500' : 'border-l-red-500'} bg-gradient-to-br ${statistics.balance >= 0 ? 'from-orange-50' : 'from-red-50'} to-white`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">الرصيد</p>
                  <p className={`text-2xl font-bold ${statistics.balance >= 0 ? 'text-orange-600' : 'text-red-600'}`}>
                    {formatCurrency(statistics.balance)}
                  </p>
                </div>
                <div className={`${statistics.balance >= 0 ? 'bg-orange-100' : 'bg-red-100'} p-3 rounded-full`}>
                  <Wallet className={`h-6 w-6 ${statistics.balance >= 0 ? 'text-orange-600' : 'text-red-600'}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedClient && accountStatement.data && (
        <Card>
          <CardHeader>
            <CardTitle>حركات الحساب</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-right p-3 font-semibold">التاريخ</th>
                    <th className="text-right p-3 font-semibold">النوع</th>
                    <th className="text-right p-3 font-semibold">الوصف</th>
                    <th className="text-right p-3 font-semibold">المبلغ</th>
                    <th className="text-right p-3 font-semibold">الحالة</th>
                    <th className="text-right p-3 font-semibold">المرجع</th>
                  </tr>
                </thead>
                <tbody>
                  {accountStatement.isLoading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8">
                        جاري التحميل...
                      </td>
                    </tr>
                  ) : accountStatement.data && accountStatement.data.length > 0 ? (
                    accountStatement.data.map((transaction: any, index: number) => (
                      <tr key={transaction.id} className={`border-b hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                        <td className="p-3">{formatDate(transaction.date)}</td>
                        <td className="p-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            transaction.type === 'income' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {transaction.type === 'income' ? 'دخل' : 'دفع'}
                          </span>
                        </td>
                        <td className="p-3">{transaction.description}</td>
                        <td className={`p-3 font-semibold ${
                          transaction.type === 'income' ? 'text-green-600' : 'text-blue-600'
                        }`}>
                          {formatCurrency(transaction.amount)}
                        </td>
                        <td className="p-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            transaction.status === 'confirmed' 
                              ? 'bg-green-100 text-green-800' 
                              : transaction.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {transaction.status === 'confirmed' ? 'مؤكد' : transaction.status === 'pending' ? 'قيد الانتظار' : transaction.status}
                          </span>
                        </td>
                        <td className="p-3 text-gray-600">{transaction.reference || "-"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-500">
                        لا توجد حركات لهذا العميل
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
