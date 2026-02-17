import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Plus, Trash2, Edit2 } from "lucide-react";

export default function ExpenseCategories() {
  const [, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#ef4444",
    icon: "TrendingDown",
  });

  // Fetch categories
  const { data: categories = [], isLoading, refetch } = trpc.expenseCategories.list.useQuery();

  // Seed mutation
  const seedMutation = trpc.expenseCategories.seed.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("تم تحميل الفئات المحددة مسبقاً");
    },
  });

  // Seed categories on first load
  useEffect(() => {
    if (categories.length === 0 && !seedMutation.isPending) {
      seedMutation.mutate();
    }
  }, [categories.length, seedMutation]);

  // Create/Update mutation
  const createMutation = trpc.expenseCategories.create.useMutation({
    onSuccess: () => {
      refetch();
      setIsOpen(false);
      setFormData({ name: "", description: "", color: "#ef4444", icon: "TrendingDown" });
      setEditingId(null);
      toast.success(editingId ? "تم تحديث الفئة بنجاح" : "تم إنشاء فئة جديدة");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = trpc.expenseCategories.update.useMutation({
    onSuccess: () => {
      refetch();
      setIsOpen(false);
      setFormData({ name: "", description: "", color: "#ef4444", icon: "TrendingDown" });
      setEditingId(null);
      toast.success("تم تحديث الفئة بنجاح");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = trpc.expenseCategories.delete.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("تم حذف الفئة بنجاح");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("يجب إدخال اسم الفئة");
      return;
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  }

  const handleEdit = (category: any) => {
    setEditingId(category.id);
    setFormData({
      name: category.name,
      description: category.description || "",
      color: category.color || "#ef4444",
      icon: category.icon || "TrendingDown",
    });
    setIsOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("هل أنت متأكد من حذف هذه الفئة؟")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleViewDetails = (categoryId: number) => {
    setLocation(`/expense-categories/${categoryId}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">فئات المصاريف</h1>
          <p className="text-muted-foreground mt-2">إدارة فئات المصاريف والنفقات</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingId(null);
                setFormData({ name: "", description: "", color: "#ef4444", icon: "TrendingDown" });
              }}
            >
              <Plus className="w-4 h-4 ml-2" />
              فئة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "تعديل الفئة" : "إنشاء فئة جديدة"}</DialogTitle>
              <DialogDescription>
                {editingId ? "قم بتعديل بيانات الفئة" : "أضف فئة مصروف جديدة"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">اسم الفئة</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="مثال: بنزين"
                />
              </div>
              <div>
                <Label htmlFor="description">الوصف</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="وصف الفئة"
                />
              </div>
              <div>
                <Label htmlFor="color">اللون</Label>
                <div className="flex gap-2">
                  <Input
                    id="color"
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    placeholder="#ef4444"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  إلغاء
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingId ? "تحديث" : "إنشاء"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {categories.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            لا توجد فئات مصاريف. قم بإنشاء فئة جديدة للبدء.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
            <Card
              key={category.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleViewDetails(category.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-xl"
                    style={{ backgroundColor: category.color || "#ef4444" }}
                  >
                    {category.icon?.charAt(0) || "📊"}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(category);
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(category.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
                <CardTitle className="mt-2">{category.name}</CardTitle>
                {category.description && <CardDescription>{category.description}</CardDescription>}
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
