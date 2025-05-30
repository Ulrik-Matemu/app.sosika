"use client"

import { useState, useEffect } from "react"
import { Copy, MessageSquareText, Smartphone, Gift, Clock, Users } from "lucide-react"
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
import { toast } from "../../hooks/use-toast"

export function EnhancedReferralDialog() {
    const [userId, setUserId] = useState<number | null>(null)
    const [referralLink, setReferralLink] = useState("")
    const [referrals, setReferrals] = useState(0) // Mock referral count
    const [timeLeft, setTimeLeft] = useState({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0
    })

    // Calculate time until Monday
    useEffect(() => {
        const calculateTimeLeft = () => {
            const now = new Date()
            const nextMonday = new Date()

            // Get next Monday
            const daysUntilMonday = (1 + 7 - now.getDay()) % 7 || 7
            nextMonday.setDate(now.getDate() + daysUntilMonday)
            nextMonday.setHours(23, 59, 59, 999)

            const difference = nextMonday.getTime() - now.getTime()

            if (difference > 0) {
                setTimeLeft({
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((difference / 1000 / 60) % 60),
                    seconds: Math.floor((difference / 1000) % 60)
                })
            }
        }

        calculateTimeLeft()
        const timer = setInterval(calculateTimeLeft, 1000)
        return () => clearInterval(timer)
    }, [])

    useEffect(() => {
        const storedId = localStorage.getItem("userId")
        if (storedId) {
            const parsedId = parseInt(storedId)
            setUserId(parsedId)
            setReferralLink(`https://sosika.netlify.app/#/register?ref=${parsedId}`)

            // Fetch real referral count from backend
            fetch(`https://sosika-backend.onrender.com/api/auth/referral/check?user_id=${parsedId}&target=5`, { cache: "no-store" })
                .then((res) => res.json())
                .then((data) => {
                    if (data.referral_count !== undefined) {
                        setReferrals(data.referral_count)
                    } else {
                        console.error("Unexpected response:", data)
                    }
                })
                .catch((err) => {
                    console.error("Failed to fetch referral count:", err)
                })
        }
    }, [])

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(referralLink)
            toast({ title: "Copied!", description: "Referral link copied to clipboard." })
        } catch (err) {
            toast({ title: "Error", description: "Failed to copy referral link." })
        }
    }

    if (!userId) return null

    const encodedMessage = encodeURIComponent(
        `🍞 LIMITED TIME: Get FREE Chocolate Chip Banana Bread! Join Sosika using my link and get food delivered on campus. Offer ends Monday! 🚀 ${referralLink}`
    )

    const progress = (referrals / 5) * 100
    const remaining = 5 - referrals

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    className="group relative overflow-hidden border-0 p-0 h-auto w-full bg-gradient-to-br from-amber-400 via-orange-400 to-red-400 hover:from-amber-500 hover:via-orange-500 hover:to-red-500 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                    <div className="relative w-full h-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm m-[2px] rounded-md px-6 py-4 flex items-center justify-center gap-3">
                        {/* Floating particles animation */}
                        <div className="absolute inset-0 overflow-hidden rounded-md">
                            <div className="absolute -top-2 -left-2 w-4 h-4 bg-yellow-300/30 rounded-full animate-pulse"></div>
                            <div className="absolute top-1/2 -right-1 w-3 h-3 bg-orange-300/40 rounded-full animate-bounce"></div>
                            <div className="absolute -bottom-1 left-1/4 w-2 h-2 bg-red-300/30 rounded-full animate-pulse delay-75"></div>
                        </div>

                        {/* Banana bread image */}
                        <div className="relative flex-shrink-0">
                            <img
                                src="ccbb.jpg"
                                alt="Chocolate Chip Banana Bread"
                                className="w-24 h-18 object-cover rounded-lg shadow-md border-2 border-orange-200/50"
                            />
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                                !
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex flex-col items-start">
                            <div className="flex items-center gap-2 mb-1">
                                <Gift className="h-4 w-4 text-orange-600 group-hover:rotate-12 transition-transform duration-300" />
                                <span className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide">
                                    Limited Time
                                </span>
                            </div>
                            <span className="text-sm font-bold text-gray-800 dark:text-gray-100 leading-tight">
                                FREE Chocolate Chip<br />Banana Bread! 🍞
                            </span>
                            <span className="text-xs text-orange-600 dark:text-orange-400 font-medium mt-1">
                                Add 5 friends & win!
                            </span>
                        </div>

                        {/* Shine effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-out"></div>
                    </div>
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#ededed] dark:bg-[#3b3b3b] ">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Gift className="h-5 w-5 text-orange-500" />
                        Limited Time Offer!
                    </DialogTitle>
                    <DialogDescription>
                        Use the link below to add 5 friends and get a FREE Chocolate Chip Banana Bread! 🍞
                    </DialogDescription>
                </DialogHeader>

                {/* Countdown Timer */}
                <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
                    <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-red-500" />
                        <span className="text-sm font-medium text-red-700 dark:text-red-300">Offer ends in:</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center">
                        <div className="bg-white dark:bg-gray-800 rounded p-2">
                            <div className="text-lg font-bold text-red-600 dark:text-red-400">{timeLeft.days}</div>
                            <div className="text-xs text-gray-500">Days</div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded p-2">
                            <div className="text-lg font-bold text-red-600 dark:text-red-400">{timeLeft.hours}</div>
                            <div className="text-xs text-gray-500">Hours</div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded p-2">
                            <div className="text-lg font-bold text-red-600 dark:text-red-400">{timeLeft.minutes}</div>
                            <div className="text-xs text-gray-500">Min</div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded p-2">
                            <div className="text-lg font-bold text-red-600 dark:text-red-400">{timeLeft.seconds}</div>
                            <div className="text-xs text-gray-500">Sec</div>
                        </div>
                    </div>
                </div>

                {/* Progress Tracker */}
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium text-green-700 dark:text-green-300">
                                Progress: {referrals}/5 friends
                            </span>
                        </div>
                        <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                            {remaining} to go!
                        </span>
                    </div>
                    <div className="w-full bg-green-200 dark:bg-green-800 rounded-full h-3">
                        <div
                            className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    {referrals >= 5 && (
                        <div className="mt-2 text-center">
                            <span className="text-green-600 dark:text-green-400 font-bold">🎉 Congratulations! You've earned your free banana bread!</span>
                        </div>
                    )}
                </div>

                {/* Referral Link */}
                <div className="flex items-center space-x-2">
                    <div className="grid flex-1 gap-2">
                        <Label htmlFor="link" className="sr-only">
                            Referral Link
                        </Label>
                        <Input id="link" value={referralLink} readOnly />
                    </div>
                    <Button type="button" size="sm" className="px-3" onClick={handleCopy}>
                        <span className="sr-only">Copy</span>
                        <Copy className="w-4 h-4" />
                    </Button>
                </div>

                {/* Share Buttons */}
                <div className="grid grid-cols-2 gap-2 mt-4">
                    <a
                        href={`sms:?&body=${encodedMessage}`}
                        className="flex items-center justify-center bg-[#f0f0f0] dark:bg-[#4b4b4b] rounded px-3 py-2 text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                    >
                        <Smartphone className="h-4 w-4 mr-1" /> SMS
                    </a>

                    <a
                        href={`https://wa.me/?text=${encodedMessage}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center bg-[#25D366]/10 border border-[#25D366] text-[#25D366] rounded px-3 py-2 text-sm hover:bg-[#25D366]/20 transition"
                    >
                        <MessageSquareText className="h-4 w-4 mr-1" /> WhatsApp
                    </a>
                </div>

                {/* Motivational Message */}
                <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        🍞 Fresh-baked chocolate chip banana bread awaits! Share with friends and earn your delicious reward before Monday!
                    </p>
                </div>

                <DialogFooter className="sm:justify-start">
                    <DialogClose asChild>
                        <Button type="button" variant="destructive">
                            Close
                        </Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}