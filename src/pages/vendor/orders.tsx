import React, { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Badge } from "../../components/ui/badge";
import {
    Loader2,
    Clock,
    CheckCircle,
    XCircle,
    Play,
    UserCheck,
    RefreshCw
} from "lucide-react";
import { Header } from "../../components/my-components/header";
import Navbar from "../../components/my-components/navbar";

// ---------- Types ----------
interface OrderItem {
    id: number;
    menu_item_id: number;
    quantity: number;
    price: number;
    total_amount: number;
    name?: string; // We'll populate this from the API
    
}

interface Action {
    status: OrderStatus;
    label: string;
    variant?: "default" | "destructive" | "success" | "outline";
}

export type OrderStatus = "pending" | "in_progress" | "assigned" | "completed" | "cancelled";

interface Order {
    id: number;
    user_id: number;
    vendor_id: number;
    order_status: OrderStatus;
    order_datetime: string;
    total_amount: number;
    items: OrderItem[];
    phone_number: string; // Assuming this is part of the order details
}

// ---------- Helper Functions ----------
const getStatusConfig = (status: OrderStatus) => {
    const configs = {
        pending: { color: "bg-amber-50 text-amber-700 border-amber-200", icon: Clock },
        in_progress: { color: "bg-blue-50 text-blue-700 border-blue-200", icon: Play },
        assigned: { color: "bg-purple-50 text-purple-700 border-purple-200", icon: UserCheck },
        completed: { color: "bg-green-50 text-green-700 border-green-200", icon: CheckCircle },
        cancelled: { color: "bg-red-50 text-red-700 border-red-200", icon: XCircle }
    };
    return configs[status];
};

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'TZS' }).format(amount);

const formatDateTime = (datetime: string) =>
    new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date(datetime));

// ---------- Component ----------
const VendorOrders: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
    const [refreshing, setRefreshing] = useState<boolean>(false);

    const vendorId = localStorage.getItem("vendorId");

    const fetchOrders = async (isRefresh = false) => {
        if (!vendorId) return;

        isRefresh ? setRefreshing(true) : setLoading(true);

        try {
            const statusParam = statusFilter !== "all" ? `&status=${statusFilter}` : "";
            const res = await axios.get<Order[]>(`https://sosika-backend.onrender.com/api/orders?vendor_id=${vendorId}${statusParam}`);

            // Fetch menu item names for each order
            const ordersWithItemNames = await Promise.all(
                res.data.map(async (order) => {
                    const itemsWithNames = await Promise.all(
                        order.items.map(async (item) => {
                            try {
                                const itemRes = await axios.get(`https://sosika-backend.onrender.com/api/menuItems/item/${item.menu_item_id}`);
                                return { ...item, name: itemRes.data.name };
                            } catch (error) {
                                console.error(`Failed to fetch item ${item.menu_item_id}:`, error);
                                return { ...item, name: `Item #${item.menu_item_id}` };
                            }
                        })
                    );
                    return { ...order, items: itemsWithNames };
                })
            );

            setOrders(ordersWithItemNames);
        } catch (error) {
            console.error("Failed to fetch orders", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, [statusFilter]);

    const updateOrderStatus = async (orderId: number, newStatus: OrderStatus) => {
        try {
            await axios.patch(`https://sosika-backend.onrender.com/api/orders/${orderId}/status`, { order_status: newStatus });
            fetchOrders(true);
        } catch (error) {
            console.error("Failed to update order", error);
        }
    };

    const getAvailableActions = (currentStatus: OrderStatus): Action[] => {
        switch (currentStatus) {
            case "pending":
                return [
                    { status: "in_progress", label: "Start", variant: "default" },
                    { status: "cancelled", label: "Cancel", variant: "destructive" }
                ];
            case "in_progress":
                return [
                    { status: "assigned", label: "Assign", variant: "default" },
                    { status: "completed", label: "Complete", variant: "success" }
                ];
            case "assigned":
                return [
                    { status: "completed", label: "Complete", variant: "success" }
                ];
            default:
                return [];
        }
    };

    const stats = {
        total: orders.length,
        pending: orders.filter(o => o.order_status === "pending").length,
        revenue: orders.filter(o => o.order_status === "completed")
            .reduce((sum, o) => sum + o.total_amount, 0)
    };

    return (
        <>
            <Header />
            <div className="min-h-screen bg-[#fdfdfd] dark:bg-[#080808] p-4">

                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 text-center">Your Orders</h1>
                            <div className="flex justify-center gap-4 mt-2">
                                <div className="w-full bg-gray-200 dark:bg-[#121212] p-4 rounded-lg">
                                    <p className="text-sm dark:text-gray-400">Orders</p>
                                    <p className="text-lg font-bold">{stats.total}</p>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-[#121212] p-4 rounded-lg">
                                    <p className="text-sm dark:text-gray-400">Earnings</p>
                                    <p className="text-lg font-bold">{formatCurrency(stats.revenue)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-center gap-2">
                            <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as OrderStatus | "all")}>
                                <SelectTrigger className="w-32 text-black dark:text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="in_progress">Active</SelectItem>
                                    <SelectItem value="completed">Done</SelectItem>
                                </SelectContent>
                            </Select>

                            <Button
                                onClick={() => fetchOrders(true)}
                                disabled={refreshing}
                                variant="outline"
                                size="sm"
                            >
                                {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>

                    {/* Orders */}
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                        </div>
                    ) : orders.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center text-gray-500">
                                No orders found
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-3 pb-24">
                            {orders.map((order) => {
                                const statusConfig = getStatusConfig(order.order_status);
                                const StatusIcon = statusConfig.icon;

                                return (
                                    <Card key={order.id} className="hover:shadow-md transition-shadow">
                                        <CardContent className="p-4">
                                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                                <div className="space-y-2 flex-1">
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-semibold">#{order.id}</span>
                                                        <Badge className={`${statusConfig.color} flex items-center gap-1 text-xs`}>
                                                            <StatusIcon size={12} />
                                                            {order.order_status.replace('_', ' ')}
                                                        </Badge>
                                                    </div>

                                                    {/* Order Items */}
                                                    <div className="space-y-1">
                                                        {order.items.map((item, idx) => (
                                                            <div key={item.id} className="text-lg text-gray-900 dark:text-white">
                                                                <span className="font-medium"><span className="font-bold">Items:</span> {item.quantity}x {item.name}</span>
                                                                {idx < order.items.length - 1 && <span className="text-gray-400"> • </span>}
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-black dark:text-gray-300">
                                                        <div className="flex items-center gap-1">
                                                            <span className="font-medium"><span className="font-bold">Total:</span> {formatCurrency(order.total_amount)}</span>
                                                        </div>
                                                        <span className="hidden sm:inline">•</span>
                                                        <span className="text-gray-600 dark:text-gray-400"><span className="font-bold">Placed On:</span> {formatDateTime(order.order_datetime)}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-lg">Customer phone: <a href={`tel:${order.phone_number}`} className="text-blue-400">{order.phone_number}</a></span>
                                                    </div>
                                                </div>

                                                <div className="flex gap-2 sm:flex-col sm:items-end">
                                                    {getAvailableActions(order.order_status).map((action) => (
                                                        <Button
                                                            key={action.status}
                                                            size="sm"
                                                            variant={action.variant as any}
                                                            onClick={() => updateOrderStatus(order.id, action.status)}
                                                        >
                                                            {action.label}
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
            <Navbar />
        </>
    );
};

export default VendorOrders;