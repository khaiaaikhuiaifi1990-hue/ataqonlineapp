import React, { useState, useEffect } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { getCachedImage, setCachedImage } from '../utils/imageOptimizer';

interface FastImageProps {
  src: string;
  thumbnail?: string;
  alt: string;
  className?: string;
  aspectRatio?: string;
}

export const FastImage: React.FC<FastImageProps> = ({
  src,
  thumbnail,
  alt,
  className = '',
  aspectRatio = 'aspect-square'
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const cachedUrl = getCachedImage(src);

  useEffect(() => {
    // If image is already cached in memory, show immediately
    if (cachedUrl !== src) {
      setIsLoaded(true);
    }
  }, [src, cachedUrl]);

  return (
    <div className={`relative overflow-hidden bg-slate-100 ${aspectRatio} ${className}`}>
      {/* Background Micro Placeholder / Skeleton */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center image-skeleton">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt=""
              aria-hidden="true"
              className="w-full h-full object-cover filter blur-md scale-110 opacity-70"
            />
          ) : (
            <ImageIcon className="w-8 h-8 text-slate-300 animate-pulse" />
          )}
        </div>
      )}

      {/* Main Image with Progressive Load */}
      {!hasError ? (
        <img
          src={cachedUrl}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => {
            setIsLoaded(true);
            setCachedImage(src, src);
          }}
          onError={() => {
            setHasError(true);
            setIsLoaded(true);
          }}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 text-slate-400 p-2 text-center">
          <ImageIcon className="w-8 h-8 mb-1 opacity-50" />
          <span className="text-xs">عتق أونلاين</span>
        </div>
      )}
    </div>
  );
};
