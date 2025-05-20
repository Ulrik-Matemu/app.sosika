"use client"

import { useState, useEffect } from "react"
import { Copy } from "lucide-react"
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

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Share Referral Link</Button>
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
        <DialogFooter className="sm:justify-start">
          <DialogClose asChild>
            <Button type="button" variant='destructive'>
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
