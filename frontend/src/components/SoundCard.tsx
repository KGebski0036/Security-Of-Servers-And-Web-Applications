import { Play, Pause, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { favoritesAPI } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface SoundCardProps {
  id: number;
  name: string;
  tags: string[];
  image: string;
  mp3_url?: string;
  isFavorite?: boolean;
}

const SoundCard = ({ id, name, tags, image, mp3_url, isFavorite = false }: SoundCardProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [favorite, setFavorite] = useState(isFavorite);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const favoriteMutation = useMutation({
    mutationFn: async () => {
      if (favorite) {
        await favoritesAPI.delete(id);
      } else {
        await favoritesAPI.create(id);
      }
    },
    onSuccess: () => {
      setFavorite(!favorite);
      queryClient.invalidateQueries({ queryKey: ['sounds'] });
      queryClient.invalidateQueries({ queryKey: ['sound', id] });
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update favorite",
        variant: "destructive",
      });
    },
  });

  // Handle audio playback
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch((error) => {
          console.error("Error playing audio:", error);
          setIsPlaying(false);
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!mp3_url) {
      toast({
        title: "No audio available",
        description: "This sound doesn't have an audio file",
        variant: "destructive",
      });
      return;
    }
    
    setIsPlaying(!isPlaying);
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      toast({
        title: "Please login",
        description: "You need to be logged in to favorite sounds",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }
    favoriteMutation.mutate();
  };

  return (
    <div
      onClick={() => navigate(`/sound/${id}`)}
      className="group relative bg-card rounded-lg p-4 shadow-card hover:bg-secondary transition-smooth cursor-pointer"
    >
      <div className="relative aspect-square mb-4 overflow-hidden rounded-md">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-105 transition-smooth"
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-smooth flex items-center justify-center">
          <Button
            size="icon"
            variant="default"
            className="h-12 w-12 rounded-full shadow-glow"
            onClick={handlePlayPause}
          >
            {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold text-lg truncate group-hover:text-primary transition-smooth">
          {name}
        </h3>
        <div className="flex flex-wrap gap-1">
          {tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      <Button
        size="icon"
        variant="ghost"
        className={`absolute top-6 right-6 ${favorite ? "text-primary" : ""}`}
        onClick={handleFavorite}
        disabled={favoriteMutation.isPending}
      >
        <Heart className={`h-5 w-5 ${favorite ? "fill-current" : ""}`} />
      </Button>

      {/* Hidden audio element */}
      {mp3_url && (
        <audio
          ref={audioRef}
          src={mp3_url}
          onEnded={() => setIsPlaying(false)}
          onError={() => {
            setIsPlaying(false);
            toast({
              title: "Audio error",
              description: "Failed to play audio",
              variant: "destructive",
            });
          }}
        />
      )}
    </div>
  );
};

export default SoundCard;
