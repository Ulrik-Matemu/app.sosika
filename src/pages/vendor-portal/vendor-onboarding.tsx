import React, { useState, useRef, useCallback, useEffect, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GoogleMap, Autocomplete } from "@react-google-maps/api";
import {
    Building2, User, Phone, Mail, Lock, FileText, Upload,
    MapPin, Search, LocateFixed, Clock, ChevronLeft, Loader2, CheckCircle
} from "lucide-react";
import { auth, db } from "../../firebase";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useMapLoader } from "../../services/map-provider";
import { useLocationStorage } from "../../hooks/useLocationStorage";
import { useToast } from "../../hooks/use-toast";
import { useNavigate } from "react-router-dom";

const mapContainerStyle = { width: "100%", height: "100%", borderRadius: "1rem" };

export default function VendorOnboarding() {
    const { isLoaded, loadError } = useMapLoader();
    const { locations, saveLocation } = useLocationStorage();
    const { toast } = useToast();
    const navigate = useNavigate();

    // Accessibility unique ID generation
    const ownerNameId = useId();
    const emailId = useId();
    const phoneId = useId();
    const passwordId = useId();
    const spotNameId = useId();
    const registeredId = useId();

    // Step Management
    const [step, setStep] = useState(1);
    const [submitting, setSubmitting] = useState(false);

    // Form States
    const [formData, setFormData] = useState({
        spotName: "",
        ownerName: "",
        phone: "",
        email: "",
        password: "",
        isRegistered: false,
        collegeId: 1,
    });

    // File Upload States
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [licenseFile, setLicenseFile] = useState<File | null>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);
    const licenseInputRef = useRef<HTMLInputElement>(null);

    // Maps States
    const [selectedGeo, setSelectedGeo] = useState<{ lat: number; lng: number } | null>(null);
    const [geoAddress, setGeoAddress] = useState("");
    const [showRecentGeo, setShowRecentGeo] = useState(false);
    const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
    const [isLocating, setIsLocating] = useState(false);

    const mapRef = useRef<google.maps.Map | null>(null);
    const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
    const geocoderRef = useRef<google.maps.Geocoder | null>(null);

    const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

    const uploadToCloudinary = async (file: File): Promise<string> => {
        const data = new FormData();
        data.append("file", file);
        data.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
            { method: "POST", body: data }
        );
        if (!response.ok) throw new Error("Asset upload failed");
        const json = await response.json();
        return json.secure_url;
    };

    const onMapLoad = useCallback((map: google.maps.Map) => {
        mapRef.current = map;
        geocoderRef.current = new google.maps.Geocoder();
    }, []);

    const updateMapSelection = useCallback((pos: { lat: number; lng: number }, address: string) => {
        setSelectedGeo(pos);
        setGeoAddress(address);
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
                toast({ title: "Location Error", description: "Enable location permissions.", variant: "destructive" });
                setIsLocating(false);
            }
        );
    };

    const handleNextStep = (e: React.FormEvent) => {
        e.preventDefault();
        if (step < 3) setStep(prev => prev + 1);
    };

    const handleOnboardingSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedGeo || !coverFile) {
            toast({ title: "Missing Information", description: "Please complete profile assets & geolocation.", variant: "destructive" });
            return;
        }
        setSubmitting(true);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
            const uid = userCredential.user.uid;
            await sendEmailVerification(userCredential.user);

            const coverImageUrl = await uploadToCloudinary(coverFile);
            let businessLicenseUrl = "";
            if (formData.isRegistered && licenseFile) {
                businessLicenseUrl = await uploadToCloudinary(licenseFile);
            }

            saveLocation({ address: geoAddress, lat: selectedGeo.lat, lng: selectedGeo.lng });

            // Generated properties to keep slugs and ratings uniform
            const computedSlug = formData.spotName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");

            // EXACT SCHEMA ALIGNMENT BLOCK
            await setDoc(doc(db, "vendors", uid), {
                // 1. Root Level Fields (Critical for Customer App Fetch & Filtering)
                averageRating: 5, // Default new vendors with baseline 5-star metric
                ratingCount: 0,
                college_id: Number(formData.collegeId),
                cover_image_url: coverImageUrl,
                featured_rank: 0,
                is_featured: false,
                is_open: false,
                name: formData.spotName,
                owner_name: formData.ownerName,
                short_description: "",
                full_description: "",
                slug: computedSlug,
                service_area: ["Arusha"],
                geolocation: {
                    lat: selectedGeo.lat,
                    lng: selectedGeo.lng
                },

                // 2. Auth Map (For your Dashboard Multimodal Auth Loop)
                auth_info: {
                    owner_name: formData.ownerName,
                    email: formData.email,
                    phone_number: formData.phone,
                    created_at: new Date().toISOString(),
                    is_approved: false, // Must be approved by you first
                },

                // 3. Subscription Map (For scaling into Premium Tiers)
                subscription: {
                    tier: "free",
                    status: "active",
                    expires_at: null,
                    features_enabled: { analytics: false, recommendations: false, sms_notifications: false }
                },

                // 4. Compliance Verification Tracking
                compliance: {
                    is_registered: formData.isRegistered,
                    license_url: businessLicenseUrl || null
                },

                // 5. Duplicate Listing Map (Matches legacy "listing_data" structure)
                listing_data: {
                    name: formData.spotName,
                    owner_name: formData.ownerName,
                    is_open: false,
                    opening_hours: "Contact for hours",
                    ratingCount: 0
                }
            });

            toast({ title: "Welcome to Sosika!", description: "Account created. Application pending review." });
            navigate("/vendor-auth");
        } catch (err: any) {
            toast({ title: "Onboarding Error", description: err.message || "Failed to register profile", variant: "destructive" });
        } finally {
            setSubmitting(false);
        }
    };

    if (loadError) return <div role="alert" className="min-h-screen flex items-center justify-center bg-[#0a0a0b] text-red-400">Map initialization crashed.</div>;
    if (!isLoaded) return <div aria-live="polite" className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0b] gap-2"><Loader2 className="w-8 h-8 text-[#00bfff] animate-spin" /><span className="text-sm text-zinc-500">Loading Mapping Engine...</span></div>;

    return (
        <div className="min-h-screen bg-[#0a0a0b] text-white p-4 flex flex-col items-center justify-center selection:bg-[#00bfff]/20">
            <div className="w-full max-w-md bg-white/[0.02] border border-white/[0.05] backdrop-blur-md rounded-2xl p-6 space-y-6 shadow-2xl">

                {/* Progress Header */}
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.05]">
                    <div className="flex items-center gap-3">
                        {step > 1 && (
                            <button
                                type="button"
                                onClick={() => setStep(prev => prev - 1)}
                                aria-label="Go back to previous step"
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00bfff]"
                            >
                                <ChevronLeft className="w-4 h-4 text-zinc-400" aria-hidden="true" />
                            </button>
                        )}
                        <div>
                            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Step {step} of 3</p>
                            <h2 className="text-base font-bold tracking-tight">
                                {step === 1 ? "Account Credentials" : step === 2 ? "Spot Settings" : "Geotarget Location"}
                            </h2>
                        </div>
                    </div>
                    <div className="flex gap-1" aria-hidden="true">
                        {[1, 2, 3].map((s) => (
                            <div key={s} className={`w-2 h-2 rounded-full transition-all duration-300 ${step >= s ? "bg-[#00bfff]" : "bg-white/[0.1]"}`} />
                        ))}
                    </div>
                </div>

                {/* Wizard Form Frame */}
                <form onSubmit={step === 3 ? handleOnboardingSubmit : handleNextStep} className="space-y-4">
                    <AnimatePresence mode="wait">

                        {/* STEP 1: Core Credentials */}
                        {step === 1 && (
                            <motion.div key="step1" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-3.5">
                                <div className="relative group">
                                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 w-4 h-4 group-focus-within:text-[#00bfff] transition-colors" aria-hidden="true" />
                                    <label htmlFor={ownerNameId} className="sr-only">Full Name of Owner</label>
                                    <input id={ownerNameId} type="text" required placeholder="Full Name of Owner" value={formData.ownerName} onChange={e => setFormData({ ...formData, ownerName: e.target.value })} className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl py-3 pl-11 pr-4 text-sm outline-none focus:border-[#00bfff]/40 focus:bg-white/[0.05] focus-visible:ring-2 focus-visible:ring-[#00bfff] transition-all placeholder-zinc-600" />
                                </div>

                                <div className="relative group">
                                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 w-4 h-4 group-focus-within:text-[#00bfff] transition-colors" aria-hidden="true" />
                                    <label htmlFor={emailId} className="sr-only">Business Email Address</label>
                                    <input id={emailId} type="email" required placeholder="Business Email Address" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl py-3 pl-11 pr-4 text-sm outline-none focus:border-[#00bfff]/40 focus:bg-white/[0.05] focus-visible:ring-2 focus-visible:ring-[#00bfff] transition-all placeholder-zinc-600" />
                                </div>

                                <div className="relative group">
                                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 w-4 h-4 group-focus-within:text-[#00bfff] transition-colors" aria-hidden="true" />
                                    <label htmlFor={phoneId} className="sr-only">Phone Number</label>
                                    <input id={phoneId} type="tel" required placeholder="Phone Number (e.g., +255...)" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl py-3 pl-11 pr-4 text-sm outline-none focus:border-[#00bfff]/40 focus:bg-white/[0.05] focus-visible:ring-2 focus-visible:ring-[#00bfff] transition-all placeholder-zinc-600" />
                                </div>

                                <div className="relative group">
                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 w-4 h-4 group-focus-within:text-[#00bfff] transition-colors" aria-hidden="true" />
                                    <label htmlFor={passwordId} className="sr-only">Secure Account Password</label>
                                    <input id={passwordId} type="password" required placeholder="Secure Account Password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl py-3 pl-11 pr-4 text-sm outline-none focus:border-[#00bfff]/40 focus:bg-white/[0.05] focus-visible:ring-2 focus-visible:ring-[#00bfff] transition-all placeholder-zinc-600" />
                                </div>

                                <button type="submit" className="w-full bg-white text-black font-bold py-3.5 rounded-xl text-sm transition-all hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00bfff] active:scale-[0.99]">
                                    Continue Form Setup
                                </button>
                                <div className="flex items-center justify-center gap-2 mt-20 text-white">
                                    <p>Already have an account? <a href="/vendor-auth" className="text-[#00bfff] font-bold">Sign In</a></p>
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 2: Spot Brand Profiles */}
                        {step === 2 && (
                            <motion.div key="step2" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4">
                                <div className="relative group">
                                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 w-4 h-4 group-focus-within:text-[#00bfff] transition-colors" aria-hidden="true" />
                                    <label htmlFor={spotNameId} className="sr-only">Name of Spot / Restaurant</label>
                                    <input id={spotNameId} type="text" required placeholder="Name of Spot / Restaurant" value={formData.spotName} onChange={e => setFormData({ ...formData, spotName: e.target.value })} className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl py-3 pl-11 pr-4 text-sm outline-none focus:border-[#00bfff]/40 focus:bg-white/[0.05] focus-visible:ring-2 focus-visible:ring-[#00bfff] transition-all placeholder-zinc-600" />
                                </div>

                                <div className="space-y-1">
                                    <span className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider block">Spot Cover Banner</span>
                                    <button
                                        type="button"
                                        onClick={() => coverInputRef.current?.click()}
                                        className="w-full text-left border border-dashed border-white/[0.1] hover:border-[#00bfff]/30 bg-white/[0.01] rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00bfff]"
                                    >
                                        <input type="file" ref={coverInputRef} accept="image/*" className="hidden" tabIndex={-1} onChange={e => setCoverFile(e.target.files?.[0] || null)} />
                                        {coverFile ? (
                                            <div className="flex items-center gap-2 text-xs text-green-400"><CheckCircle size={14} /> {coverFile.name}</div>
                                        ) : (
                                            <><Upload size={16} className="text-zinc-500" aria-hidden="true" /><span className="text-xs text-zinc-400">Click to upload cover image asset</span></>
                                        )}
                                    </button>
                                </div>

                                <div className="p-3 bg-white/[0.01] border border-white/[0.05] rounded-xl space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label htmlFor={registeredId} className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                                            <FileText size={16} className="text-[#00bfff]" aria-hidden="true" />
                                            <span>Is this Business Registered?</span>
                                        </label>
                                        <input id={registeredId} type="checkbox" checked={formData.isRegistered} onChange={e => setFormData({ ...formData, isRegistered: e.target.checked })} className="rounded bg-zinc-800 border-white/[0.2] text-[#00bfff] focus:ring-2 focus:ring-[#00bfff] focus:ring-offset-0 accent-[#00bfff] h-4 w-4" />
                                    </div>

                                    {formData.isRegistered && (
                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="pt-2 border-t border-white/[0.05]">
                                            <button
                                                type="button"
                                                onClick={() => licenseInputRef.current?.click()}
                                                className="w-full text-left border border-dashed border-white/[0.1] bg-white/[0.02] rounded-lg p-3 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-[#00bfff]/20 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00bfff]"
                                            >
                                                <input type="file" ref={licenseInputRef} accept=".pdf,image/*" className="hidden" tabIndex={-1} onChange={e => setLicenseFile(e.target.files?.[0] || null)} />
                                                {licenseFile ? (
                                                    <span className="text-xs text-[#00bfff] truncate max-w-full">{licenseFile.name}</span>
                                                ) : (
                                                    <span className="text-[11px] text-zinc-400">Attach Business License Documentation (PDF/Image)</span>
                                                )}
                                            </button>
                                        </motion.div>
                                    )}
                                </div>

                                <button type="submit" disabled={!formData.spotName || !coverFile} className="w-full bg-white text-black font-bold py-3.5 rounded-xl text-sm transition-all hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00bfff] active:scale-[0.99] disabled:opacity-30 disabled:cursor-not-allowed">
                                    Proceed to Mapping Area
                                </button>
                            </motion.div>
                        )}

                        {/* STEP 3: Integrated Geolocation Interface */}
                        {step === 3 && (
                            <motion.div key="step3" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4">
                                <div className="space-y-2">
                                    <Autocomplete onLoad={setAutocomplete} onPlaceChanged={onPlaceChanged}>
                                        <div className="relative group">
                                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 w-4 h-4 group-focus-within:text-[#00bfff] transition-colors" aria-hidden="true" />
                                            <label htmlFor="geo-search-input" className="sr-only">Search spot physical address location</label>
                                            <input id="geo-search-input" type="text" placeholder="Search spot physical address location" className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl py-3 pl-11 pr-4 text-sm outline-none focus:border-[#00bfff]/40 focus:bg-white/[0.05] focus-visible:ring-2 focus-visible:ring-[#00bfff] transition-all placeholder-zinc-600" />
                                        </div>
                                    </Autocomplete>

                                    <div className="grid grid-cols-2 gap-2">
                                        <button type="button" onClick={handleGeolocate} disabled={isLocating} className="flex items-center justify-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-xl py-2.5 text-xs font-semibold text-zinc-300 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00bfff] transition-all">
                                            {isLocating ? <Loader2 size={12} className="animate-spin text-[#00bfff]" /> : <LocateFixed size={12} className="text-[#00bfff]" aria-hidden="true" />}
                                            Pin Coordinates
                                        </button>
                                        {locations.length > 0 && (
                                            <button type="button" onClick={() => setShowRecentGeo(!showRecentGeo)} aria-expanded={showRecentGeo} className="flex items-center justify-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-xl py-2.5 text-xs font-semibold text-zinc-300 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00bfff] transition-all">
                                                <Clock size={12} className="text-[#00bfff]" aria-hidden="true" /> Recents
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {showRecentGeo && locations.length > 0 && (
                                    <div role="region" aria-label="Recent Searches List" className="bg-white/[0.01] border border-white/[0.05] rounded-xl p-1 max-h-24 overflow-y-auto">
                                        {locations.slice(0, 2).map((loc, idx) => (
                                            <button key={idx} type="button" onClick={() => updateMapSelection({ lat: loc.lat, lng: loc.lng }, loc.address)} className="w-full text-left p-2 hover:bg-white/[0.03] rounded-lg flex items-center gap-2 text-xs truncate text-zinc-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00bfff] transition-all">
                                                <MapPin size={12} className="text-zinc-500" aria-hidden="true" /> {loc.address}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <div className="h-44 rounded-xl overflow-hidden border border-white/[0.06] relative">
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
                                        <div className="absolute inset-0 bg-black/40 pointer-events-none flex items-center justify-center text-[11px] text-zinc-400 font-medium">
                                            Tap map interface grid to map coordinates
                                        </div>
                                    )}
                                </div>

                                {selectedGeo && (
                                    <div aria-live="polite" className="text-xs text-zinc-400 truncate flex items-center gap-1.5 bg-white/[0.02] border border-white/[0.05] p-2 rounded-lg">
                                        <MapPin size={12} className="text-[#00bfff] shrink-0" aria-hidden="true" />
                                        <span>Mapped Address: {geoAddress}</span>
                                    </div>
                                )}

                                <button type="submit" disabled={submitting || !selectedGeo} className="w-full bg-[#00bfff] hover:bg-[#00a8e6] text-black font-bold py-4 rounded-xl shadow-lg shadow-[#00bfff]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00bfff] transition-all text-sm flex items-center justify-center disabled:opacity-40">
                                    {submitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Creating Vendor Account...</> : "Finalize Application Request"}
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </form>
            </div>
        </div>
    );
}