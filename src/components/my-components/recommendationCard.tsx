// src/components/RecommendationCard.tsx
import { useState, useEffect } from "react";
import axios from "axios";
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle
} from "../ui/card";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import { useToast } from "../../hooks/use-toast";
import {
  Utensils, ChevronRight, ThumbsUp, ThumbsDown
} from "lucide-react";

interface Recommendation {
  recommendedItemId: string;
  recommendedItemName: string;
  vendorId: string;
  vendorName: string;
  price: number;
  confidence: number;
  reasoning: string;
  image_url: string;
}




interface RecommendationResponse {
  success: boolean;
  recommendation: Recommendation;
}



const RecommendationCard: React.FC = () => {
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();


  useEffect(() => {
    fetchRecommendation();
  }, []);

  const fetchRecommendation = async () => {
    try {
      setLoading(true);
      const userId = localStorage.getItem("userId"); // Assuming userId is stored in localStorage
      if (!userId) {
        setError("User ID is missing. Please log in again.");
        setLoading(false);
        return;
      }

      const response = await axios.get<RecommendationResponse>(
        `https://sosika-backend.onrender.com/api/one-tap/${userId}`
      );

      if (response.data.success) {
        setRecommendation(response.data.recommendation);
      } else {
        setError("Couldn't get a recommendation at this time");
      }
    } catch (err) {
      console.error("Error fetching recommendation:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    sendFeedback(true);
    toast({
      title: "Success!",
      description: 'The item has been added to your preferences. Thanks for your feedback!',
      duration: 2000,
    });
  };

  const handleReject = () => {
    sendFeedback(false);

    toast({
      title: "Recommendation rejected",
      description: "We'll improve our suggestions based on your feedback.",
      duration: 3000,
    });

  };

  const sendFeedback = async (accepted: boolean) => {
    const userId = localStorage.getItem("userId");  
    try {
      await axios.post(`https://sosika-backend.onrender.com/api/feedback/${userId}`, {
        recommendationId: recommendation?.recommendedItemId,
        accepted,
        itemOrdered: accepted ? recommendation?.recommendedItemId : null
      });
    } catch (err) {
      console.error("Error sending feedback:", err);
    }
  };

  const getConfidenceBadgeColor = (confidence: number): string => {
    if (confidence >= 0.8) return "bg-green-100 text-green-800";
    if (confidence >= 0.6) return "bg-yellow-100 text-yellow-800";
    return "bg-gray-100 text-gray-800";
  };

  const getTimeOfDay = (): "breakfast" | "lunch" | "dinner" | "snack" => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "breakfast";
    if (hour >= 12 && hour < 17) return "lunch";
    if (hour >= 17 && hour < 22) return "dinner";
    return "snack";
  };

  const getGreeting = (): string => {
    const timeOfDay = getTimeOfDay();
    const greetings: Record<string, string> = {
      breakfast: "Good morning! Hungry for breakfast?",
      lunch: "It's lunchtime! How about this?",
      dinner: "Dinner time! We think you'd enjoy:",
      snack: "Need a bite? How about this:"
    };
    return greetings[timeOfDay];
  };

  if (loading) {
    return (
      <Card className="w-full max-w-md mx-auto shadow-md hover:shadow-lg transition-shadow">
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-6 w-full" />
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-32" />
            </div>
            <Skeleton className="h-10 w-24 rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !recommendation) {
    return null;
  }

  const { recommendedItemName, vendorName, price, confidence, reasoning } = recommendation;
  const confidenceBadgeClass = getConfidenceBadgeColor(confidence);

  return (
    <Card className="w-full max-w-md mx-auto shadow-md hover:shadow-lg transition-shadow">
      <CardHeader className="pb-2">
        <CardDescription className="text-sm font-medium"> <span className="text-[12px] text-blue-500 bg-blue-100 px-2 py-[2px] rounded-full">
          AI Pick
        </span>   {getGreeting()}</CardDescription>
        <CardTitle className="text-xl">{recommendedItemName}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500 flex items-center gap-1">
              <Utensils className="h-3 w-3" /> {vendorName}
            </p>
            <p className="text-lg font-semibold">${price}</p>
            <div className={`inline-flex items-center text-xs px-2 py-1 rounded-full mt-2 ${confidenceBadgeClass}`}>
              <ThumbsUp className="h-3 w-3 mr-1" />
              {Math.round(confidence * 100)}% match
            </div>
          </div>
          <Button onClick={handleAddToCart} className="rounded-full px-4">
            Accept <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        <div className="mt-3 text-xs text-gray-500">
          <p>{reasoning}</p>
        </div>
      </CardContent>
      <CardFooter className="justify-end pt-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReject}
          className="text-gray-500 hover:text-gray-700"
        >
          Not interested <ThumbsDown className="h-3 w-3 ml-1" />
        </Button>
      </CardFooter>
    </Card>
  );
};

export default RecommendationCard;
