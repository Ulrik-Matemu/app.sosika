import { useEffect, useRef } from "react";
import Fuse from "fuse.js";
import { useToast } from "../../hooks/use-toast";




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

interface VoiceAssistantOptions {
    menuItems: MenuItem[];
    addToCart: (item: MenuItem) => void;
    addCurrentLocation: () => void;
    setIsCartOpen: (open: boolean) => void;
}



export const useVoiceAssistant = ({
    menuItems,
    addToCart,
    addCurrentLocation,
    setIsCartOpen,
}: VoiceAssistantOptions) => {
    const toast = useToast();
    const voicesRef = useRef<SpeechSynthesisVoice[]>([]);


    const loadVoices = () => {
        voicesRef.current = window.speechSynthesis.getVoices();
        if (!voicesRef.current.length) {
            window.speechSynthesis.onvoiceschanged = () => {
                voicesRef.current = window.speechSynthesis.getVoices();
            };
        }
    };

    const speak = (text: string) => {
        if (!("speechSynthesis" in window)) return;

        const utter = new SpeechSynthesisUtterance(text);
        utter.voice =
            voicesRef.current.find((v) => v.lang === "en-US") || voicesRef.current[0];
        utter.rate = 1;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
    };

    const handleVoiceCommand = (command: string) => {
        const cmd = command.toLowerCase();

        const includes = (phrases: string[]) =>
            phrases.some((phrase) => cmd.includes(phrase));

        if (includes(["hello", "hi", "hey", "greetings", "yo"])) {
            toast.toast({
                title: "Hello there! 👋",
                description: "Try saying 'chocolate' to add a chocolate item to your cart.",
            });
            speak("Hello there! You can say a menu item like Banana Bread to add to cart.");
            navigator.vibrate?.(200);
            return;
        }

        if (includes(["go to cart", "open cart", "my cart"])) {
            setIsCartOpen(true);
            navigator.vibrate?.(200);
            return;
        }

        if (includes(["menu", "home", "explore"])) {
            window.location.href = "#/explore";
            navigator.vibrate?.(200);
            return;
        }

        if (includes(["profile", "account", "my profile"])) {
            window.location.href = "#/profile";
            navigator.vibrate?.(200);
            return;
        }

        if (includes(["orders", "order history", "my orders"])) {
            window.location.href = "#/orders";
            navigator.vibrate?.(200);
            return;
        }

        if (includes(["set location", "use my location", "update location"])) {
            addCurrentLocation();
            speak("Your current location has been updated. You can now place an order");
            navigator.vibrate?.(200);
            return;
        }

        // Fuzzy match items
        const fuse = new Fuse(menuItems, { keys: ["name"], threshold: 0.4 });
        const result = fuse.search(cmd);

        if (result.length > 0) {
            const item = result[0].item;
            addToCart(item);
            speak(`${item.name} has been added to your cart.`);
            navigator.vibrate?.(200);
        } else {
            toast.toast({ description: "No matching menu item found.", variant: "destructive" });
        }
    };

    const startListening = () => {
        const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.lang = "en-US";
        recognition.interimResults = false;
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript.toLowerCase();
            handleVoiceCommand(transcript);
        };
        recognition.start();
    };

    useEffect(() => {
        loadVoices();
    }, []);

    return { startListening };
};
