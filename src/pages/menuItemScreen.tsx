import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useCartContext } from '../context/cartContext';
import { Header } from '../components/my-components/header';
import NavBar from '../components/my-components/navbar';
import { Button } from '../components/ui/button';
import { Star } from 'lucide-react';

type MenuItem = {
    id: number;
    name: string;
    price: string;
    image_url: string;
    avg_rating: number;
    review_count: number;
    vendor_id: number;
    is_available: boolean;
    description: string;
    vendor_name?: string;
};

type Review = {
    id: number;
    rating: number;
    review: string;
    reviewer_initial?: string;
    vendor_reply?: string;
    created_at: string;
};

const MenuItemScreen: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { addToCart } = useCartContext();

    const [item, setItem] = useState<MenuItem | null>(null);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [userRating, setUserRating] = useState<number>(0);
    const [userReview, setUserReview] = useState<string>('');
    const [submitting, setSubmitting] = useState(false);
    const userId = localStorage.getItem('userId'); // adjust according to auth

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [itemRes, reviewRes] = await Promise.all([
                    fetch(`https://sosika-backend.onrender.com/api/menuItems/item/${id}`),
                    fetch(`https://sosika-backend.onrender.com/api/menu-items/${id}/reviews`)
                ]);
                if (!itemRes.ok) throw new Error('Failed fetching menu item');
                if (!reviewRes.ok) throw new Error('Failed fetching reviews');

                const itemData = await itemRes.json();
                const reviewData = await reviewRes.json();

                setItem(itemData);
                setReviews(reviewData);
            } catch (err) {
                console.error(err);
                setError('Failed to load menu item or reviews.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    

    const handleSubmitReview = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userRating || !userReview.trim()) return;

        setSubmitting(true);
        try {
            const res = await fetch(`https://sosika-backend.onrender.com/api/menu-items/${id}/reviews`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rating: userRating, review: userReview, user_id: userId }),
            });
            if (!res.ok) throw new Error('Failed to submit review');
            const newReview: Review = await res.json();
            setReviews((prev) => [newReview, ...prev]);
            setUserRating(0);
            setUserReview('');
        } catch (err) {
            console.error(err);
            alert('Failed to submit review.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-6 text-gray-500">Loading...</div>;
    if (error) return <div className="p-6 text-red-600">{error}</div>;
    if (!item) return null;

    return (
        <>
            <Header />
            <div className="p-4 max-w-3xl mx-auto mb-24">
                {/* Menu Item Card */}
                <div className="rounded-xl overflow-hidden shadow-md mb-4">
                    <img
                        src={item.image_url.replace('/upload/', '/upload/f_auto,q_auto,w_800/')}
                        alt={item.name}
                        className="w-full h-64 object-cover"
                    />
                    <div className="p-4 bg-white dark:bg-[#121212]">
                        <h1 className="text-2xl font-bold">{item.name}</h1>
                        <h2>{item.vendor_name}</h2>
                        <div className="flex flex-col mt-2">
                            <span className="text-lg font-semibold text-gray-700 dark:text-gray-200">
                                TSH{item.price}
                            </span>
                            <div className="flex items-center gap-1">
                                <Star className="text-yellow-500" />
                                <span>{item.avg_rating || '0.0'} ({item.review_count} reviews)</span>
                            </div>
                        </div>
                        <Button
                            className="mt-4 w-full bg-[#00bfff] text-white font-bold py-2 rounded-lg shadow hover:bg-blue-600 transition"
                            onClick={() =>
                                addToCart({
                                    ...item,
                                    vendorId: item.vendor_id,
                                    imageUrl: item.image_url,
                                    isAvailable: item.is_available,
                                })
                            }
                        >
                            Add to Cart
                        </Button>
                    </div>
                </div>
                
                {/* Description */}
                <div className="mb-6 bg-black p-4 rounded-lg shadow border border-gray-700">
                    <h2 className="text-xl text-white font-bold mb-2">Description</h2>
                    <div className="flex items-center gap-2 mb-2">
                        <span
                            className={`inline-block w-3 h-3 rounded-full ${
                                item.is_available ? 'bg-green-500' : 'bg-red-500'
                            }`}
                            title={item.is_available ? 'Available' : 'Unavailable'}
                        ></span>
                        <span className={`font-medium ${item.is_available ? 'text-green-500' : 'text-red-500'}`}>
                            {item.is_available ? 'Available' : 'Currently unavailable'}
                        </span>
                    </div>
                    <p className='text-white'>{item.description}</p>
                </div>

                {/* Add Review */}
                <div className="bg-black p-4 rounded-lg shadow mb-6">
                    <h2 className="text-xl font-bold mb-2 text-white">Add Your Review</h2>
                    <div className="flex items-center mb-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                onClick={() => setUserRating(star)}
                                className={`text-2xl mr-1 ${star <= userRating ? 'text-yellow-500' : 'text-gray-300'}`}
                            >
                                ★
                            </button>
                        ))}
                    </div>
                    <textarea
                        value={userReview}
                        onChange={(e) => setUserReview(e.target.value)}
                        placeholder="Write your review..."
                        className="w-full bg-[#121212] border rounded-lg p-2 mb-2 focus:ring-2 focus:ring-blue-400"
                        rows={3}
                    />
                    <Button
                        type="submit"
                        disabled={submitting}
                        onClick={handleSubmitReview}
                        className="bg-green-500 text-white px-4 py-2 w-full rounded-lg hover:bg-green-600 transition"
                    >
                        {submitting ? 'Submitting...' : 'Submit Review'}
                    </Button>
                </div>

                {/* Reviews List */}
                <h2 className="text-xl font-bold mb-2">Reviews</h2>
                {reviews.length === 0 ? (
                    <p className="text-gray-500">No reviews yet.</p>
                ) : (
                    <div className="flex flex-col gap-3">
                        {reviews.map((rev) => {
                            const reviewerDisplay = rev.reviewer_initial || rev.id; // fallback initials or last 3 digits of id
                            return (
                                <div key={rev.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 shadow-sm">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-semibold">@{reviewerDisplay}</span>
                                        <span className="text-yellow-500">⭐ {rev.rating}</span>
                                    </div>
                                    <p className="text-gray-700 dark:text-gray-300">{rev.review}</p>
                                    {rev.vendor_reply && (
                                        <div className="mt-2 ml-3 p-2 bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg">
                                            Vendor reply: {rev.vendor_reply}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            <NavBar />
        </>
    );
};

export default MenuItemScreen;
