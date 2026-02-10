import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalItems: number;
}

export function useHighlight(pagination?: PaginationState) {
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!highlightId) return;

    const applyHighlight = () => {
      const element = document.getElementById(`highlight-${highlightId}`);
      
      if (element) {
        // Wait a bit for animations to settle, then scroll
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });

          // Add highlight animation
          element.classList.add('animate-pulse');
          element.classList.add('ring-2');
          element.classList.add('ring-yellow-400');
          element.classList.add('bg-yellow-100');

          // Remove highlight after 3 seconds
          setTimeout(() => {
            element.classList.remove('animate-pulse');
            element.classList.remove('ring-2');
            element.classList.remove('ring-yellow-400');
            element.classList.remove('bg-yellow-100');
          }, 3000);
        }, 200);
        
        return true;
      }
      return false;
    };

    // Try to apply highlight immediately
    if (applyHighlight()) return;

    // If element not found, retry with exponential backoff (up to 5 times, 5 seconds total)
    const attemptHighlight = async () => {
      let attempts = 0;
      const maxAttempts = 25; // 25 * 200ms = 5 seconds
      
      while (attempts < maxAttempts) {
        if (applyHighlight()) {
          setRetryCount(0);
          return;
        }
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    };

    attemptHighlight();
  }, [highlightId, retryCount]);

  return highlightId;
}

/**
 * Hook to calculate which page an item should be on based on its index
 * Used for pagination-aware highlighting
 */
export function useHighlightPage(itemIndex: number, pageSize: number = 10) {
  return Math.floor(itemIndex / pageSize) + 1;
}

