import { useState, useEffect } from 'react';
import axios from 'axios';
import { User,  Save, Loader2, X } from 'lucide-react';
import Navbar from '../components/my-components/navbar';
import Footer from '../components/my-components/footer';
import ThemeToggle from '../components/my-components/themeToggle';
import NotificationHandler from '../components/my-components/notification-handler';


interface UserProfile {
    id: number;
    full_name: string;
    email: string;
    phone_number: string;
    college_id: number;
    college_registration_number: string;
    custom_address: string;
}

const logout = () => {
    localStorage.removeItem('email');
    localStorage.removeItem('password');
    window.location.href = '#/login';
}

const ProfileManagement = () => {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [formData, setFormData] = useState<Partial<UserProfile>>({});

    const userId = localStorage.getItem('userId');

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                setIsLoading(true);
                const response = await axios.get(`https://sosika-backend.onrender.com/api/auth/profile/${userId}`);
                setProfile(response.data);
                setFormData(response.data);
                setIsLoading(false);
            } catch (err) {
                setError('Failed to fetch profile. Please try again later.');
                setIsLoading(false);
                console.error(err);
            }
        };

        fetchProfile();
    }, [userId]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    }

    const handleSave = async () => {
        try {
            setIsLoading(true);
            const response = await axios.put(`https://sosika-backend.onrender.com/api/auths/profile/${userId}`, formData);
            setProfile(response.data.user);
            setIsEditing(false);
            setIsLoading(false);
        } catch (err) {
            setError('Failed to update profile. Please try again later.');
            setIsLoading(false);
            console.error(err);
        }
    };

    if (isLoading) {
        return (
            <div className="fixed inset-0 bg-white bg-opacity-80 flex items-center justify-center">
                <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="fixed inset-0 bg-white bg-opacity-80 flex items-center justify-center">
                <div className="text-center max-w-md p-6 bg-red-50 rounded-lg">
                    <X className="h-12 w-12 text-red-600 mx-auto mb-4" />
                    <p className="text-red-700 font-medium">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#2b2b2b] pb-8">
            <NotificationHandler />
            <header className="sticky top-0 z-50 flex justify-between bg-white dark:bg-[#2b2b2b]  px-6 py-4">
                <h1 className="text-3xl text-center font-extrabold text-[#00bfff]">Sosika</h1>
                <div className="flex items-center gap-4">
                    <ThemeToggle />
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 py-2 pb-12">
                <div className="bg-white dark:bg-[#3b3b3b] p-6 rounded-xl shadow-sm border border-gray-200 dark:border-[#595959]">
                    <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                        <User className="h-6 w-6" />
                        Profile
                    </h2>

                    {profile && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-white">Full Name</label>
                                <input
                                    type="text"
                                    name="full_name"
                                    value={formData.full_name || ''}
                                    onChange={handleInputChange}
                                    disabled={!isEditing}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-[#7a7a7a]"
                                />
                            </div>
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
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-white">College ID</label>
                                <select
                                    name="college_id"
                                    value={formData.college_id || ''}
                                    onChange={handleSelectChange}
                                    disabled={!isEditing}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-[#7a7a7a]"
                                >
                                    <option value="">Select College</option>
                                    <option value="1">IAA</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-white">College Registration Number</label>
                                <input
                                    type="text"
                                    name="college_registration_number"
                                    value={formData.college_registration_number || ''}
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
                                            <Save className="h-5 w-5 inline-block mr-2" />
                                            Save
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
                <div className='my-8 flex justify-center bg-white dark:bg-[#3b3b3b] p-6 rounded-xl shadow-sm border border-gray-200 dark:border-[#595959]'>
                    <button className='text-3xl text-[red] font-bold' onClick={logout}>
                        Logout
                    </button>
                </div>
            </div>

            <Footer />
            <Navbar />
        </div>
    );
};

export default ProfileManagement;