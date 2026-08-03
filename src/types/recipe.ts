export interface RecipeIngredient {
  id: string;
  name: string;
  amount: string;
}

export interface RecipeStep {
  id: string;
  title: string;
  content: string;
}

export type RecipeDifficulty = "easy" | "medium" | "hard";
export type RecipeSource = "user_submission" | "ai_generated" | "admin_import";
export type RecipeStatus = "pending_review" | "published" | "rejected";

export interface Recipe {
  id?: string;
  title: string;
  titleLower: string;
  slug: string;
  country: string;
  subcategory: string;
  tags: string[];
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  servings: number;
  difficulty: RecipeDifficulty;
  imageUrl: string;
  source: RecipeSource;
  submittedByName: string | null;
  submittedBySocial: string | null;
  status: RecipeStatus;
  rejectionReason: string | null;
  linkedVendorIds: string[];
  views: number;
  saves: number;
  createdAt: any;
  publishedAt: any | null;
}

export interface RecipeSubmissionInput {
  title: string;
  country: string;
  subcategory: string;
  tags?: string[];
  ingredients: { name: string; amount: string }[];
  steps: { title: string; content: string }[];
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  servings: number;
  difficulty: RecipeDifficulty;
  imageFile?: File | null;
  imageUrl?: string;
  submittedByName?: string;
  submittedBySocial?: string;
}

export interface VendorMinimal {
  id: string;
  name: string;
  image_url?: string;
  location?: string;
  cuisine?: string[];
  phone?: string;
}

export interface RecipeGenerationLog {
  id?: string;
  timestamp: any;
  recipesAttempted: number;
  acceptedCount: number;
  rejectedCount: number;
  duplicatesSkipped?: number;
  quotaExhausted?: boolean;
  apiErrors: string[];
  recipesGenerated: {
    title: string;
    country: string;
    subcategory: string;
    imageSource?: string;
    status: string;
  }[];
}
