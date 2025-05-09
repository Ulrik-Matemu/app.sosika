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
    const [loading, setLoading] = useState(false)
    const [quantity, setQuantity] = useState("")
    const [extraInstructions, setExtraInstruction] = useState("")
    const [message, setMessage] = useState("");
    const userId = localStorage.getItem("userId");

    const handleSubmit = async () => {
        console.log("Custom item request:", { itemName, quantity })
        setLoading(true)
        // You can send this data to your backend or handle it accordingly.
        try {
            const response = await fetch('https://sosika-backend.onrender.com/api/orders/other-orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: userId,
                    itemName: itemName,
                    extraInstructions: extraInstructions,
                    quantity,
                  }),
                  
            })

            if (response.ok) {
                setMessage("Request submitted successfully!")
            } else {
                setMessage("Failed to submit request.")
            }
        } catch (error) {
            console.error("Error submitting request:", error)
            alert("An error occurred while submitting your request.")
        }
        setLoading(false)
        setItemName("")
        setQuantity("")
        setExtraInstruction("")
        setTimeout(() => {
            setMessage("")
        }, 5000)
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button className="bg-black text-white dark:bg-[#ededed] dark:text-black" variant="outline">Can't find what you're looking for?</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-[#ededed] dark:bg-[#2b2b2b]">
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
                            className="dark:bg-[#7a7a7a]"
                            onChange={(e) => setItemName(e.target.value)}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="item-name">Extra Instructions</Label>
                        <Input
                            id="item-name"
                            placeholder="Na mishkaki miwili ya ng'ombe"
                            value={extraInstructions}
                            className="h-16 dark:bg-[#7a7a7a]"
                            onChange={(e) => setExtraInstruction(e.target.value)}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="quantity">Quantity</Label>
                        <Input
                            id="quantity"
                            type="number"
                            className="dark:bg-[#7a7a7a]"
                            placeholder="1"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex justify-between items-center mt-4">
                    <Button
                        onClick={() => {
                            if (navigator && navigator.userAgent.match(/Android|iPhone|iPad|iPod/i)) {
                                window.location.href = "tel:+255760903468"; // Replace with the vendor's phone number
                            } else {
                                alert("Phone call feature is only available on mobile devices.");
                            }
                        }}
                        variant="outline"
                        className="flex items-center space-x-2"
                    >
                        <Phone className="w-4 h-4" />
                        <span>Or <b>Call Us</b> Instead</span>
                    </Button>

                    <Button onClick={handleSubmit} className="px-4 bg-[#00bfff]">
                        {loading ? (
                            <svg className="animate-spin h-5 w-5 text-[#2b2b2b]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            'Submit Request'
                        )}
                    </Button>
                </div>

                <DialogFooter className="sm:justify-start mt-2">
                    <DialogClose asChild>
                        <Button type="button" variant="destructive">
                            Close
                        </Button>
                    </DialogClose>
                    <div className="p-2 border my-2">
                        <p>{message}</p>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
