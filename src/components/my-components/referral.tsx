"use client"

import { useState, useEffect } from "react"
import { Copy, MessageSquareText, Share2, Smartphone } from "lucide-react"
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

export function ReferralLinkDialog() {
  const [userId, setUserId] = useState<number | null>(null)
  const [referralLink, setReferralLink] = useState("")

  useEffect(() => {
    const storedId = localStorage.getItem("userId")
    if (storedId) {
      const parsedId = parseInt(storedId)
      setUserId(parsedId)
      setReferralLink(`https://sosika.netlify.app/#/register?ref=${parsedId}`)
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

  if (!userId) return null // optionally render nothing if not loaded

  const encodedMessage = encodeURIComponent(
    `Hey! Use this link to register on Sosika and get food delivered in and around campus. 🚀 🚀  ${referralLink}`
  )

  return (
    <Dialog>
    <DialogTrigger asChild>
      <Button variant="outline">
        <Share2 className="mr-2 h-4 w-4" /> Share Referral Link
      </Button>
    </DialogTrigger>
    <DialogContent className="bg-[#ededed] dark:bg-[#3b3b3b] sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Your Referral Link</DialogTitle>
        <DialogDescription>
          Share this link with friends — get rewards when they order!
        </DialogDescription>
      </DialogHeader>

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
