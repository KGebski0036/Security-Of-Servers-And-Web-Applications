import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import SoundCard from "@/components/SoundCard";
import FilterBar from "@/components/FilterBar";
import { soundsAPI, tagsAPI, favoritesAPI, Sound, Tag } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const { isAuthenticated } = useAuth();

  // Fetch favorites if needed
  const { data: favoritesData, isLoading: favoritesLoading } = useQuery({
    queryKey: ['favorites'],
    queryFn: favoritesAPI.list,
    enabled: showFavoritesOnly && isAuthenticated,
  });

  // Fetch sounds
  const { data: soundsData, isLoading: soundsLoading, error: soundsError } = useQuery({
    queryKey: ['sounds', searchQuery, selectedTag],
    queryFn: () => soundsAPI.list({ 
      search: searchQuery || undefined,
      tag: selectedTag || undefined 
    }),
    enabled: !showFavoritesOnly, // Only fetch all sounds when not showing favorites
  });

  // Determine which sounds to display
  let sounds: Sound[] = [];
  if (showFavoritesOnly && isAuthenticated) {
    // Filter favorites by search and tag
    sounds = (favoritesData || []).filter((sound: Sound) => {
      const matchesSearch = !searchQuery || sound.name.toLowerCase().includes(searchQuery.toLowerCase());
      const soundTags = sound.tags.map(t => typeof t === 'object' ? t.name : t);
      const matchesTag = !selectedTag || soundTags.includes(selectedTag);
      return matchesSearch && matchesTag;
    });
  } else {
    sounds = soundsData?.results || [];
  }

  // Fetch tags
  const { data: tagsData, isLoading: tagsLoading, error: tagsError } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsAPI.list,
    retry: 1,
  });
  
  // Handle both array and paginated responses
  let tags: Tag[] = [];
  if (tagsData) {
    if (Array.isArray(tagsData)) {
      tags = tagsData;
    } else if (tagsData.results && Array.isArray(tagsData.results)) {
      tags = tagsData.results;
    }
  }
  
  const allTags = tags.map((tag: Tag) => tag.name);

  return (
    <div className="min-h-screen">
      <Navigation onSearch={setSearchQuery} />
      
      <main className="container mx-auto px-6 py-8">
        <div className="mb-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-2">
                {showFavoritesOnly ? "My Favorites" : "Discover Sounds"}
              </h2>
              <p className="text-muted-foreground">
                {showFavoritesOnly 
                  ? "Your favorite sound collection" 
                  : "Browse our collection of high-quality sound effects"}
              </p>
            </div>
            {isAuthenticated && (
              <Button
                variant={showFavoritesOnly ? "default" : "outline"}
                onClick={() => {
                  setShowFavoritesOnly(!showFavoritesOnly);
                  setSelectedTag(null); // Reset tag filter when switching
                }}
                className="gap-2"
              >
                <Heart className={`h-4 w-4 ${showFavoritesOnly ? "fill-current" : ""}`} />
                {showFavoritesOnly ? "Show All" : "Show Favorites"}
              </Button>
            )}
          </div>
          <FilterBar
            tags={allTags}
            selectedTag={selectedTag}
            onTagSelect={setSelectedTag}
          />
        </div>

        {(soundsLoading || (showFavoritesOnly && favoritesLoading)) && (
          <div className="text-center py-20">
            <p className="text-xl text-muted-foreground">
              {showFavoritesOnly ? "Loading favorites..." : "Loading sounds..."}
            </p>
          </div>
        )}

        {(soundsError || (showFavoritesOnly && !favoritesLoading && !favoritesData)) && (
          <div className="text-center py-20">
            <p className="text-xl text-destructive">
              {showFavoritesOnly 
                ? "Error loading favorites. Please try again later." 
                : "Error loading sounds. Please try again later."}
            </p>
          </div>
        )}

        {!soundsLoading && !favoritesLoading && !soundsError && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sounds.map((sound: Sound) => (
              <SoundCard
                key={sound.id}
                id={sound.id}
                name={sound.name}
                tags={sound.tags.map(t => typeof t === 'object' ? t.name : t)}
                image={sound.image_url || "/placeholder.svg"}
                mp3_url={sound.mp3_url}
                isFavorite={sound.is_favorite || showFavoritesOnly}
              />
            ))}
          </div>
        )}

        {!soundsLoading && !favoritesLoading && !soundsError && sounds.length === 0 && (
          <div className="text-center py-20">
            <p className="text-xl text-muted-foreground">
              {showFavoritesOnly 
                ? "No favorites yet. Start favoriting sounds you like!" 
                : "No sounds found"}
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
