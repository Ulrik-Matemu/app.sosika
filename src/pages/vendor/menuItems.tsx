import React, { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerClose } from "../../components/ui/drawer";
import { Skeleton } from "../../components/ui/skeleton";
import { PlusIcon, TrashIcon, ImageIcon, DollarSignIcon, EyeIcon, EyeOffIcon } from "lucide-react";
import { Header } from "../../components/my-components/header";
import Navbar from "../../components/my-components/navbar";

type MenuItem = {
    id: string;
    vendor_id?: string;
    name: string;
    description?: string | null;
    category?: string | null;
    price: number;
    image_url?: string | null;
    is_available?: boolean;
    created_at?: string;
    updated_at?: string;
};

type Pagination = {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    itemsPerPage: number;
};

const API_BASE = 'https://sosika-backend.onrender.com/api';

function formatCurrency(n: number) {
    try {
        return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n);
    } catch {
        return `$${n.toFixed(2)}`;
    }
}

export default function VendorCatalogPage() {
    const [items, setItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Pagination state
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [pagination, setPagination] = useState<Pagination | null>(null);

    // Form state for add / edit
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

    // Small optimistic update lock to avoid double actions
    const [actionLock, setActionLock] = useState(false);
    const vendorId = localStorage.getItem("vendorId");

    // Fetch vendor items paginated
    const fetchItems = async (p = page, l = limit) => {
        setLoading(true);
        setError(null);
        try {
            const url = vendorId
                ? `${API_BASE}/menuItems/${encodeURIComponent(vendorId)}?page=${p}&limit=${l}`
                : `${API_BASE}/menuItems?page=${p}&limit=${l}`;

            const res = await fetch(url, { credentials: "include" });
            if (!res.ok) {
                const txt = await res.text();
                throw new Error(`Failed to fetch: ${res.status} ${txt}`);
            }

            const json = await res.json();

            if (Array.isArray(json)) {
                setItems(json as MenuItem[]);
                setPagination(null);
            } else if (json.data) {
                setItems(json.data as MenuItem[]);
                setPagination(json.pagination as Pagination);
            } else if (json.menuItems) {
                setItems(json.menuItems as MenuItem[]);
                setPagination(null);
            } else {
                setItems([]);
                setPagination(null);
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Unknown error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
    }, [page, limit, vendorId]);

    // Add or update item via form submission
    const submitItem = async (form: FormData, isEdit = false) => {
        setActionLock(true);
        try {
            const url = isEdit && editingItem ? `${API_BASE}/menuItems/${editingItem.id}` : `${API_BASE}/menuItems`;
            const res = await fetch(url, {
                method: isEdit ? "PUT" : "POST",
                body: form,
                credentials: "include",
            });

            const json = await res.json();
            if (!res.ok) throw new Error(json?.error || json?.message || "Failed to save item");

            if (isEdit && json.menuItem) {
                setItems((s) => s.map((it) => (it.id === json.menuItem.id ? json.menuItem : it)));
                setEditingItem(null);
            } else if (json.menuItem) {
                setItems((s) => [json.menuItem, ...s]);
            } else {
                fetchItems(1, limit);
            }
            setIsDrawerOpen(false);
            setError(null);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to submit item");
        } finally {
            setActionLock(false);
        }
    };

    const removeItem = async (id: string) => {
        if (!confirm("Delete this item? This action cannot be undone.")) return;
        try {
            setActionLock(true);
            const res = await fetch(`${API_BASE}/menuItems/item/${encodeURIComponent(id)}`, {
                method: "DELETE",
                credentials: "include",
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.message || "Failed to delete");
            setItems((s) => s.filter((it) => it.id !== id));
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to delete");
        } finally {
            setActionLock(false);
        }
    };

    const toggleAvailability = async (id: string, value: boolean) => {
        setActionLock(true);
        try {
            const res = await fetch(`${API_BASE}/menuItems/${encodeURIComponent(id)}/status`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: value }),
                credentials: "include",
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.message || "Failed to update status");
            setItems((s) => s.map((it) => (it.id === id ? json.menuItem : it)));
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to update status");
        } finally {
            setActionLock(false);
        }
    };

    const updatePrice = async (id: string, price: number) => {
        setActionLock(true);
        try {
            const res = await fetch(`${API_BASE}/menuItems/${encodeURIComponent(id)}/price`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ price }),
                credentials: "include",
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.message || "Failed to update price");
            setItems((s) => s.map((it) => (it.id === id ? json.menuItem : it)));
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to update price");
        } finally {
            setActionLock(false);
        }
    };



    const startAdd = () => {
        setEditingItem(null);
        setIsDrawerOpen(true);
    };



    // Enhanced form component using shadcn components
    const ItemForm: React.FC = () => {
        const [name, setName] = useState(editingItem?.name || "");
        const [description, setDescription] = useState(editingItem?.description || "");
        const [category, setCategory] = useState(editingItem?.category || "");
        const [priceInput, setPriceInput] = useState(editingItem ? String(editingItem.price) : "");
        const [file, setFile] = useState<File | null>(null);

        useEffect(() => {
            setName(editingItem?.name || "");
            setDescription(editingItem?.description || "");
            setCategory(editingItem?.category || "");
            setPriceInput(editingItem ? String(editingItem.price) : "");
            setFile(null);
        }, [editingItem]);

        const handleSubmit = async (e: React.FormEvent) => {
            e.preventDefault();
            if (!name.trim()) return setError("Name is required");
            const price = parseFloat(priceInput as any);
            if (isNaN(price) || price < 0) return setError("Invalid price");

            const fd = new FormData();
            if (!editingItem) {
                fd.append("vendorId", vendorId as string);
            }
            fd.append("name", name);
            fd.append("description", description || "");
            fd.append("category", category || "");
            fd.append("price", String(price));
            if (file) fd.append("image", file);

            await submitItem(fd, Boolean(editingItem));
        };

        const previewImage = file ? URL.createObjectURL(file) : editingItem?.image_url;

        return (
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Live Preview Card */}
                <Card className="bg-gradient-to-br from-slate-50 to-slate-100">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-slate-600">Live Preview</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="flex items-center space-x-4 p-4 bg-white rounded-lg border">
                            <div className="relative">
                                {previewImage ? (
                                    <img src={previewImage} alt="preview" className="h-16 w-16 object-cover rounded-lg border-2 border-slate-200" />
                                ) : (
                                    <div className="h-16 w-16 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50">
                                        <ImageIcon className="h-6 w-6 text-slate-400" />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 truncate">{name || "Untitled Item"}</p>
                                <p className="text-xs text-slate-500">{category || "Uncategorized"}</p>
                                <p className="text-sm font-semibold text-green-600 mt-1">
                                    {priceInput ? formatCurrency(Number(priceInput)) : "$0.00"}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="name" className="text-sm font-medium">Item Name *</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter item name"
                                className="mt-1"
                            />
                        </div>

                        <div>
                            <Label htmlFor="category" className="text-sm font-medium">Category</Label>
                            <Select
                                value={category}
                                onValueChange={(val) => setCategory(val)}
                            >
                                <SelectTrigger className="mt-1" id="category">
                                    <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="breakfast">Breakfast</SelectItem>
                                    <SelectItem value="lunch">Lunch</SelectItem>
                                    <SelectItem value="dinner">Dinner</SelectItem>
                                    <SelectItem value="snacks">Snack</SelectItem>
                                    <SelectItem value="drinks">Drink</SelectItem>
                                </SelectContent>
                            </Select>

                        </div>

                        <div>
                            <Label htmlFor="price" className="text-sm font-medium">Price *</Label>
                            <div className="relative mt-1">
                                <DollarSignIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    id="price"
                                    value={priceInput}
                                    onChange={(e) => setPriceInput(e.target.value)}
                                    placeholder="0.00"
                                    className="pl-9"
                                    inputMode="decimal"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                            <textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Describe your item..."
                                className="mt-1 min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                                rows={3}
                            />
                        </div>

                        <div>
                            <Label htmlFor="image" className="text-sm font-medium">Item Image</Label>
                            <div className="mt-1">
                                <Input
                                    id="image"
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                                    className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t">
                    <DrawerClose asChild>
                        <Button variant="outline" type="button">Cancel</Button>
                    </DrawerClose>
                    <Button type="submit" disabled={actionLock} className="bg-green-600 hover:bg-green-700">
                        {actionLock ? "Saving..." : (editingItem ? "Update Item" : "Add Item")}
                    </Button>
                </div>
            </form>
        );
    };

    const ItemsGrid = useMemo(() => {
        if (loading) {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Card key={i} className="overflow-hidden">
                            <div className="aspect-video">
                                <Skeleton className="w-full h-full" />
                            </div>
                            <CardContent className="p-4">
                                <Skeleton className="h-5 w-3/4 mb-2" />
                                <Skeleton className="h-4 w-full mb-3" />
                                <div className="flex justify-between items-center">
                                    <Skeleton className="h-6 w-16" />
                                    <Skeleton className="h-8 w-20" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            );
        }

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                {items.map((item) => (
                    <Card key={item.id} className="group hover:shadow-lg transition-all duration-200 overflow-hidden border-slate-200">
                        <div className="relative aspect-video overflow-hidden bg-slate-100">
                            {item.image_url ? (
                                <img
                                    src={item.image_url}
                                    alt={item.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <ImageIcon className="h-12 w-12 text-slate-400" />
                                </div>
                            )}

                            {/* Availability Badge */}
                            <div className="absolute top-3 right-3">
                                <Button
                                    variant={item.is_available ? "secondary" : "destructive"}
                                    size="sm"
                                    className="h-8 px-2 text-xs"
                                    onClick={() => toggleAvailability(item.id, !item.is_available)}
                                    disabled={actionLock}
                                >
                                    {item.is_available ? (
                                        <>
                                            <EyeIcon className="h-3 w-3 mr-1" />
                                            Available
                                        </>
                                    ) : (
                                        <>
                                            <EyeOffIcon className="h-3 w-3 mr-1" />
                                            Hidden
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>

                        <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">{item.name}</h3>
                                    {item.category && (
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.category}</p>
                                    )}
                                </div>
                                <InlinePriceEditor current={item.price} onSave={(p) => updatePrice(item.id, p)} />
                            </div>

                            {item.description && (
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">{item.description}</p>
                            )}

                            <div className="flex gap-2">
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => removeItem(item.id)}
                                    disabled={actionLock}
                                >
                                    <TrashIcon className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }, [items, loading, actionLock]);

    return (
        <>
            <Header />
            <div className="min-h-screen bg-white dark:bg-black p-4 md:p-6">
                <div className="max-w-7xl mx-auto">

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Your Catalog</h1>
                            <p className="text-slate-600 dark:text-slate-400 mt-1">Manage your business products and availability</p>
                        </div>

                        <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
                            <DrawerTrigger asChild>
                                <Button onClick={startAdd} className="bg-[#00bfff] hover:bg-green-700 font-bold shadow-lg">
                                    <PlusIcon className="h-4 w-4 mr-2" />
                                    Add New Item
                                </Button>
                            </DrawerTrigger>
                            <DrawerContent className="max-h-[90vh]">
                                <DrawerHeader className="border-b">
                                    <DrawerTitle>
                                        {editingItem ? "Edit Menu Item" : "Add New Menu Item"}
                                    </DrawerTitle>
                                </DrawerHeader>
                                <div className="overflow-y-auto p-6">
                                    <ItemForm />
                                </div>
                            </DrawerContent>
                        </Drawer>
                    </div>

                    {/* Error Alert */}
                    {error && (
                        <Card className="mb-6 border-red-200 bg-red-50">
                            <CardContent className="p-4">
                                <div className="flex items-center">
                                    <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
                                    <p className="text-red-700 font-medium">{error}</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Items Grid or Empty State */}
                    {!loading && items.length === 0 ? (
                        <Card className="text-center p-12 bg-white">
                            <div className="mx-auto w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                                <ImageIcon className="h-12 w-12 text-slate-400" />
                            </div>
                            <h3 className="text-xl font-semibold text-slate-900 mb-2">No menu items yet</h3>
                            <p className="text-slate-600 mb-6 max-w-md mx-auto">
                                Get started by adding your first menu item. You can upload images, set prices, and manage availability.
                            </p>
                            <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
                                <DrawerTrigger asChild>
                                    <Button onClick={startAdd} className="bg-[#00bfff] hover:bg-green-700 font-bold">
                                        <PlusIcon className="h-4 w-4 mr-2" />
                                        Add Your First Item
                                    </Button>
                                </DrawerTrigger>
                                <DrawerContent className="max-h-[90vh]">
                                    <DrawerHeader className="border-b">
                                        <DrawerTitle>Add New Menu Item</DrawerTitle>
                                    </DrawerHeader>
                                    <div className="overflow-y-auto p-6">
                                        <ItemForm />
                                    </div>
                                </DrawerContent>
                            </Drawer>
                        </Card>
                    ) : (
                        ItemsGrid
                    )}

                    {/* Pagination */}
                    {pagination && (
                        <Card className="mt-8">
                            <CardContent className="p-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="text-sm text-slate-600">
                                        Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of {pagination.totalItems} items
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2">
                                            <Label htmlFor="items-per-page" className="text-sm">Show:</Label>
                                            <Select value={String(limit)} onValueChange={(value) => setLimit(Number(value))}>
                                                <SelectTrigger className="w-20">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="5">5</SelectItem>
                                                    <SelectItem value="10">10</SelectItem>
                                                    <SelectItem value="25">25</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={page <= 1}
                                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                            >
                                                Previous
                                            </Button>
                                            <span className="px-3 py-1 text-sm text-slate-600">
                                                Page {pagination.currentPage} of {pagination.totalPages}
                                            </span>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={page >= pagination.totalPages}
                                                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                                            >
                                                Next
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
            <Navbar />
        </>
    );
}

// Enhanced inline price editor component
function InlinePriceEditor({ current, onSave }: { current: number; onSave: (p: number) => void }) {
    const [editing, setEditing] = useState(false);
    const [val, setVal] = useState(String(current));

    useEffect(() => setVal(String(current)), [current]);

    const handleSave = () => {
        const p = parseFloat(val);
        if (!isNaN(p) && p >= 0) {
            onSave(p);
        } else {
            setVal(String(current));
        }
        setEditing(false);
    };

    const handleCancel = () => {
        setEditing(false);
        setVal(String(current));
    };

    return (
        <div className="flex items-center">
            {editing ? (
                <div className="flex items-center gap-1">
                    <div className="relative">
                        <DollarSignIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-slate-400" />
                        <Input
                            className="w-20 h-8 text-xs pl-6 pr-1"
                            value={val}
                            onChange={(e) => setVal(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSave();
                                if (e.key === 'Escape') handleCancel();
                            }}
                            autoFocus
                        />
                    </div>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-green-600" onClick={handleSave}>
                        ✓
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-600" onClick={handleCancel}>
                        ✕
                    </Button>
                </div>
            ) : (
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 font-semibold text-green-600 hover:bg-green-50"
                    onClick={() => setEditing(true)}
                >
                    {formatCurrency(current)}
                </Button>
            )}
        </div>
    );
}