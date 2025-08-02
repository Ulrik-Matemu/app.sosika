import React from "react";
import { Button } from "../ui/button";
import {
    Card,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "../ui/card";
import { Label } from "../ui/label";

const navigateToVendor = () => {
    window.location.href = "https://sosikavendor.netlify.app/";
}


export function VendorCall() {
    const [loading, setLoading] = React.useState(false);

    const handleClick = () => {
        setLoading(true);
        navigateToVendor();
    };
    return (
        <>
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle>Start Selling On Sosika</CardTitle>
                    <CardDescription>
                        Sosika has helped solo vendors to raise over <span className="font-bold text-black dark:text-white">TSH500,000</span> in monthly sales.
                    </CardDescription>
                </CardHeader>
                <CardFooter>
                    <Button className="w-full" variant="link">
                        <Label className="text-sm">
                            Learn more
                        </Label>
                    </Button>
                    <Button className="w-full" variant="default" onClick={handleClick} disabled={loading}>
                        <Label className="text-sm">
                            {loading ? "Redirecting to vendor..." : "Start Selling"}
                        </Label>
                    </Button>
                    
                </CardFooter>
            </Card>
        </>
    )
}