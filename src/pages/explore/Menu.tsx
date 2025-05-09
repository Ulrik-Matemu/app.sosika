import { useEffect, useState } from "react";
import axios from "axios";
import { useToast } from "../../hooks/use-toast"; // Adjust path if needed
import { ToastAction } from "../../components/ui/toast";

// Types
interface MenuItem {
  id: number;
  name: string;
  description?: string;
  price: string;
  category: string;
  is_available: boolean;
  vendor_id: number;
  image_url?: string;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
}

interface PriceRange {
  min: number;
  max: number;
}

export const useMenu = () => {
  const toast = useToast();

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
  });
  const [priceRange, setPriceRange] = useState<PriceRange>({ min: 0, max: 1000 });

  const fetchMenuItems = async (page: number = 1) => {
    setIsLoading(true);
    try {
      const response = await axios.get("https://sosika-backend.onrender.com/api/menuItems", {
        params: {
          page,
          limit: 4,
        },
      });

      const data = response.data.data;
      setMenuItems(data);
      setPagination(response.data.pagination);

      if (data.length > 0) {
        const prices = data.map((item: MenuItem) => parseFloat(item.price));
        setPriceRange({
          min: 0,
          max: Math.ceil(Math.max(...prices)),
        });
      }

      setIsLoading(false);
      setLoadingMenu(false);
    } catch (err) {
      toast.toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "Try checking your Internet connection.",
        action: <ToastAction altText="Try again">Try again</ToastAction>,
      });
      setIsLoading(false);
      setLoadingMenu(false);
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMenuItems(pagination.currentPage);
  }, [pagination.currentPage]);

  return {
    menuItems,
    isLoading,
    loadingMenu,
    priceRange,
    pagination,
    setPagination,
    fetchMenuItems,
    setPriceRange,
  };
};
