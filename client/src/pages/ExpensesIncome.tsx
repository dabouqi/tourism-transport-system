import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { trpc } from '@/lib/trpc';
import { Plus, Search, Trash2 } from 'lucide-react';

export default function ExpensesIncome() {
  const [activeTab, setActiveTab] = useState<'expenses' | 'income' | 'other'>('expenses');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState({
    transactionType: 'expense',
    type: '',
    amount: '',
    clientId: '',
    driverId: '',
    description: '',
    transactionDate: new Date().toISOString().split('T')[0],
  });

  // Get transactions from the transactions router
  const { data: transactions = [] } = trpc.transactions.getAll.useQuery() ?? { data: [] };

  // Get other transactions
  const { data: otherTransactions = [] } = trpc.otherTransactions.getAll.useQuery() ?? { data: [] };
  const { data: otherIncome = [] } = trpc.otherTransactions.getIncome.useQuery() ?? { data: [] };
  const { data: otherExpenses = [] } = trpc.otherTransactions.getExpenses.useQuery() ?? { data: [] };

  // Get clients for dropdown
  const { data: clients = [] } = trpc.clients.getAll.useQuery() ?? { data: [] };

  // Mutations
  const createOtherTransaction = trpc.otherTransactions.create.useMutation();
  const deleteOtherTransaction = trpc.otherTransactions.delete.useMutation();

  const utils = trpc.useUtils();

  // Filter transactions by type
  const expenseTransactions = transactions.filter((t) => t.type === 'expense');
  const incomeTransactions = transactions.filter((t) => t.type === 'income');

  // Calculate totals
  const totalExpense = expenseTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalIncome = incomeTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalOtherIncome = otherIncome.reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);
  const totalOtherExpenses = otherExpenses.reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);

  const handleAddTransaction = async () => {
    // Better validation for amount
    const numAmount = parseFloat(formData.amount);
    if (!formData.amount || isNaN(numAmount) || numAmount <= 0) {
      alert('يرجى إدخال مبلغ صحيح');
      return;
    }

    // Use transaction type as default type if not provided
    const transactionTypeLabel = formData.transactionType === 'income' ? 'دخل' : 'مصروفة';
    const typeToUse = formData.type || transactionTypeLabel;

    console.log('[handleAddTransaction] Sending data:', {
      transactionType: formData.transactionType,
      type: typeToUse,
      amount: formData.amount,
      clientId: formData.clientId,
      driverId: formData.driverId,
      description: formData.description,
      transactionDate: formData.transactionDate,
    });

    try {
      await createOtherTransaction.mutateAsync({
        transactionType: formData.transactionType as 'income' | 'expense',
        type: typeToUse,
        amount: formData.amount,
        clientId: formData.clientId ? parseInt(formData.clientId) : undefined,
        driverId: formData.driverId ? parseInt(formData.driverId) : undefined,
        description: formData.description,
        transactionDate: new Date(formData.transactionDate),
      });

      // Reset form
      setFormData({
        transactionType: 'expense',
        type: '',
        amount: '',
        clientId: '',
        driverId: '',
        description: '',
        transactionDate: new Date().toISOString().split('T')[0],
      });
      setIsAddOpen(false);

      // Invalidate queries
      await utils.otherTransactions.getAll.invalidate();
      await utils.otherTransactions.getIncome.invalidate();
      await utils.otherTransactions.getExpenses.invalidate();
    } catch (error) {
      console.error('Error creating transaction:', error);
      alert('حدث خطأ في إنشاء المعاملة');
    }
  };

  const handleDeleteTransaction = async (id: number) => {
    if (!confirm('هل تريد حذف هذه المعاملة؟')) return;

    try {
      await deleteOtherTransaction.mutateAsync(id);

      // Invalidate queries
      await utils.otherTransactions.getAll.invalidate();
      await utils.otherTransactions.getIncome.invalidate();
      await utils.otherTransactions.getExpenses.invalidate();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('حدث خطأ في حذف المعاملة');
    }
  };

  const getClientName = (clientId?: number) => {
    if (!clientId) return '-';
    const client = clients.find((c) => c.id === clientId);
    return client?.name || '-';
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('ar-JO');
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">المصاريف والدخل</h1>
          <p className="text-gray-500 mt-2">إدارة المصاريف والدخل</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              إضافة معاملة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>إضافة معاملة جديدة</DialogTitle>
              <DialogDescription>أدخل تفاصيل المعاملة الجديدة</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Transaction Type */}
              <div>
                <label className="block text-sm font-medium mb-1">نوع المعاملة</label>
                <Select
                  value={formData.transactionType}
                  onValueChange={(value) => setFormData({ ...formData, transactionType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">مصروفة</SelectItem>
                    <SelectItem value="income">دخل</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium mb-1">نوع {formData.transactionType === 'income' ? 'الدخل' : 'المصروفة'} (اختياري)</label>
                <Input
                  placeholder={`مثلاً: ${formData.transactionType === 'income' ? 'مخالفة، غرامة' : 'رسوم، صيانة'}`}
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium mb-1">المبلغ (د.ا)</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  step="0.01"
                />
              </div>

              {/* Client (for income) */}
              {formData.transactionType === 'income' && (
                <div>
                  <label className="block text-sm font-medium mb-1">العميل</label>
                  <Select
                    value={formData.clientId}
                    onValueChange={(value) => setFormData({ ...formData, clientId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر عميل" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id.toString()}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Date */}
              <div>
                <label className="block text-sm font-medium mb-1">التاريخ</label>
                <Input
                  type="date"
                  value={formData.transactionDate}
                  onChange={(e) => setFormData({ ...formData, transactionDate: e.target.value })}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-1">ملاحظات (اختياري)</label>
                <Input
                  placeholder="ملاحظات إضافية"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsAddOpen(false)}
                  className="flex-1"
                >
                  إلغاء
                </Button>
                <Button
                  onClick={handleAddTransaction}
                  disabled={createOtherTransaction.isPending}
                  className="flex-1"
                >
                  {createOtherTransaction.isPending ? 'جاري الإضافة...' : 'إضافة'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('expenses')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'expenses'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          المصاريف
        </button>
        <button
          onClick={() => setActiveTab('income')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'income'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          الدخل من الحجوزات
        </button>
        <button
          onClick={() => setActiveTab('other')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'other'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          دخل/مصاريف أخرى
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {activeTab === 'expenses' && (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">إجمالي المصاريف</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">د.ا {totalExpense.toFixed(2)}</div>
                <p className="text-xs text-gray-500 mt-1">{expenseTransactions.length} معاملة</p>
              </CardContent>
            </Card>
          </>
        )}

        {activeTab === 'income' && (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">إجمالي الدخل</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">د.ا {totalIncome.toFixed(2)}</div>
                <p className="text-xs text-gray-500 mt-1">{incomeTransactions.length} معاملة</p>
              </CardContent>
            </Card>
          </>
        )}

        {activeTab === 'other' && (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">إجمالي الدخل الإضافي</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">د.ا {totalOtherIncome.toFixed(2)}</div>
                <p className="text-xs text-gray-500 mt-1">{otherIncome.length} معاملة</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">إجمالي المصاريف الإضافية</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">د.ا {totalOtherExpenses.toFixed(2)}</div>
                <p className="text-xs text-gray-500 mt-1">{otherExpenses.length} معاملة</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">الرصيد الصافي</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${totalOtherIncome - totalOtherExpenses >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  د.ا {(totalOtherIncome - totalOtherExpenses).toFixed(2)}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <Input
            placeholder="ابحث عن معاملة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {activeTab === 'expenses' && 'قائمة المصاريف'}
            {activeTab === 'income' && 'قائمة الدخل من الحجوزات'}
            {activeTab === 'other' && 'قائمة الدخل/المصاريف الأخرى'}
          </CardTitle>
          <CardDescription>عرض المعاملات مرتبة من الأحدث إلى الأقدم</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-right py-3 px-4 font-semibold">التاريخ</th>
                  <th className="text-right py-3 px-4 font-semibold">النوع</th>
                  <th className="text-right py-3 px-4 font-semibold">الوصف</th>
                  {activeTab === 'other' && <th className="text-right py-3 px-4 font-semibold">العميل</th>}
                  <th className="text-right py-3 px-4 font-semibold">المبلغ (د.ا)</th>
                  {activeTab === 'other' && <th className="text-center py-3 px-4 font-semibold">الإجراءات</th>}
                </tr>
              </thead>
              <tbody>
                {activeTab !== 'other' && (
                  <>
                    {(activeTab === 'expenses' ? expenseTransactions : incomeTransactions).length > 0 ? (
                      (activeTab === 'expenses' ? expenseTransactions : incomeTransactions)
                        .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
                        .map((transaction, index) => (
                          <tr key={index} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4">{transaction.date}</td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  transaction.type === 'income'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {transaction.type === 'income' ? 'دخل' : 'مصروفة'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm">{transaction.description || transaction.category || '-'}</td>
                            <td className={`py-3 px-4 font-semibold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                              {transaction.type === 'income' ? '+' : '-'} {transaction.amount?.toFixed(2)}
                            </td>
                          </tr>
                        ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-gray-500">
                          لا توجد معاملات
                        </td>
                      </tr>
                    )}
                  </>
                )}

                {activeTab === 'other' && (
                  <>
                    {otherTransactions.length > 0 ? (
                      otherTransactions
                        .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime())
                        .map((transaction) => (
                          <tr key={transaction.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4">{formatDate(transaction.transactionDate)}</td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  transaction.transactionType === 'income'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {transaction.type}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm">{transaction.description || '-'}</td>
                            <td className="py-3 px-4">{getClientName(transaction.clientId)}</td>
                            <td className={`py-3 px-4 font-semibold ${transaction.transactionType === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                              {transaction.transactionType === 'income' ? '+' : '-'} {parseFloat(transaction.amount).toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => handleDeleteTransaction(transaction.id)}
                                disabled={deleteOtherTransaction.isPending}
                                className="text-red-600 hover:text-red-800 disabled:opacity-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-500">
                          لا توجد معاملات
                        </td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
