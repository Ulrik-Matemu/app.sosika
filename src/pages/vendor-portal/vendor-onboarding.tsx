import React, { useState, useRef, useCallback, useEffect, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GoogleMap, Autocomplete } from "@react-google-maps/api";
import {
    Building2, User, Phone, Mail, Lock, FileText, Upload,
    MapPin, Search, LocateFixed, Clock, ChevronLeft, Loader2, CheckCircle,
    Eye, EyeOff, Sparkles, Check, ArrowRight, Trash2

} from "lucide-react";
import { auth, db } from "../../firebase";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useMapLoader } from "../../services/map-provider";
import { useLocationStorage } from "../../hooks/useLocationStorage";
import { useToast } from "../../hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { uploadToCloudinary } from "../../services/cloudinary";
import { 
    validateEmail, 
    validatePhone, 
    validatePassword, 
    validateName, 
    validateFile, 
    getPasswordStrength, 
    formatTanzanianPhone 
} from "../../utils/validation";
import { getFriendlyErrorMessage } from "../../utils/firebase-errors";

const mapContainerStyle = { width: "100%", height: "100%", borderRadius: "1rem" };

// Confetti configuration for celebration screen
const confettiColors = ["#00bfff", "#ff007f", "#ffea00", "#00ff66", "#9d00ff"];
const confettiParticles = Array.from({ length: 60 }).map((_, i) => ({
  id: i,
  x: (Math.random() - 0.5) * 320, // horizontal spread
  y: -180 - Math.random() * 200, // vertical height (going up)
  rotation: Math.random() * 720,
  color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
  scale: Math.random() * 0.7 + 0.3,
  duration: Math.random() * 2 + 1.5,
  delay: Math.random() * 0.4
}));

export default function VendorOnboarding() {
    const { isLoaded, loadError } = useMapLoader();
    const { locations, saveLocation } = useLocationStorage();
    const { toast } = useToast();
    const navigate = useNavigate();

    // Accessibility unique IDs
    const ownerNameId = useId();
    const emailId = useId();
    const phoneId = useId();
    const passwordId = useId();
    const confirmPasswordId = useId();
    const spotNameId = useId();
    const registeredId = useId();

    // Step state (0: Welcome, 1: Owner identity, 2: Spot branding, 3: Geotargeting, 4: Review, 5: Celebration Success)
    const [step, setStep] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Form States
    const [formData, setFormData] = useState({
        spotName: "",
        ownerName: "",
        phone: "",
        email: "",
        password: "",
        confirmPassword: "",
        isRegistered: false,
        collegeId: 1, // Keep hardcoded as requested by the user
    });

    // File Upload States
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [coverPreview, setCoverPreview] = useState<string | null>(null);
    const [licenseFile, setLicenseFile] = useState<File | null>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);
    const licenseInputRef = useRef<HTMLInputElement>(null);

    // Validation States
    const [errors, setErrors] = useState<Record<string, string | null>>({});

    // Maps States
    const [selectedGeo, setSelectedGeo] = useState<{ lat: number; lng: number } | null>(null);
    const [geoAddress, setGeoAddress] = useState("");
    const [showRecentGeo, setShowRecentGeo] = useState(false);
    const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
    const [isLocating, setIsLocating] = useState(false);

    const mapRef = useRef<google.maps.Map | null>(null);
    const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
    const geocoderRef = useRef<google.maps.Geocoder | null>(null);

    // 1. Session Storage State Recovery (Safe recovery on refresh)
    useEffect(() => {
        try {
            const savedForm = sessionStorage.getItem("sosika_onboarding_form");
            const savedStep = sessionStorage.getItem("sosika_onboarding_step");
            const savedGeo = sessionStorage.getItem("sosika_onboarding_geo");
            const savedAddress = sessionStorage.getItem("sosika_onboarding_address");

            if (savedForm) {
                const parsedForm = JSON.parse(savedForm);
                // Clear password fields for security
                setFormData(prev => ({
                    ...prev,
                    ...parsedForm,
                    password: "",
                    confirmPassword: ""
                }));
            }

            if (savedStep) {
                const parsedStep = parseInt(savedStep, 10);
                // Clamp parsed step between 0 and 4 (exclude celebration screen on reload)
                if (parsedStep >= 0 && parsedStep <= 4) {
                    setStep(parsedStep);
                }
            }

            if (savedGeo) {
                setSelectedGeo(JSON.parse(savedGeo));
            }

            if (savedAddress) {
                setGeoAddress(savedAddress);
            }
        } catch (e) {
            console.error("Failed to recover onboarding state:", e);
        }
    }, []);

    // 2. Persist Form Progress to Session Storage (Omitting password details for safety)
    const persistFormState = (updatedForm: typeof formData, currentStep: number) => {
        try {
            const { password, confirmPassword, ...safeFormData } = updatedForm;
            sessionStorage.setItem("sosika_onboarding_form", JSON.stringify(safeFormData));
            sessionStorage.setItem("sosika_onboarding_step", currentStep.toString());
            
            if (selectedGeo) {
                sessionStorage.setItem("sosika_onboarding_geo", JSON.stringify(selectedGeo));
            }
            if (geoAddress) {
                sessionStorage.setItem("sosika_onboarding_address", geoAddress);
            }
        } catch (e) {
            console.warn("Failed to persist onboarding state:", e);
        }
    };

    // Clean up temporary image preview urls
    useEffect(() => {
        return () => {
            if (coverPreview) {
                URL.revokeObjectURL(coverPreview);
            }
        };
    }, [coverPreview]);

    const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        if (file) {
            const err = validateFile(file, { maxSizeMB: 5, allowedTypes: ["image/*"], fieldName: "Cover Image" });
            if (err) {
                setErrors(prev => ({ ...prev, coverFile: err }));
                setCoverFile(null);
                setCoverPreview(null);
            } else {
                setErrors(prev => ({ ...prev, coverFile: null }));
                setCoverFile(file);
                if (coverPreview) URL.revokeObjectURL(coverPreview);
                setCoverPreview(URL.createObjectURL(file));
            }
        }
    };

    const handleLicenseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        if (file) {
            const err = validateFile(file, { maxSizeMB: 10, allowedTypes: [".pdf", "image/*"], fieldName: "Business License" });
            if (err) {
                setErrors(prev => ({ ...prev, licenseFile: err }));
                setLicenseFile(null);
            } else {
                setErrors(prev => ({ ...prev, licenseFile: null }));
                setLicenseFile(file);
            }
        }
    };

    const onMapLoad = useCallback((map: google.maps.Map) => {
        mapRef.current = map;
        geocoderRef.current = new google.maps.Geocoder();
    }, []);

    const updateMapSelection = useCallback((pos: { lat: number; lng: number }, address: string) => {
        setSelectedGeo(pos);
        setGeoAddress(address);
        
        // Save temporary geo coordinates to sessionStorage
        try {
            sessionStorage.setItem("sosika_onboarding_geo", JSON.stringify(pos));
            sessionStorage.setItem("sosika_onboarding_address", address);
        } catch (e) {}

        if (mapRef.current) {
            if (markerRef.current) markerRef.current.map = null;
            markerRef.current = new google.maps.marker.AdvancedMarkerElement({
                position: pos,
                map: mapRef.current,
            });
            mapRef.current.panTo(pos);
            mapRef.current.setZoom(15);
        }
    }, []);

    // Cleanup marker reference on component unmount
    useEffect(() => {
        return () => {
            if (markerRef.current) {
                markerRef.current.map = null;
            }
        };
    }, []);

    const reverseGeocode = useCallback(async (pos: { lat: number; lng: number }) => {
        if (!geocoderRef.current) return "Selected Spot Location";
        try {
            const response = await geocoderRef.current.geocode({ location: pos });
            return response.results[0]?.formatted_address || "Custom Spot Location";
        } catch (error) {
            console.error(error);
            return "Selected Spot Location";
        }
    }, []);

    const handleMapClick = async (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
        const address = await reverseGeocode(pos);
        updateMapSelection(pos, address);
    };

    const onPlaceChanged = () => {
        if (autocomplete) {
            const place = autocomplete.getPlace();
            if (place.geometry?.location) {
                const pos = {
                    lat: place.geometry.location.lat(),
                    lng: place.geometry.location.lng(),
                };
                updateMapSelection(pos, place.formatted_address || "Search Result");
            }
        }
    };

    const handleGeolocate = () => {
        if (!navigator.geolocation) return;
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const pos = { lat: position.coords.latitude, lng: position.coords.longitude };
                const address = await reverseGeocode(pos);
                updateMapSelection(pos, address);
                setIsLocating(false);
            },
            () => {
                toast({ title: "Location Error", description: "Enable location permissions to automatically locate your restaurant.", variant: "destructive" });
                setIsLocating(false);
            }
        );
    };

    // Step Transition and Front-end Validation Gates
    const handleNextStep = (e: React.FormEvent) => {
        e.preventDefault();

        // 1. Validation check for Step 1: Owner Identity
        if (step === 1) {
            const nameErr = validateName(formData.ownerName, "Owner name");
            const emailErr = validateEmail(formData.email);
            const phoneErr = validatePhone(formData.phone);
            const passErr = validatePassword(formData.password);
            
            let confirmPassErr: string | null = null;
            if (formData.password !== formData.confirmPassword) {
                confirmPassErr = "Passwords do not match.";
            }

            if (nameErr || emailErr || phoneErr || passErr || confirmPassErr) {
                setErrors({
                    ownerName: nameErr,
                    email: emailErr,
                    phone: phoneErr,
                    password: passErr,
                    confirmPassword: confirmPassErr
                });
                toast({
                    title: "Validation Incomplete",
                    description: "Please resolve form fields errors before continuing.",
                    variant: "destructive"
                });
                return;
            }

            // Formatting step: Clean Tanzanian phone formats to standardized format
            setFormData(prev => {
                const formatted = { ...prev, phone: formatTanzanianPhone(prev.phone) };
                persistFormState(formatted, 2);
                return formatted;
            });
            setStep(2);
            return;
        }

        // 2. Validation check for Step 2: Spot Brand Profiles
        if (step === 2) {
            const spotNameErr = validateName(formData.spotName, "Spot name");
            let coverErr: string | null = null;
            if (!coverFile) {
                coverErr = "A cover banner photo is required for your storefront listing.";
            }

            let licenseErr: string | null = null;
            if (formData.isRegistered && !licenseFile) {
                licenseErr = "Compliance documentation is required since registration was declared.";
            }

            if (spotNameErr || coverErr || licenseErr) {
                setErrors({
                    spotName: spotNameErr,
                    coverFile: coverErr,
                    licenseFile: licenseErr
                });
                toast({
                    title: "Brand Setup Incomplete",
                    description: "Please provide a valid spot name and upload required files.",
                    variant: "destructive"
                });
                return;
            }

            persistFormState(formData, 3);
            setStep(3);
            return;
        }

        // 3. Validation check for Step 3: Location
        if (step === 3) {
            if (!selectedGeo) {
                toast({
                    title: "Location Unmapped",
                    description: "You must select your restaurant coordinates on the mapping grid.",
                    variant: "destructive"
                });
                return;
            }

            persistFormState(formData, 4);
            setStep(4);
            return;
        }

        // Catch-all generic transition for Step 0 (welcome screen)
        const nextStep = step + 1;
        persistFormState(formData, nextStep);
        setStep(nextStep);
    };

    const handleOnboardingSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!selectedGeo || !coverFile) {
            toast({ title: "Submission Blocked", description: "Incomplete geolocation or cover assets.", variant: "destructive" });
            setStep(2);
            return;
        }

        setSubmitting(true);

        try {
            // Step A: Register Firebase Auth Account
            const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
            const uid = userCredential.user.uid;
            
            // Step B: Send Email Verification Link immediately
            await sendEmailVerification(userCredential.user);

            // Step C: Upload Brand Banner Assets to Cloudinary
            const coverImageUrl = await uploadToCloudinary(coverFile);
            
            let businessLicenseUrl = "";
            if (formData.isRegistered && licenseFile) {
                businessLicenseUrl = await uploadToCloudinary(licenseFile);
            }

            // Save standard location coordinates back to context storage
            saveLocation({ address: geoAddress, lat: selectedGeo.lat, lng: selectedGeo.lng });

            const computedSlug = formData.spotName
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)+/g, "");

            // Step D: Write Structured Firestore Record
            await setDoc(doc(db, "vendors", uid), {
                // Root Level Properties (Marketplace Engine fields)
                averageRating: 5, // Fresh start at baseline 5 rating
                ratingCount: 0,
                college_id: Number(formData.collegeId),
                cover_image_url: coverImageUrl,
                featured_rank: 0,
                is_featured: false,
                is_open: false,
                name: formData.spotName,
                owner_name: formData.ownerName,
                short_description: `Fresh menu items served from ${formData.spotName}.`,
                full_description: `Welcome to ${formData.spotName}. We prepare and serve premium cuisines directly to students.`,
                slug: computedSlug,
                service_area: ["Arusha"], // Static region
                geolocation: {
                    lat: selectedGeo.lat,
                    lng: selectedGeo.lng
                },

                // Authentication Map Block (Multi-modal dashboard login indexes)
                auth_info: {
                    owner_name: formData.ownerName,
                    email: formData.email,
                    phone_number: formData.phone,
                    created_at: new Date().toISOString(),
                    is_approved: false, // Subject to admin vetting
                },

                // Gated Subscription Map Block
                subscription: {
                    tier: "free",
                    status: "active",
                    expires_at: null,
                    features_enabled: { analytics: false, recommendations: false, sms_notifications: false }
                },

                // Compliance Tracking Block
                compliance: {
                    is_registered: formData.isRegistered,
                    license_url: businessLicenseUrl || null
                },

                // Legacy Matches Block
                listing_data: {
                    name: formData.spotName,
                    owner_name: formData.ownerName,
                    is_open: false,
                    opening_hours: "Contact for hours",
                    ratingCount: 0
                }
            });

            // Wipe onboarding cache on success
            sessionStorage.removeItem("sosika_onboarding_form");
            sessionStorage.removeItem("sosika_onboarding_step");
            sessionStorage.removeItem("sosika_onboarding_geo");
            sessionStorage.removeItem("sosika_onboarding_address");

            toast({ title: "Account Initialized", description: "Vendor application successfully registered." });
            setStep(5); // Go to celebration/success screen
        } catch (err: any) {
            const friendlyMsg = getFriendlyErrorMessage(err);
            toast({ title: "Registration Stopped", description: friendlyMsg, variant: "destructive" });
        } finally {
            setSubmitting(false);
        }
    };

    const handleJumpToStep = (targetStep: number) => {
        if (targetStep >= 1 && targetStep <= 4) {
            setStep(targetStep);
            try {
                sessionStorage.setItem("sosika_onboarding_step", targetStep.toString());
            } catch (e) {}
        }
    };

    if (loadError) return <div role="alert" className="min-h-screen flex items-center justify-center bg-[#0a0a0b] text-red-400 font-sans p-6 text-center border border-red-500/10">Map engine failed to initialize. Check API keys and network.</div>;
    if (!isLoaded) return <div aria-live="polite" className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0b] gap-3 font-sans"><Loader2 className="w-9 h-9 text-[#00bfff] animate-spin" /><span className="text-sm text-zinc-500 tracking-wider">Mounting Mapping Engines...</span></div>;

    // Password strength evaluation
    const strengthData = formData.password ? getPasswordStrength(formData.password) : null;

    return (
        <div className="min-h-screen bg-[#0a0a0b] text-white p-4 flex flex-col items-center justify-center selection:bg-[#00bfff]/20 font-sans antialiased relative overflow-hidden">
            
            {/* Background elements */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none">
                <div className="absolute top-[-10%] left-[20%] w-[30rem] h-[30rem] rounded-full bg-[#00bfff]/5 blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[10%] w-[25rem] h-[25rem] rounded-full bg-pink-500/[0.03] blur-[120px]" />
            </div>

            <div className="w-full max-w-md bg-white/[0.02] border border-white/[0.05] backdrop-blur-md rounded-2xl p-7 space-y-6 shadow-2xl relative z-10">

                {/* Progress Header (Hidden on Welcome Screen Step 0 & Success Step 5) */}
                {step > 0 && step < 5 && (
                    <div className="flex items-center justify-between pb-3 border-b border-white/[0.05]">
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    const prevStep = step - 1;
                                    setStep(prevStep);
                                    try { sessionStorage.setItem("sosika_onboarding_step", prevStep.toString()); } catch (e) {}
                                }}
                                aria-label="Return to previous screen"
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-all focus:ring-2 focus:ring-[#00bfff] outline-none"
                            >
                                <ChevronLeft className="w-4 h-4 text-zinc-400" aria-hidden="true" />
                            </button>
                            <div>
                                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Phase {step} of 4</p>
                                <h2 className="text-sm font-bold tracking-tight">
                                    {step === 1 ? "Partner Profile" : step === 2 ? "Spot Customization" : step === 3 ? "Physical Location" : "Review & Launch"}
                                </h2>
                            </div>
                        </div>
                        <div className="flex gap-1" aria-hidden="true">
                            {[1, 2, 3, 4].map((s) => (
                                <div key={s} className={`w-2 h-2 rounded-full transition-all duration-300 ${step >= s ? "bg-[#00bfff]" : "bg-white/[0.1]"}`} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Main Form/Views */}
                <form onSubmit={step === 4 ? handleOnboardingSubmit : handleNextStep} className="space-y-4">
                    <AnimatePresence mode="wait">

                        {/* STEP 0: Welcome Screen */}
                        {step === 0 && (
                            <motion.div 
                                key="step0" 
                                initial={{ opacity: 0, y: 15 }} 
                                animate={{ opacity: 1, y: 0 }} 
                                exit={{ opacity: 0, y: -15 }}
                                className="space-y-6 py-2"
                            >
                                <div className="text-center space-y-2">
                                    <div className="w-14 h-14 rounded-full bg-[#00bfff]/10 text-[#00bfff] flex items-center justify-center mx-auto mb-2 border border-[#00bfff]/20 animate-pulse">
                                        <Sparkles size={28} />
                                    </div>
                                    <h1 className="text-2xl font-black tracking-tight">Grow Your Kitchen on Sosika</h1>
                                    <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
                                        Tap into thousands of hungry student customers on campus. Accept orders, schedule prep, and expand your brand.
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    {[
                                        { title: "Expand Customer Base", desc: "Instantly display your dishes to active students on campus.", icon: Sparkles },
                                        { title: "Live Dispatch Panel", desc: "Professional, real-time ticket manager to run orders smoothly.", icon: Clock },
                                        { title: "Direct Revenue Streams", desc: "Detailed gross stats and transparent client payments.", icon: Building2 }
                                    ].map((item, i) => {
                                        const Icon = item.icon;
                                        return (
                                            <div key={i} className="flex gap-3 bg-white/[0.01] border border-white/[0.04] p-3.5 rounded-xl">
                                                <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-white/5 flex items-center justify-center text-[#00bfff] shrink-0">
                                                    <Icon size={16} />
                                                </div>
                                                <div>
                                                    <h3 className="text-xs font-bold text-white">{item.title}</h3>
                                                    <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">{item.desc}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="pt-2 space-y-4">
                                    <button 
                                        type="submit" 
                                        className="w-full bg-[#00bfff] hover:bg-[#00a8e6] text-black font-extrabold py-4 rounded-xl text-sm transition-all flex items-center justify-center gap-2 outline-none focus:ring-2 focus:ring-[#00bfff] active:scale-[0.99] shadow-lg shadow-[#00bfff]/10"
                                    >
                                        <span>Start Partnership Signup</span>
                                        <ArrowRight size={16} />
                                    </button>
                                    
                                    <button 
                                        type="button"
                                        onClick={() => navigate("/vendor-auth")}
                                        className="w-full bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] text-zinc-300 font-semibold py-3.5 rounded-xl text-xs transition-all outline-none"
                                    >
                                        Already registered? Sign In
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 1: Owner Credentials */}
                        {step === 1 && (
                            <motion.div 
                                key="step1" 
                                initial={{ opacity: 0, x: -10 }} 
                                animate={{ opacity: 1, x: 0 }} 
                                exit={{ opacity: 0, x: 10 }} 
                                className="space-y-4"
                            >
                                {/* Owner Name */}
                                <div className="space-y-1">
                                    <label htmlFor={ownerNameId} className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">Owner's Full Name</label>
                                    <div className="relative group">
                                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 w-4 h-4 group-focus-within:text-[#00bfff] transition-colors" aria-hidden="true" />
                                        <input 
                                            id={ownerNameId} 
                                            type="text" 
                                            required 
                                            placeholder="e.g. Issa Buruhani" 
                                            value={formData.ownerName} 
                                            onChange={e => {
                                                setFormData({ ...formData, ownerName: e.target.value });
                                                if (errors.ownerName) setErrors({ ...errors, ownerName: null });
                                            }} 
                                            aria-invalid={!!errors.ownerName}
                                            aria-describedby={errors.ownerName ? "owner-name-error" : undefined}
                                            className={`w-full bg-white/[0.03] border rounded-xl py-3 pl-11 pr-4 text-sm outline-none focus:bg-white/[0.05] transition-all placeholder-zinc-700 ${errors.ownerName ? "border-red-500/50 focus:border-red-500" : "border-white/[0.08] focus:border-[#00bfff]/40"}`} 
                                        />
                                    </div>
                                    {errors.ownerName && <p id="owner-name-error" className="text-[11px] text-red-400 mt-1 flex items-center gap-1" role="alert"><span className="w-1 h-1 rounded-full bg-red-500 shrink-0"></span>{errors.ownerName}</p>}
                                </div>

                                {/* Business Email */}
                                <div className="space-y-1">
                                    <label htmlFor={emailId} className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">Business Email Address</label>
                                    <div className="relative group">
                                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 w-4 h-4 group-focus-within:text-[#00bfff] transition-colors" aria-hidden="true" />
                                        <input 
                                            id={emailId} 
                                            type="email" 
                                            required 
                                            placeholder="owner@restaurant.com" 
                                            value={formData.email} 
                                            onChange={e => {
                                                setFormData({ ...formData, email: e.target.value });
                                                if (errors.email) setErrors({ ...errors, email: null });
                                            }} 
                                            aria-invalid={!!errors.email}
                                            aria-describedby={errors.email ? "email-error" : undefined}
                                            className={`w-full bg-white/[0.03] border rounded-xl py-3 pl-11 pr-4 text-sm outline-none focus:bg-white/[0.05] transition-all placeholder-zinc-700 ${errors.email ? "border-red-500/50 focus:border-red-500" : "border-white/[0.08] focus:border-[#00bfff]/40"}`} 
                                        />
                                    </div>
                                    {errors.email && <p id="email-error" className="text-[11px] text-red-400 mt-1 flex items-center gap-1" role="alert"><span className="w-1 h-1 rounded-full bg-red-500 shrink-0"></span>{errors.email}</p>}
                                </div>

                                {/* Phone number */}
                                <div className="space-y-1">
                                    <label htmlFor={phoneId} className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">Phone Number (Tanzania)</label>
                                    <div className="relative group">
                                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 w-4 h-4 group-focus-within:text-[#00bfff] transition-colors" aria-hidden="true" />
                                        <input 
                                            id={phoneId} 
                                            type="tel" 
                                            required 
                                            placeholder="e.g. +255 712 345 678 or 0712 345 678" 
                                            value={formData.phone} 
                                            onChange={e => {
                                                setFormData({ ...formData, phone: e.target.value });
                                                if (errors.phone) setErrors({ ...errors, phone: null });
                                            }} 
                                            aria-invalid={!!errors.phone}
                                            aria-describedby={errors.phone ? "phone-error" : undefined}
                                            className={`w-full bg-white/[0.03] border rounded-xl py-3 pl-11 pr-4 text-sm outline-none focus:bg-white/[0.05] transition-all placeholder-zinc-700 ${errors.phone ? "border-red-500/50 focus:border-red-500" : "border-white/[0.08] focus:border-[#00bfff]/40"}`} 
                                        />
                                    </div>
                                    {errors.phone && <p id="phone-error" className="text-[11px] text-red-400 mt-1 flex items-center gap-1" role="alert"><span className="w-1 h-1 rounded-full bg-red-500 shrink-0"></span>{errors.phone}</p>}
                                </div>

                                {/* Password */}
                                <div className="space-y-1">
                                    <label htmlFor={passwordId} className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">Create Account Password</label>
                                    <div className="relative group">
                                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 w-4 h-4 group-focus-within:text-[#00bfff] transition-colors" aria-hidden="true" />
                                        <input 
                                            id={passwordId} 
                                            type={showPassword ? "text" : "password"} 
                                            required 
                                            placeholder="Minimum 6 characters" 
                                            value={formData.password} 
                                            onChange={e => {
                                                setFormData({ ...formData, password: e.target.value });
                                                if (errors.password) setErrors({ ...errors, password: null });
                                            }} 
                                            aria-invalid={!!errors.password}
                                            aria-describedby={errors.password ? "password-error" : undefined}
                                            className={`w-full bg-white/[0.03] border rounded-xl py-3 pl-11 pr-12 text-sm outline-none focus:bg-white/[0.05] transition-all placeholder-zinc-700 ${errors.password ? "border-red-500/50 focus:border-red-500" : "border-white/[0.08] focus:border-[#00bfff]/40"}`} 
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors focus:outline-none"
                                            aria-label={showPassword ? "Hide password" : "Show password"}
                                        >
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    
                                    {/* Password strength meter */}
                                    {formData.password && strengthData && (
                                        <div className="space-y-1.5 pt-1">
                                            <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500 uppercase">
                                                <span>Strength: {strengthData.feedback}</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-white/[0.04] rounded-full flex gap-0.5">
                                                {[0, 1, 2, 3].map((idx) => {
                                                    const isFilled = strengthData.score > idx;
                                                    let colorClass = "bg-red-500/50";
                                                    if (strengthData.score >= 3) colorClass = "bg-[#00bfff]";
                                                    else if (strengthData.score >= 2) colorClass = "bg-amber-500";
                                                    return (
                                                        <div 
                                                            key={idx} 
                                                            className={`h-full flex-1 rounded-full transition-colors duration-300 ${isFilled ? colorClass : "bg-white/[0.03]"}`} 
                                                        />
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                    {errors.password && <p id="password-error" className="text-[11px] text-red-400 mt-1 flex items-center gap-1" role="alert"><span className="w-1 h-1 rounded-full bg-red-500 shrink-0"></span>{errors.password}</p>}
                                </div>

                                {/* Confirm Password */}
                                <div className="space-y-1">
                                    <label htmlFor={confirmPasswordId} className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">Confirm Password</label>
                                    <div className="relative group">
                                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 w-4 h-4 group-focus-within:text-[#00bfff] transition-colors" aria-hidden="true" />
                                        <input 
                                            id={confirmPasswordId} 
                                            type={showConfirmPassword ? "text" : "password"} 
                                            required 
                                            placeholder="Retype password key" 
                                            value={formData.confirmPassword} 
                                            onChange={e => {
                                                setFormData({ ...formData, confirmPassword: e.target.value });
                                                if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: null });
                                            }} 
                                            aria-invalid={!!errors.confirmPassword}
                                            aria-describedby={errors.confirmPassword ? "confirm-password-error" : undefined}
                                            className={`w-full bg-white/[0.03] border rounded-xl py-3 pl-11 pr-12 text-sm outline-none focus:bg-white/[0.05] transition-all placeholder-zinc-700 ${errors.confirmPassword ? "border-red-500/50 focus:border-red-500" : "border-white/[0.08] focus:border-[#00bfff]/40"}`} 
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors focus:outline-none"
                                            aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                                        >
                                            {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    {errors.confirmPassword && <p id="confirm-password-error" className="text-[11px] text-red-400 mt-1 flex items-center gap-1" role="alert"><span className="w-1 h-1 rounded-full bg-red-500 shrink-0"></span>{errors.confirmPassword}</p>}
                                </div>

                                <button 
                                    type="submit" 
                                    className="w-full bg-white text-black font-extrabold py-3.5 rounded-xl text-sm transition-all hover:bg-zinc-200 focus:ring-2 focus:ring-[#00bfff] outline-none active:scale-[0.99] mt-2 shadow-lg"
                                >
                                    Proceed to Brand Setup
                                </button>
                                
                                <div className="flex items-center justify-center gap-1 text-xs text-zinc-500 pt-2">
                                    <p>Already have an account?</p>
                                    <button 
                                        type="button"
                                        onClick={() => navigate("/vendor-auth")}
                                        className="text-[#00bfff] font-bold hover:underline outline-none"
                                    >
                                        Sign In
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 2: Spot Brand Profiles */}
                        {step === 2 && (
                            <motion.div 
                                key="step2" 
                                initial={{ opacity: 0, x: -10 }} 
                                animate={{ opacity: 1, x: 0 }} 
                                exit={{ opacity: 0, x: 10 }} 
                                className="space-y-4"
                            >
                                {/* Spot/Restaurant Name */}
                                <div className="space-y-1">
                                    <label htmlFor={spotNameId} className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">Spot / Restaurant Name</label>
                                    <div className="relative group">
                                        <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 w-4 h-4 group-focus-within:text-[#00bfff] transition-colors" aria-hidden="true" />
                                        <input 
                                            id={spotNameId} 
                                            type="text" 
                                            required 
                                            placeholder="e.g. Swahili Bites" 
                                            value={formData.spotName} 
                                            onChange={e => {
                                                setFormData({ ...formData, spotName: e.target.value });
                                                if (errors.spotName) setErrors({ ...errors, spotName: null });
                                            }} 
                                            aria-invalid={!!errors.spotName}
                                            aria-describedby={errors.spotName ? "spot-name-error" : undefined}
                                            className={`w-full bg-white/[0.03] border rounded-xl py-3 pl-11 pr-4 text-sm outline-none focus:bg-white/[0.05] transition-all placeholder-zinc-700 ${errors.spotName ? "border-red-500/50 focus:border-red-500" : "border-white/[0.08] focus:border-[#00bfff]/40"}`} 
                                        />
                                    </div>
                                    {errors.spotName && <p id="spot-name-error" className="text-[11px] text-red-400 mt-1 flex items-center gap-1" role="alert"><span className="w-1 h-1 rounded-full bg-red-500 shrink-0"></span>{errors.spotName}</p>}
                                </div>

                                {/* Spot Cover Image Upload */}
                                <div className="space-y-1">
                                    <span className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">Spot Cover Banner (Max 5MB)</span>
                                    
                                    {/* Cover image preview card */}
                                    {coverPreview ? (
                                        <div className="relative h-24 w-full rounded-xl overflow-hidden border border-white/10 group mb-1.5 bg-black">
                                            <img src={coverPreview} alt="Cover Banner Preview" className="w-full h-full object-cover opacity-80" />
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setCoverFile(null);
                                                        setCoverPreview(null);
                                                    }}
                                                    className="p-2 rounded-full bg-red-500/80 text-white hover:bg-red-600 transition-colors"
                                                    aria-label="Remove uploaded image"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                            <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[10px] font-bold text-zinc-300 truncate max-w-[80%]">
                                                {coverFile?.name}
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => coverInputRef.current?.click()}
                                            aria-label="Click to upload restaurant cover banner"
                                            className={`w-full text-left border border-dashed hover:border-[#00bfff]/30 bg-white/[0.01] rounded-xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all outline-none focus:ring-2 focus:ring-[#00bfff] ${errors.coverFile ? "border-red-500/50" : "border-white/[0.1]"}`}
                                        >
                                            <input 
                                                type="file" 
                                                ref={coverInputRef} 
                                                accept="image/*" 
                                                className="hidden" 
                                                tabIndex={-1} 
                                                onChange={handleCoverChange} 
                                            />
                                            <Upload size={18} className="text-zinc-500" aria-hidden="true" />
                                            <span className="text-xs text-zinc-400 font-bold">Select storefront photo</span>
                                            <span className="text-[10px] text-zinc-600">PNG, JPG, or WEBP up to 5MB</span>
                                        </button>
                                    )}
                                    {errors.coverFile && <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1" role="alert"><span className="w-1 h-1 rounded-full bg-red-500 shrink-0"></span>{errors.coverFile}</p>}
                                </div>

                                {/* Business Registration compliance checkbox */}
                                <div className="p-4 bg-white/[0.01] border border-white/[0.05] rounded-xl space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label htmlFor={registeredId} className="flex items-center gap-2.5 text-xs font-semibold cursor-pointer">
                                            <FileText size={16} className="text-[#00bfff]" aria-hidden="true" />
                                            <span>Registered Business Entity?</span>
                                        </label>
                                        <input 
                                            id={registeredId} 
                                            type="checkbox" 
                                            checked={formData.isRegistered} 
                                            onChange={e => {
                                                setFormData({ ...formData, isRegistered: e.target.checked });
                                                // Clear license file error if checkbox unchecked
                                                if (!e.target.checked) setErrors(prev => ({ ...prev, licenseFile: null }));
                                            }} 
                                            className="rounded bg-zinc-900 border-white/[0.2] text-[#00bfff] focus:ring-2 focus:ring-[#00bfff] focus:ring-offset-0 accent-[#00bfff] h-4 w-4" 
                                        />
                                    </div>

                                    {formData.isRegistered && (
                                        <motion.div 
                                            initial={{ height: 0, opacity: 0 }} 
                                            animate={{ height: "auto", opacity: 1 }} 
                                            exit={{ height: 0, opacity: 0 }}
                                            className="pt-3 border-t border-white/[0.05] space-y-2"
                                        >
                                            <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Business License (PDF / Image Max 10MB)</span>
                                            <button
                                                type="button"
                                                onClick={() => licenseInputRef.current?.click()}
                                                className={`w-full text-left border border-dashed bg-white/[0.02] rounded-lg p-3.5 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-[#00bfff]/20 transition-all outline-none focus:ring-2 focus:ring-[#00bfff] ${errors.licenseFile ? "border-red-500/50" : "border-white/[0.1]"}`}
                                            >
                                                <input 
                                                    type="file" 
                                                    ref={licenseInputRef} 
                                                    accept=".pdf,image/*" 
                                                    className="hidden" 
                                                    tabIndex={-1} 
                                                    onChange={handleLicenseChange} 
                                                />
                                                {licenseFile ? (
                                                    <div className="flex items-center gap-1.5 text-xs text-[#00bfff] font-bold truncate max-w-full">
                                                        <CheckCircle size={14} className="shrink-0 text-emerald-400" />
                                                        <span className="truncate">{licenseFile.name}</span>
                                                    </div>
                                                ) : (
                                                    <div className="text-center space-y-0.5">
                                                        <span className="text-xs text-zinc-400 font-medium block">Attach documentation file</span>
                                                        <span className="text-[9px] text-zinc-600 block">PDF, PNG, or JPG up to 10MB</span>
                                                    </div>
                                                )}
                                            </button>
                                            {errors.licenseFile && <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1" role="alert"><span className="w-1 h-1 rounded-full bg-red-500 shrink-0"></span>{errors.licenseFile}</p>}
                                        </motion.div>
                                    )}
                                </div>

                                <button 
                                    type="submit" 
                                    className="w-full bg-white text-black font-extrabold py-3.5 rounded-xl text-sm transition-all hover:bg-zinc-200 focus:ring-2 focus:ring-[#00bfff] outline-none active:scale-[0.99] mt-2 shadow-lg"
                                >
                                    Proceed to Physical Mapping
                                </button>
                            </motion.div>
                        )}

                        {/* STEP 3: Integrated Geolocation Interface */}
                        {step === 3 && (
                            <motion.div 
                                key="step3" 
                                initial={{ opacity: 0, x: -10 }} 
                                animate={{ opacity: 1, x: 0 }} 
                                exit={{ opacity: 0, x: 10 }} 
                                className="space-y-4"
                            >
                                <div className="space-y-2">
                                    <Autocomplete onLoad={setAutocomplete} onPlaceChanged={onPlaceChanged}>
                                        <div className="relative group">
                                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 w-4 h-4 group-focus-within:text-[#00bfff] transition-colors" aria-hidden="true" />
                                            <label htmlFor="geo-search-input" className="sr-only">Search spot physical address location</label>
                                            <input 
                                                id="geo-search-input" 
                                                type="text" 
                                                placeholder="Search spot physical address location" 
                                                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl py-3 pl-11 pr-4 text-sm outline-none focus:border-[#00bfff]/40 focus:bg-white/[0.05] focus:ring-2 focus:ring-[#00bfff] transition-all placeholder-zinc-700" 
                                            />
                                        </div>
                                    </Autocomplete>

                                    <div className="grid grid-cols-2 gap-2">
                                        <button 
                                            type="button" 
                                            onClick={handleGeolocate} 
                                            disabled={isLocating} 
                                            className="flex items-center justify-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-xl py-3 text-xs font-bold text-zinc-300 hover:bg-white/[0.06] focus:ring-2 focus:ring-[#00bfff] outline-none transition-all disabled:opacity-50"
                                        >
                                            {isLocating ? <Loader2 size={12} className="animate-spin text-[#00bfff]" /> : <LocateFixed size={12} className="text-[#00bfff]" aria-hidden="true" />}
                                            Pin Coordinates
                                        </button>
                                        
                                        <button 
                                            type="button" 
                                            onClick={() => setShowRecentGeo(!showRecentGeo)} 
                                            disabled={locations.length === 0}
                                            aria-expanded={showRecentGeo} 
                                            className="flex items-center justify-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-xl py-3 text-xs font-bold text-zinc-300 hover:bg-white/[0.06] focus:ring-2 focus:ring-[#00bfff] outline-none transition-all disabled:opacity-40"
                                        >
                                            <Clock size={12} className="text-[#00bfff]" aria-hidden="true" /> 
                                            <span>Recent Spots</span>
                                        </button>
                                    </div>
                                </div>

                                {showRecentGeo && locations.length > 0 && (
                                    <div role="region" aria-label="Recent Locations List" className="bg-white/[0.01] border border-white/[0.05] rounded-xl p-1.5 max-h-28 overflow-y-auto space-y-1">
                                        {locations.slice(0, 3).map((loc, idx) => (
                                            <button 
                                                key={idx} 
                                                type="button" 
                                                onClick={() => {
                                                    updateMapSelection({ lat: loc.lat, lng: loc.lng }, loc.address);
                                                    setShowRecentGeo(false);
                                                }} 
                                                className="w-full text-left p-2.5 hover:bg-white/[0.03] rounded-lg flex items-center gap-2 text-[11px] truncate text-zinc-400 hover:text-white transition-all outline-none focus:bg-white/[0.02]"
                                            >
                                                <MapPin size={12} className="text-zinc-500 shrink-0" aria-hidden="true" /> 
                                                <span className="truncate">{loc.address}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <div className="h-44 rounded-xl overflow-hidden border border-white/[0.06] relative bg-zinc-900">
                                    <GoogleMap
                                        mapContainerStyle={mapContainerStyle}
                                        zoom={13}
                                        center={selectedGeo || { lat: -3.38, lng: 36.70 }}
                                        onLoad={onMapLoad}
                                        onClick={handleMapClick}
                                        options={{
                                            mapId: import.meta.env.VITE_GOOGLE_MAPS_MAP_ID,
                                            disableDefaultUI: true,
                                            zoomControl: true,
                                        }}
                                    />
                                    {!selectedGeo && (
                                        <div className="absolute inset-0 bg-black/50 pointer-events-none flex flex-col items-center justify-center text-center p-4">
                                            <MapPin size={20} className="text-[#00bfff] animate-bounce mb-1.5" />
                                            <p className="text-[11px] text-zinc-400 font-bold max-w-[200px]">Tap on the map grid coordinate to position your kitchen</p>
                                        </div>
                                    )}
                                </div>

                                {selectedGeo && (
                                    <div aria-live="polite" className="text-xs text-zinc-400 flex items-start gap-2 bg-white/[0.02] border border-white/[0.05] p-3 rounded-xl leading-relaxed">
                                        <MapPin size={14} className="text-[#00bfff] shrink-0 mt-0.5" aria-hidden="true" />
                                        <div>
                                            <span className="font-bold text-white block">Mapped Coordinates:</span>
                                            <span className="text-[11px] font-mono text-zinc-500">{selectedGeo.lat.toFixed(6)}, {selectedGeo.lng.toFixed(6)}</span>
                                            <span className="text-[11px] block mt-0.5 break-words">{geoAddress}</span>
                                        </div>
                                    </div>
                                )}

                                <button 
                                    type="submit" 
                                    className="w-full bg-white text-black font-extrabold py-3.5 rounded-xl text-sm transition-all hover:bg-zinc-200 focus:ring-2 focus:ring-[#00bfff] outline-none active:scale-[0.99] mt-2 shadow-lg"
                                >
                                    Proceed to Review & Launch
                                </button>
                            </motion.div>
                        )}

                        {/* STEP 4: Full Review & Edit Mode */}
                        {step === 4 && (
                            <motion.div 
                                key="step4" 
                                initial={{ opacity: 0, x: -10 }} 
                                animate={{ opacity: 1, x: 0 }} 
                                exit={{ opacity: 0, x: 10 }} 
                                className="space-y-4"
                            >
                                <div className="space-y-3">
                                    <p className="text-xs text-zinc-400 leading-relaxed">
                                        Please review all details before creating your partner storefront profile. You can click edit to modify any section.
                                    </p>

                                    {/* Section 1: Owner Profile */}
                                    <div className="bg-white/[0.01] border border-white/[0.04] p-3.5 rounded-xl space-y-2">
                                        <div className="flex justify-between items-center pb-1.5 border-b border-white/[0.03]">
                                            <h3 className="text-xs font-extrabold text-[#00bfff] uppercase tracking-wider flex items-center gap-1.5">
                                                <User size={12} />
                                                <span>Partner Identity</span>
                                            </h3>
                                            <button 
                                                type="button" 
                                                onClick={() => handleJumpToStep(1)}
                                                className="text-[10px] font-bold text-zinc-400 hover:text-white hover:underline outline-none"
                                            >
                                                Edit
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div>
                                                <span className="text-[10px] text-zinc-500 block uppercase">Full Name</span>
                                                <span className="text-zinc-300 font-semibold truncate block">{formData.ownerName}</span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-zinc-500 block uppercase">Phone Number</span>
                                                <span className="text-zinc-300 font-mono font-semibold truncate block">{formData.phone}</span>
                                            </div>
                                            <div className="col-span-2">
                                                <span className="text-[10px] text-zinc-500 block uppercase">Email Address</span>
                                                <span className="text-zinc-300 font-semibold truncate block">{formData.email}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section 2: Restaurant Customization */}
                                    <div className="bg-white/[0.01] border border-white/[0.04] p-3.5 rounded-xl space-y-2">
                                        <div className="flex justify-between items-center pb-1.5 border-b border-white/[0.03]">
                                            <h3 className="text-xs font-extrabold text-[#00bfff] uppercase tracking-wider flex items-center gap-1.5">
                                                <Building2 size={12} />
                                                <span>Storefront Customization</span>
                                            </h3>
                                            <button 
                                                type="button" 
                                                onClick={() => handleJumpToStep(2)}
                                                className="text-[10px] font-bold text-zinc-400 hover:text-white hover:underline outline-none"
                                            >
                                                Edit
                                            </button>
                                        </div>
                                        <div className="space-y-1.5 text-xs">
                                            <div>
                                                <span className="text-[10px] text-zinc-500 block uppercase">Restaurant Name</span>
                                                <span className="text-zinc-300 font-semibold block">{formData.spotName}</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 pt-1">
                                                <div>
                                                    <span className="text-[10px] text-zinc-500 block uppercase">Storefront Image</span>
                                                    <span className="text-zinc-400 truncate block text-[11px]">{coverFile?.name}</span>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] text-zinc-500 block uppercase">Compliance Vetting</span>
                                                    <span className="text-zinc-400 block text-[11px]">
                                                        {formData.isRegistered ? (licenseFile ? "Registered (license attached)" : "Registered (no file)") : "Not Registered"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section 3: Physical Mapping */}
                                    <div className="bg-white/[0.01] border border-white/[0.04] p-3.5 rounded-xl space-y-2">
                                        <div className="flex justify-between items-center pb-1.5 border-b border-white/[0.03]">
                                            <h3 className="text-xs font-extrabold text-[#00bfff] uppercase tracking-wider flex items-center gap-1.5">
                                                <MapPin size={12} />
                                                <span>Physical Location</span>
                                            </h3>
                                            <button 
                                                type="button" 
                                                onClick={() => handleJumpToStep(3)}
                                                className="text-[10px] font-bold text-zinc-400 hover:text-white hover:underline outline-none"
                                            >
                                                Edit
                                            </button>
                                        </div>
                                        <div className="text-xs space-y-1">
                                            <span className="text-[10px] text-zinc-500 block uppercase">Physical Location Address</span>
                                            <span className="text-zinc-300 block leading-normal break-words">{geoAddress || "Unmapped coordinate"}</span>
                                            {selectedGeo && (
                                                <span className="text-[10px] font-mono text-zinc-500 block">{selectedGeo.lat.toFixed(6)}, {selectedGeo.lng.toFixed(6)}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <button 
                                    type="submit" 
                                    disabled={submitting} 
                                    className="w-full bg-[#00bfff] hover:bg-[#00a8e6] text-black font-extrabold py-4 rounded-xl shadow-lg shadow-[#00bfff]/10 transition-all text-sm flex items-center justify-center disabled:opacity-40 outline-none focus:ring-2 focus:ring-[#00bfff] mt-2 active:scale-[0.99]"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" /> 
                                            <span>Building Secure Portal...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Finalize Application Request</span>
                                            <ArrowRight size={16} className="ml-1.5" />
                                        </>
                                    )}
                                </button>
                            </motion.div>
                        )}

                        {/* STEP 5: Success Celebration Screen */}
                        {step === 5 && (
                            <motion.div 
                                key="step5" 
                                initial={{ opacity: 0, scale: 0.95 }} 
                                animate={{ opacity: 1, scale: 1 }} 
                                className="text-center space-y-6 py-4 relative"
                                role="status"
                                aria-live="polite"
                            >
                                {/* Framer Motion Confetti Explosions */}
                                <div className="absolute inset-0 pointer-events-none overflow-hidden h-60 w-full" aria-hidden="true">
                                    {confettiParticles.map(p => (
                                        <motion.div
                                            key={p.id}
                                            className="absolute w-2.5 h-2.5 rounded-sm"
                                            style={{ backgroundColor: p.color, left: "50%", bottom: "10%" }}
                                            initial={{ x: 0, y: 0, scale: 0.1, rotate: 0, opacity: 1 }}
                                            animate={{ 
                                                x: p.x, 
                                                y: p.y, 
                                                scale: p.scale, 
                                                rotate: p.rotation,
                                                opacity: [1, 1, 1, 0]
                                            }}
                                            transition={{ 
                                                duration: p.duration, 
                                                delay: p.delay, 
                                                ease: "easeOut",
                                                times: [0, 0.7, 0.85, 1]
                                            }}
                                        />
                                    ))}
                                </div>

                                <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-500/20 relative z-10">
                                    <Sparkles size={32} className="animate-pulse" />
                                </div>

                                <div className="space-y-2 relative z-10">
                                    <h1 className="text-2xl font-black tracking-tight">Application Transmitted!</h1>
                                    <p className="text-xs text-zinc-400 leading-relaxed max-w-xs mx-auto">
                                        Congratulations, your restaurant registration for <strong className="text-white font-semibold">{formData.spotName}</strong> is complete. We've queued your profile credentials.
                                    </p>
                                </div>

                                {/* Onboarding Timeline Progress indicator */}
                                <div className="bg-white/[0.01] border border-white/[0.04] p-4 rounded-xl text-left space-y-3 relative z-10 max-w-sm mx-auto">
                                    <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block border-b border-white/[0.03] pb-1.5">Onboarding Roadmap:</h3>
                                    
                                    <div className="space-y-4">
                                        {[
                                            { step: "Activate Email Account", desc: `Click the validation link we re-routed to your inbox at ${formData.email}.`, done: true },
                                            { step: "Administration Review", desc: "Sosika moderators review compliance filings and coordinates (usually within 12 hours).", done: false },
                                            { step: "Launch Cuisines Dashboard", desc: "Sign into your operational console to start accepting campus food delivery streams.", done: false }
                                        ].map((road, i) => (
                                            <div key={i} className="flex gap-3">
                                                <div className="flex flex-col items-center shrink-0">
                                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold ${road.done ? "bg-[#00bfff] text-black" : "bg-zinc-900 border border-white/10 text-zinc-500"}`}>
                                                        {road.done ? <Check size={10} strokeWidth={3} /> : i + 1}
                                                    </div>
                                                    {i < 2 && <div className="w-[1px] h-6 bg-white/[0.04] mt-1" />}
                                                </div>
                                                <div className="space-y-0.5">
                                                    <h4 className="text-xs font-bold text-white leading-none">{road.step}</h4>
                                                    <p className="text-[10.5px] text-zinc-500 leading-relaxed">{road.desc}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-2 relative z-10">
                                    <button 
                                        type="button" 
                                        onClick={() => navigate("/vendor-auth")} 
                                        className="w-full bg-[#00bfff] hover:bg-[#00a8e6] text-black font-extrabold py-3.5 rounded-xl text-sm transition-all outline-none focus:ring-2 focus:ring-[#00bfff]"
                                    >
                                        Go to Sign In Page
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </form>
            </div>
        </div>
    );
}