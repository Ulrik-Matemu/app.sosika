import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ChevronLeft, UtensilsCrossed } from "lucide-react";
import { Recipe } from "../../types/recipe";
import { getPublishedRecipes } from "../../services/recipeService";
import RowList, { RowListItem } from "../../components/my-components/RowList";
import Navbar from "../../components/my-components/navbar";

export default function RecipeCountryPage() {
  const { country } = useParams<{ country: string }>();
  const navigate = useNavigate();
  const [, setRecipes] = useState<Recipe[]>([]);
  const [subcategories, setSubcategories] = useState<Record<string, Recipe[]>>({});
  const [loading, setLoading] = useState(true);

  const decodedCountry = decodeURIComponent(country || "Tanzania");

  useEffect(() => {
    async function loadCountryData() {
      setLoading(true);
      const allPublished = await getPublishedRecipes({ country: decodedCountry });
      setRecipes(allPublished);

      const grouped: Record<string, Recipe[]> = {};
      allPublished.forEach((r) => {
        if (!grouped[r.subcategory]) {
          grouped[r.subcategory] = [];
        }
        grouped[r.subcategory].push(r);
      });

      setSubcategories(grouped);
      setLoading(false);
    }

    loadCountryData();
  }, [decodedCountry]);

  const subcategoryList = Object.keys(subcategories);

  const subcatItems: RowListItem[] = subcategoryList.map((subcatName) => {
    const subcatRecipes = subcategories[subcatName];
    const sampleImage = subcatRecipes[0]?.imageUrl;
    return {
      id: subcatName,
      thumbnail: sampleImage ? <img src={sampleImage} alt="" className="w-full h-full object-cover" /> : undefined,
      title: subcatName,
      subtitle: subcatRecipes.map((r) => r.title).join(", "),
      trailing: (
        <span className="font-mono text-xs font-bold text-content-muted">
          {subcatRecipes.length}
        </span>
      ),
      onClick: () => navigate(`/recipes/${encodeURIComponent(decodedCountry)}/${encodeURIComponent(subcatName)}`),
    };
  });

  return (
    <div className="min-h-screen bg-ground text-content pb-28">
      <header className="sticky top-0 z-40 bg-chrome backdrop-blur-xl border-b border-edge-1 px-5 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate("/recipes")}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface-3 border border-edge-2 text-content-secondary"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-content-muted truncate">
            <Link to="/recipes" className="hover:text-accent-ink">Recipes</Link>
            <span>/</span>
            <span className="text-content-secondary font-semibold truncate">{decodedCountry}</span>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-5 pt-6 flex flex-col gap-6">
        <div>
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-accent-ink">
            Country selection
          </div>
          <h1 className="text-[22px] font-bold text-content tracking-tight mt-1.5">
            {decodedCountry} recipe library
          </h1>
          <p className="text-sm text-content-muted mt-1.5">
            Select a subcategory or culinary style below to discover authentic recipes from {decodedCountry}.
          </p>
        </div>

        <div>
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-content-faint mb-1">
            Subcategories & regional styles
          </div>

          {loading ? (
            <div className="flex flex-col gap-3 mt-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-[14px] bg-surface-1 border border-edge-1 animate-pulse" />
              ))}
            </div>
          ) : subcategoryList.length === 0 ? (
            <div className="rounded-[18px] bg-surface-1 border border-edge-2 p-8 text-center space-y-3 mt-3">
              <UtensilsCrossed size={28} className="mx-auto text-content-faint" />
              <h4 className="text-sm font-bold text-content">No subcategories found</h4>
              <p className="text-xs text-content-muted">No published recipes available yet for {decodedCountry}.</p>
            </div>
          ) : (
            <RowList items={subcatItems} />
          )}
        </div>
      </main>

      <Navbar />
    </div>
  );
}
