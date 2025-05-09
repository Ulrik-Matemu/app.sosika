import { Phone } from "lucide-react"
import { useState } from "react"
import { Button } from "../ui/button"
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "../ui/dialog"
import { Input } from "../ui/input"
import { Label } from "../ui/label"

export function CustomItemRequestDialog() {
    const [itemName, setItemName] = useState("")
    const [quantity, setQuantity] = useState("")

    const handleSubmit = () => {
        console.log("Custom item request:", { itemName, quantity })
        // You can send this data to your backend or handle it accordingly.
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button className="bg-black text-white dark:bg-white dark:text-black" variant="outline">Can't find what you're looking for?</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Request an Item</DialogTitle>
                    <DialogDescription>
                        Let us know what you need and in what quantity and we will respond promptly.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="item-name">Item Name</Label>
                        <Input
                            id="item-name"
                            placeholder="e.g., Chips Mayai"
                            value={itemName}
                            onChange={(e) => setItemName(e.target.value)}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="item-name">Extra Instructions</Label>
                        <Input
                            id="item-name"
                            placeholder="Na mishkaki miwili ya ng'ombe"
                            value={itemName}
                            className="h-16"
                            onChange={(e) => setItemName(e.target.value)}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="quantity">Quantity</Label>
                        <Input
                            id="quantity"
                            type="number"
                            placeholder="e.g., 2 liters"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex justify-between items-center mt-4">
                    <Button
                        onClick={() => {
                            // Placeholder for "Call vendor" feature.
                            alert("Calling vendor...")
                        }}
                        variant="outline"
                        className="flex items-center space-x-2"
                    >
                        <Phone className="w-4 h-4" />
                        <span>Or <b>Call Us</b> Instead</span>
                    </Button>

                    <Button onClick={handleSubmit} className="px-4">
                        Submit Request
                    </Button>
                </div>

                <DialogFooter className="sm:justify-start mt-2">
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">
                            Close
                        </Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
