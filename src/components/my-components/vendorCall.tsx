import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Label } from "../ui/label";
import axios from "axios";
import { useNavigate } from "react-router-dom";

interface Vendor {
  id: number;
  name: string;
  user_id: number;
}

export function VendorCall() {
  const [loading] = useState(false);
  const [isVendor, setIsVendor] = useState<boolean | null>(null);
  const [vendor, setVendor] = useState<Vendor | null>(null);

  const userId = localStorage.getItem("userId"); // replace if using context

  useEffect(() => {
    const checkVendorStatus = async () => {
      if (!userId) return;

      try {
        // 1️⃣ Check if user is_vendor
        const userRes = await axios.get(`https://sosika-backend.onrender.com/api/user-vendor/${userId}`);
        if (userRes.data.is_vendor) {
          // 2️⃣ Check if vendor exists
          const vendorRes = await axios.get(`https://sosika-backend.onrender.com/api/user-vendor?userId=${userId}`);
          if (vendorRes.data.length > 0) {
            setVendor(vendorRes.data[0]);
            localStorage.setItem("vendorId", vendorRes.data[0].id.toString());
            setIsVendor(true);
          } else {
            setIsVendor(false);
          }
        } else {
          setIsVendor(false);
        }
      } catch (err) {
        console.error("Error checking vendor status:", err);
        setIsVendor(false);
      }
    };

    checkVendorStatus();
  }, [userId]);

   const navigate = useNavigate();

  const navigateToVendorRegistration = () => {
    navigate("/vendor-registration");
  };

  const navigateToLearnMore = () => {
    navigate("/waitlist");
  };

  const navigateToPage = (path: string) => {
    navigate(path);
  };

  if (isVendor === null) {
    // Loading state
    return <div>
      <div className="w-full flex justify-center p-4 border rounded-xl">
        <span className="font-bold">Please wait...</span>
      </div>
    </div>;
  }

  return (
    <>
      {isVendor ? (
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Welcome back, {vendor?.name}</CardTitle>
            <CardDescription>Manage your store on Sosika</CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col gap-2">
            <Button onClick={() => navigateToPage("/vendor-profile")} className="w-full">
              Profile
            </Button>
            <Button onClick={() => navigateToPage("/vendor-orders")} className="w-full">
              Orders
            </Button>
            <Button onClick={() => navigateToPage("/vendor-catalog")} className="w-full">
              Catalog
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Start Selling On Sosika</CardTitle>
            <CardDescription>
              Sosika has helped solo vendors to raise over{" "}
              <span className="font-bold text-black dark:text-white">TSH500,000</span> in monthly sales.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button className="w-full" variant="link" onClick={navigateToLearnMore}>
              <Label className="text-sm">Learn more</Label>
            </Button>
            <Button
              className="w-full"
              variant="default"
              onClick={navigateToVendorRegistration}
              disabled={loading}
            >
              <Label className="text-sm">
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Start Selling"
                )}
              </Label>
            </Button>
          </CardFooter>
        </Card>
      )}
    </>
  );
}
