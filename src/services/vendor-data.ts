import { Vendor } from '../pages/mood/types/types';

interface VendorModule {
  default: Vendor;
}

export const loadAllVendors = async (): Promise<Map<string, Vendor>> => {
  const modules = import.meta.glob<VendorModule>('../../vendors/*.json');
  const vendorMap = new Map<string, Vendor>();

  for (const path in modules) {
    const module = await modules[path]();
    const vendor = module.default;
    vendorMap.set(vendor.id, vendor); // Use vendor.id (Firebase ID) as key
  }
  return vendorMap;
};
