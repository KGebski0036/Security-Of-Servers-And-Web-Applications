import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Play, Pause, Heart, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { useState, useRef, useEffect } from "react";
import { soundsAPI, commentsAPI, favoritesAPI, Comment } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import DOMPurify from "dompurify";

const SoundDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState([0]);
  const [commentText, setCommentText] = useState("");
  const audioRef = useRef<HTMLAudioElement>(null);

  const soundId = parseInt(id || "0", 10);

  // Fetch sound details
  const { data: sound, isLoading, error } = useQuery({
    queryKey: ['sound', soundId],
    queryFn: () => soundsAPI.get(soundId),
    enabled: !!soundId,
  });

  // Fetch comments
  const { data: commentsData } = useQuery({
    queryKey: ['comments', soundId],
    queryFn: () => commentsAPI.list(soundId),
    enabled: !!soundId,
  });

  // Handle both array and paginated responses for comments
  const comments = (() => {
    if (!commentsData) return [];
    if (Array.isArray(commentsData)) return commentsData;
    if (commentsData.results && Array.isArray(commentsData.results)) return commentsData.results;
    return [];
  })();

  // Favorite mutation
  const favoriteMutation = useMutation({
    mutationFn: async () => {
      if (sound?.is_favorite) {
        await favoritesAPI.delete(soundId);
      } else {
        await favoritesAPI.create(soundId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sound', soundId] });
      queryClient.invalidateQueries({ queryKey: ['sounds'] });
      toast({
        title: sound?.is_favorite ? "Removed from favorites" : "Added to favorites",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update favorite",
        variant: "destructive",
      });
    },
  });

  // Comment mutation
  const commentMutation = useMutation({
    mutationFn: async (content: string) => {
      return commentsAPI.create(soundId, content);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', soundId] });
      setCommentText("");
      toast({
        title: "Comment added",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add comment",
        variant: "destructive",
      });
    },
  });

  const handleFavorite = () => {
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

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast({
        title: "Please login",
        description: "You need to be logged in to comment",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }
    if (!commentText.trim()) return;
    const cleanText = DOMPurify.sanitize(commentText.trim(), { USE_PROFILES: { html: false } });
    commentMutation.mutate(cleanText);

  };

  // Handle audio playback
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(console.error);
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl text-muted-foreground">Loading sound...</p>
      </div>
    );
  }

  if (error || !sound) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-destructive mb-4">Sound not found</p>
          <Button onClick={() => navigate("/")}>Go back</Button>
        </div>
      </div>
    );
  }

  const tags = sound.tags.map(t => typeof t === 'object' ? t.name : t);
  const uploadedBy = typeof sound.uploaded_by === 'object' 
    ? sound.uploaded_by.username 
    : sound.uploaded_by;
  const uploadedDate = formatDistanceToNow(new Date(sound.created_at), { addSuffix: true });

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/20 via-background to-background">
      <div className="container mx-auto px-6 py-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/")}
          className="mb-6 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Button>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div className="relative aspect-square rounded-xl overflow-hidden shadow-card">
            <img
              src={sound.image_url || "/placeholder.svg"}
              alt={sound.name}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex flex-col justify-center space-y-6">
            <div>
              <h1 className="text-5xl font-bold mb-4">{sound.name}</h1>
              <p className="text-muted-foreground text-lg">{sound.description || "No description available"}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-sm">
                  {tag}
                </Badge>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <Button
                size="lg"
                className="gap-2 shadow-glow"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? (
                  <>
                    <Pause className="h-5 w-5" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5 ml-0.5" />
                    Play
                  </>
                )}
              </Button>
              {sound.mp3_url && (
                <audio
                  ref={audioRef}
                  src={sound.mp3_url}
                  onTimeUpdate={(e) => {
                    const audio = e.currentTarget;
                    if (audio.duration) {
                      const progressValue = (audio.currentTime / audio.duration) * 100;
                      setProgress([progressValue]);
                    }
                  }}
                  onEnded={() => setIsPlaying(false)}
                />
              )}
              <Button
                size="lg"
                variant="outline"
                className={sound.is_favorite ? "text-primary border-primary" : ""}
                onClick={handleFavorite}
                disabled={favoriteMutation.isPending}
              >
                <Heart className={`h-5 w-5 ${sound.is_favorite ? "fill-current" : ""}`} />
              </Button>
              <Button size="lg" variant="outline">
                <Share2 className="h-5 w-5" />
              </Button>
            </div>

            {sound.mp3_url && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{progress[0].toFixed(0)}%</span>
                  <span>100%</span>
                </div>
                <Slider
                  value={progress}
                  onValueChange={(value) => {
                    setProgress(value);
                    // Update audio position if needed
                  }}
                  max={100}
                  step={1}
                  className="cursor-pointer"
                />
              </div>
            )}

            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Uploaded by <span className="text-foreground font-medium">{uploadedBy}</span> • {uploadedDate}
              </p>
              {sound.favorite_count !== undefined && (
                <p className="text-sm text-muted-foreground mt-1">
                  {sound.favorite_count} {sound.favorite_count === 1 ? 'favorite' : 'favorites'}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl p-6 shadow-card">
          <h2 className="text-2xl font-bold mb-4">Comments ({comments.length})</h2>
          
          {isAuthenticated ? (
            <form onSubmit={handleCommentSubmit} className="mb-6">
              <div className="flex gap-2">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 min-h-[80px] px-3 py-2 bg-secondary rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
                <Button type="submit" disabled={commentMutation.isPending}>
                  {commentMutation.isPending ? "Posting..." : "Post"}
                </Button>
              </div>
            </form>
          ) : (
            <p className="text-muted-foreground mb-6">Sign in to leave a comment</p>
          )}

          <div className="space-y-4">
            {comments.length === 0 ? (
              <p className="text-muted-foreground">No comments yet. Be the first to comment!</p>
            ) : (
              comments.map((comment: Comment) => (
                <div key={comment.id} className="border-b border-border pb-4 last:border-0">
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-semibold">{comment.user_name}</p>
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p 
                    className="text-muted-foreground"
                    dangerouslySetInnerHTML={{
                       __html: DOMPurify.sanitize(comment.content),
                   }}
                 ></p>

                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SoundDetail;
