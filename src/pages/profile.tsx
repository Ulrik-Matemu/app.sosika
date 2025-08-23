import { useState, useEffect } from 'react';
import axios from 'axios';
import { User, Loader2, X, Users, MessageSquareText } from 'lucide-react';
import Navbar from '../components/my-components/navbar';
import NotificationHandler from '../components/my-components/notification-handler';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import PageWrapper from '../services/page-transition';
import { Header } from '../components/my-components/header';
import { Toaster } from '../components/ui/toaster';
import { useToast } from '../hooks/use-toast';
import { ToastAction } from '../components/ui/toast';
import { ReferralLinkDialog } from '../components/my-components/referral';
import { VendorCall } from '../components/my-components/vendorCall';
// import { EnhancedReferralDialog } from '../components/my-components/referralOffer';;


interface UserProfile {
    id: number;
    full_name: string;
    email: string;
    phone_number: string;
    college_id: number;
    college_registration_number: string;
    custom_address: string;
}


interface Reviews {
    review: string;
}

const logout = () => {
    localStorage.removeItem('email');
    localStorage.removeItem('password');
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('vendorId');
    window.location.href = '/login';
}

const ProfileManagement = () => {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [formData, setFormData] = useState<Partial<UserProfile>>({});
    const [reviewData, setReviewData] = useState<Partial<Reviews>>({});
    const toast = useToast();
    const userId = localStorage.getItem('userId');
    const API_URL = import.meta.env.VITE_API_URL;

    let voices: SpeechSynthesisVoice[] = [];

    const loadVoices = () => {
        voices = window.speechSynthesis.getVoices();
        if (!voices.length) {
            // try again when voices change
            window.speechSynthesis.onvoiceschanged = () => {
                voices = window.speechSynthesis.getVoices();
            };
        }
    };

    loadVoices();

     useEffect(() => {
        const fetchProfile = async (forceRefresh = false) => {
            const cacheKey = `profile_cache_${userId}`;
            const cached = localStorage.getItem(cacheKey);

            if (!forceRefresh && cached) {
                try {
                    const parsed = JSON.parse(cached);
                    const now = Date.now();
                    const tenMinutes = 10 * 60 * 1000;

                    if (now - parsed.timestamp < tenMinutes) {
                        setProfile(parsed.data);
                        setFormData(parsed.data);
                        setIsLoading(false);
                        return;
                    }
                } catch (e) {
                    console.error("Failed to parse cached profile:", e);
                }
            }

            try {
                const response = await axios.get(`${API_URL}/auth/profile/${userId}`);
                const data = response.data;
                setProfile(data);
                setFormData(data);
                localStorage.setItem(cacheKey, JSON.stringify({
                    data,
                    timestamp: Date.now(),
                }));
                setIsLoading(false);
            } catch (err) {
                toast.toast({
                    variant: "destructive",
                    title: "Uh oh! Something went wrong.",
                    description: "There was a problem with your request.",
                    action: (
                        <ToastAction altText="Try again" onClick={() => fetchProfile(true)}>
                            Try again
                        </ToastAction>
                    ),
                });
                console.error(err);
                setIsLoading(false);
            }
        };

        if (userId) {
            fetchProfile();
        }
    }, [userId]);

const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };



    const handleSave = async () => {
        try {
            setLoading(true);
            const response = await axios.put(`${API_URL}/auth/profile/${userId}`, formData);
            setProfile(response.data.user);

            setIsEditing(false);
            setLoading(false);
            toast.toast({
                description: "Profile updated successfully!",
            });
        } catch (err) {
            setError('Failed to update profile. Please try again later.');
            setIsLoading(false);
            console.error(err);
        }
    };

    const handleReviewSubmit = async () => {
        try {
            setLoading(true);
            setReviewData({ review: '' });
            const response = await axios.post(`${API_URL}/auth/reviews`, {
                review_text: reviewData.review,
                user_id: userId,
            });
            let responseArr = [];
            responseArr.push(response.data)
            toast.toast({
                description: "Thank you for your review!",
            })
            setLoading(false);
        } catch (err) {
            setError('Failed to submit review. Please try again later.');
            setLoading(false);
            console.error(err);
        }
    }

    if (isLoading) {
        return (
            <div className="fixed inset-0 bg-[#ededed] bg-opacity-80 flex items-center justify-center">
                <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="fixed inset-0 bg-[#ededed] bg-opacity-80 flex items-center justify-center">
                <div className="text-center max-w-md p-6 bg-red-50 rounded-lg">
                    <X className="h-12 w-12 text-red-600 mx-auto mb-4" />
                    <p className="text-red-700 font-medium">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <Toaster />
            <div className="min-h-screen bg-[#fdfdfd] dark:bg-[#121212] pb-8">
                <NotificationHandler />
                <Header />
                <PageWrapper>

                    <div className="max-w-7xl mx-auto px-4 py-2 pb-12">
                        <div className="bg-[#ededed] dark:bg-[#3b3b3b] p-6 rounded-xl shadow-sm border border-gray-200 dark:border-[#595959]">
                            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                                <User className="h-6 w-6" />
                                Profile
                            </h2>

                            {profile && (
                                <div className="space-y-4">

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-white">Email</label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email || ''}
                                            onChange={handleInputChange}
                                            disabled={!isEditing}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-[#7a7a7a]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-white">Phone Number</label>
                                        <input
                                            type="text"
                                            name="phone_number"
                                            value={formData.phone_number || ''}
                                            onChange={handleInputChange}
                                            disabled={!isEditing}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-[#7a7a7a]"
                                        />
                                    </div>

                                    <div className="flex justify-end gap-2">
                                        {isEditing ? (
                                            <>
                                                <button
                                                    onClick={() => setIsEditing(false)}
                                                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={handleSave}
                                                    className="px-4 py-2 bg-[#00bfff] text-white rounded-lg hover:bg-[#0099cc]"
                                                >
                                                    {loading ? (
                                                        <svg className="animate-spin h-5 w-5 text-[#121212]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                    ) : (
                                                        'Save'
                                                    )}
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={() => setIsEditing(true)}
                                                className="px-4 py-2 bg-[#00bfff] text-white rounded-lg hover:bg-[#0099cc]"
                                            >
                                                Edit Profile
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className='my-8'>  
                            <VendorCall />
                        </div>
                            <div className='my-8 bg-[#ededed] dark:bg-[#3b3b3b] p-6 rounded-xl shadow-sm border border-gray-200 dark:border-[#595959]'>
                                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                                    <Users className="h-6 w-6" />
                                    Friends
                                </h2>
                                <div className='grid'>
                                    <Label className='text-blue-300 font-extrabold py-2'>Share this link with friends — <span className='font-bold text-black dark:text-white'>get rewards when they order!</span></Label>
                                    <ReferralLinkDialog />
                                </div>

                            </div>

                            <div className='my-8 grid justify-center bg-[#ededed] dark:bg-[#3b3b3b] p-6 rounded-xl shadow-sm border border-gray-200 dark:border-[#595959]'>
                                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                                    <MessageSquareText className="h-6 w-6" />
                                    Feedback
                                </h2>
                                <div className="grid w-full gap-2">
                                    <Label htmlFor="message-2" className='font-bold'><span className='text-green-400 font-extrabold'>Enjoying your experience?</span> Share your thoughts and help us improve!</Label>
                                    <Textarea
                                        value={reviewData.review}
                                        placeholder="Type your message here."
                                        onChange={(e) => setReviewData({ review: e.target.value })}
                                    />
                                    <Button onClick={handleReviewSubmit}>
                                        {loading ? (
                                            <svg className="animate-spin h-5 w-5 text-[#121212]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        ) : (
                                            'SUBMIT REVIEW'
                                        )}
                                    </Button>
                                </div>
                            </div>
                            <div className='my-8 flex justify-center  p-6 rounded-xl shadow-sm '>
                                <Button className='text-2xl' variant="destructive" onClick={logout}>
                                    Logout
                                </Button>
                            </div>
                        </div>
                </PageWrapper>
                <Navbar />
            </div>
        </>
    );
};

export default ProfileManagement;