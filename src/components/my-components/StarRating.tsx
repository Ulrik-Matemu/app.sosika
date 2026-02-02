import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '../../lib/utils';

interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  size?: number;
  className?: string;
  readOnly?: boolean;
}

const StarRating = ({
  rating,
  onRatingChange,
  size = 20,
  className,
  readOnly = false,
}: StarRatingProps) => {
  const [hoverRating, setHoverRating] = useState(0);

  const handleMouseEnter = (index: number) => {
    if (readOnly) return;
    setHoverRating(index);
  };

  const handleMouseLeave = () => {
    if (readOnly) return;
    setHoverRating(0);
  };

  const handleClick = (index: number) => {
    if (readOnly || !onRatingChange) return;
    onRatingChange(index);
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {[1, 2, 3, 4, 5].map((index) => {
        const fill =
          (hoverRating || rating) >= index
            ? 'text-yellow-400 fill-yellow-400'
            : 'text-zinc-600';
        
        return (
          <Star
            key={index}
            size={size}
            className={cn(
              'transition-colors',
              fill,
              !readOnly && 'cursor-pointer'
            )}
            onMouseEnter={() => handleMouseEnter(index)}
            onMouseLeave={handleMouseLeave}
            onClick={() => handleClick(index)}
          />
        );
      })}
    </div>
  );
};

export default StarRating;
