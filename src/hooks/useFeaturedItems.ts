import { usePlatformConfig } from "./usePlatformConfig";

export function useFeaturedCarouselVisibility() {
  const { featuredCarouselVisible, loaded } = usePlatformConfig();
  return { visible: featuredCarouselVisible && loaded };
}
