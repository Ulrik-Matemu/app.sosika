import { useEffect, useState, useCallback } from "react";
import axios from "axios";

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

interface CacheData {
  menuItems: { [page: number]: MenuItem[] };
  pagination: Pagination;
  priceRange: PriceRange;
  timestamp: number;
}

// Cache expiration time (in milliseconds) - 10 minutes
const CACHE_EXPIRATION = 10 * 60 * 1000;

// Create a singleton cache to persist data between component mounts
let globalMenuCache: CacheData | null = null;

/**
 * A React hook for managing menu items with efficient caching.
 * This hook reduces API calls by caching data both in memory and localStorage.
 */
export const useMenu = () => {
  const API_URL = import.meta.env.VITE_API_URL;

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
  });
  const [priceRange, setPriceRange] = useState<PriceRange>({ min: 0, max: 1000 });
  const [cacheInitialized, setCacheInitialized] = useState(false);

  /**
   * Load cache from localStorage or memory
   */
  const getCache = useCallback((): CacheData | null => {
    // First check if we have a memory cache
    if (globalMenuCache !== null) {
      // Check if cached data is expired
      const now = Date.now();
      if (now - globalMenuCache.timestamp <= CACHE_EXPIRATION) {
        return globalMenuCache;
      }
      
      // Expired, clear the global cache
      globalMenuCache = null;
    }
    
    // Try to get cache from localStorage
    try {
      const cachedData = localStorage.getItem("menu_cache");
      if (!cachedData) return null;
      
      const parsedCache = JSON.parse(cachedData) as CacheData;
      const now = Date.now();
      
      // Check if cache is expired
      if (now - parsedCache.timestamp > CACHE_EXPIRATION) {
        localStorage.removeItem("menu_cache");
        return null;
      }
      
      // Cache is valid, update the global cache
      globalMenuCache = parsedCache;
      return parsedCache;
    } catch (error) {
      console.error("Error parsing cache:", error);
      localStorage.removeItem("menu_cache");
      return null;
    }
  }, []);

  /**
   * Save cache to localStorage and memory
   */
  const updateCache = useCallback((data: {
    menuItems?: { [page: number]: MenuItem[] };
    pagination?: Pagination;
    priceRange?: PriceRange;
  }) => {
    try {
      // Get current cache or create defaults
      const currentCache = getCache();
      
      // Create a new cache object
      const updatedCache: CacheData = {
        menuItems: data.menuItems || (currentCache?.menuItems || {}),
        pagination: data.pagination || (currentCache?.pagination || { currentPage: 1, totalPages: 1 }),
        priceRange: data.priceRange || (currentCache?.priceRange || { min: 0, max: 1000 }),
        timestamp: Date.now()
      };

      // Update both global and localStorage cache
      globalMenuCache = updatedCache;
      localStorage.setItem("menu_cache", JSON.stringify(updatedCache));
    } catch (error) {
      console.error("Error updating cache:", error);
    }
  }, [getCache]);

  /**
   * Fetch menu items from API or cache
   */
  const fetchMenuItems = useCallback(async (page: number = 1, forceRefresh: boolean = false) => {
    setLoadingMenu(true);
    
    // Check cache first (skip if forceRefresh is true)
    const cache = getCache();
    if (!forceRefresh && cache?.menuItems && cache.menuItems[page]) {
      // Use cached data
      setMenuItems(cache.menuItems[page]);
      setPagination(cache.pagination);
      setPriceRange(cache.priceRange);
      setLoadingMenu(false);
      return;
    }
  
    try {
      // Fetch from API
      const response = await axios.get(`${API_URL}/menuItems`, {
        params: { page, limit: 10 },
      });
  
      // Safely extract data with defaults
      const data = response.data.data || [];
      const newPagination = response.data.pagination || { currentPage: page, totalPages: 1 };
  
      // Calculate price range if we have data
      let newPriceRange = { min: 0, max: 1000 };
      if (data.length > 0) {
        const prices = data.map((item: MenuItem) => parseFloat(item.price));
        if (prices.length > 0) {
          newPriceRange = { min: 0, max: Math.ceil(Math.max(...prices)) };
        }
      }

      // Update state
      setMenuItems(data);
      setPagination(newPagination);
      setPriceRange(newPriceRange);
      
      // Update cache with new data
      const existingMenuItems = cache?.menuItems || {};
      const updatedMenuItems = { ...existingMenuItems, [page]: data };
      
      updateCache({
        menuItems: updatedMenuItems,
        pagination: newPagination,
        priceRange: newPriceRange
      });
    } catch (err) {
      
      console.error(err);
    } finally {
      setLoadingMenu(false);
    }
  }, [API_URL, getCache, updateCache]);

  /**
   * Initialize the component on first render
   */
  useEffect(() => {
    if (cacheInitialized) return;
    
    // Try to load from cache first
    const cache = getCache();
    if (cache && cache.menuItems) {
      const currentPage = cache.pagination?.currentPage || 1;
      
      // Check if we have data for the current page
      if (cache.menuItems[currentPage]) {
        setMenuItems(cache.menuItems[currentPage]);
        setPagination(cache.pagination);
        setPriceRange(cache.priceRange);
        setLoadingMenu(false);
        console.log("Using cached menu data");
      } else {
        // We have cache but not for the current page
        fetchMenuItems(currentPage);
      }
    } else {
      // No valid cache, fetch fresh data
      fetchMenuItems(1);
      console.log("No cache found, fetching menu items from API");
    }
    
    setCacheInitialized(true);
  }, [fetchMenuItems, getCache, cacheInitialized]);

  /**
   * Handle page changes
   */
  useEffect(() => {
    if (!cacheInitialized) return;
    
    const currentPage = pagination?.currentPage || 1;
    const cache = getCache();
    
    if (cache?.menuItems && cache.menuItems[currentPage]) {
      setMenuItems(cache.menuItems[currentPage]);
    } else {
      fetchMenuItems(currentPage);
    }
  }, [pagination, getCache, fetchMenuItems, cacheInitialized]);

  return {
    menuItems,
    loadingMenu,
    priceRange,
    pagination,
    setPagination,
    fetchMenuItems,
    setPriceRange,
    refreshMenu: (page = pagination?.currentPage || 1) => fetchMenuItems(page, true)
  };
};