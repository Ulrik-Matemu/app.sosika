import { MenuItem } from "../../pages/mood/types/types";
import { Plus } from "lucide-react";
import { Button } from "../ui/button";

interface MenuItemCardProps {
  item: MenuItem;
  onAddToCart: (item: MenuItem) => void;
}

const MenuItemCard = ({ item, onAddToCart }: MenuItemCardProps) => {
  return (
    <div className="w-64 flex-shrink-0">
      <div className="bg-zinc-800/50 border border-zinc-700/60 rounded-2xl overflow-hidden flex flex-col h-full group transition-all duration-300 hover:border-zinc-600/80 hover:shadow-xl hover:shadow-black/20">
        {/* Image */}
        <div className="h-40 overflow-hidden">
          <img
            src={item.image_url || "/placeholder.svg"}
            alt={item.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>

        {/* Details */}
        <div className="p-4 flex flex-col flex-grow">
          <h3 className="font-bold text-white text-md truncate">{item.name}</h3>
          <p className="text-sm text-zinc-400 mt-1 line-clamp-2 flex-grow">{item.description}</p>

          <div className="flex items-center justify-between mt-4">
            <p className="text-lg font-extrabold text-white">
              {item.price}/=
            </p>
            <Button
              onClick={() => onAddToCart(item)}
              size="icon"
              className="w-10 h-10 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg shadow-blue-500/20 transition-transform active:scale-90 flex-shrink-0"
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MenuItemCard;
