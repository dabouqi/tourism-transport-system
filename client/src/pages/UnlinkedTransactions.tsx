import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, Link2, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import toast from "react-hot-toast";

export default function UnlinkedTransactions() {
  const [selectedTransactionId, setSelectedTransactionId] = useState<number | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string>("");
  const [notes, setNotes] = useState("");

  // Queries
  const unlinkedTransactions = trpc.transactions.getUnlinked.useQuery();
  const bookings = trpc.bookings.list.useQuery();
  const linkTransaction = trpc.transactions.linkToBooking.useMutation();
  const updateNotes = trpc.transactions.updateNotes.useMutation();
  const deleteTransaction = trpc.transactions.delete.useMutation();

  const handleLinkTransaction = async () => {
    if (!selectedTransactionId || !selectedBookingId) {
      toast.error("يرجى اختيار معاملة وحجز");
      return;
    }

    try {
      await linkTransaction.mutateAsync({
        transactionId: selectedTransactionId,
        bookingId: parseInt(selectedBookingId),
        notes,
      });
      toast.success("تم ربط المعاملة بالحجز بنجاح");
      setSelectedTransactionId(null);
      setSelectedBookingId("");
      setNotes("");
      unlinkedTransactions.refetch();
    } catch (error) {
      toast.error("فشل ربط المعاملة");
    }
  };

  const handleUpdateNotes = async (transactionId: number, newNotes: string) => {
    try {
      await updateNotes.mutateAsync({
        transactionId,
        notes: newNotes,
      });
      toast.success("تم تحديث الملاحظات");
      unlinkedTransactions.refetch();
    } catch (error) {
      toast.error("فشل تحديث الملاحظات");
    }
  };

  const handleDeleteTransaction = async (transactionId: number) => {
    if (confirm("هل أنت متأكد من حذف هذه المعاملة؟")) {
      try {
        await deleteTransaction.mutateAsync({ id: transactionId });
        toast.success("تم حذف المعاملة");
        unlinkedTransactions.refetch();
      } catch (error) {
        toast.error("فشل حذف المعاملة");
      }
    }
  };

  const totalUnlinked =
    unlinkedTransactions.data?.reduce((sum, t) => sum + parseFloat(t.amount || "0"), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">المعاملات غير المرتبطة</h1>
          <p className="text-slate-600 mt-1">
            إدارة المعاملات التي لم تُربط بحجزات محددة
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-600">إجمالي المعاملات غير المرتبطة</p>
          <p className="text-3xl font-bold text-orange-600">د.ا {totalUnlinked.toFixed(2)}</p>
        </div>
      </div>

      {/* Link Transaction Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            ربط معاملة بحجز
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">اختر المعاملة</label>
              <Select
                value={selectedTransactionId?.toString() || ""}
                onValueChange={(value) => setSelectedTransactionId(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر معاملة" />
                </SelectTrigger>
                <SelectContent>
                  {unlinkedTransactions.data?.map((t) => (
                    <SelectItem key={t.id} value={t.id.toString()}>
                      {t.category} - د.ا {t.amount}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">اختر الحجز</label>
              <Select value={selectedBookingId} onValueChange={setSelectedBookingId}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر حجز" />
                </SelectTrigger>
                <SelectContent>
                  {bookings.data?.map((b) => (
                    <SelectItem key={b.id} value={b.id.toString()}>
                      {b.bookingNumber} - {b.customerName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">ملاحظات</label>
              <Input
                placeholder="أضف ملاحظات توضيحية"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <Button onClick={handleLinkTransaction} className="w-full">
            <Link2 className="w-4 h-4 mr-2" />
            ربط المعاملة
          </Button>
        </CardContent>
      </Card>

      {/* Unlinked Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة المعاملات غير المرتبطة</CardTitle>
        </CardHeader>
        <CardContent>
          {unlinkedTransactions.isLoading ? (
            <div className="text-center py-8">جاري التحميل...</div>
          ) : unlinkedTransactions.data && unlinkedTransactions.data.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>الفئة</TableHead>
                    <TableHead>المبلغ</TableHead>
                    <TableHead>الملاحظات</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unlinkedTransactions.data.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        {new Date(transaction.transactionDate).toLocaleDateString("ar-SA")}
                      </TableCell>
                      <TableCell>{transaction.category}</TableCell>
                      <TableCell className="font-semibold">
                        د.ا {parseFloat(transaction.amount || "0").toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="أضف ملاحظات"
                          defaultValue={transaction.notes || ""}
                          onBlur={(e) =>
                            handleUpdateNotes(transaction.id, e.currentTarget.value)
                          }
                          className="max-w-xs"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteTransaction(transaction.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>لا توجد معاملات غير مرتبطة</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
