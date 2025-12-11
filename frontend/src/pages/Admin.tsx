import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";
import { Upload, Music, Trash2, Plus, X } from "lucide-react";
import { soundsAPI, tagsAPI, Sound, Tag } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Admin = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    tags: "",
  });
  const [mp3File, setMp3File] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [deleteTagId, setDeleteTagId] = useState<number | null>(null);
  const [deleteSoundId, setDeleteSoundId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"upload" | "tags" | "sounds">("upload");

  // Fetch tags
  const { data: tagsData, refetch: refetchTags } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsAPI.list,
  });

  // Fetch sounds
  const { data: soundsData, refetch: refetchSounds } = useQuery({
    queryKey: ['sounds'],
    queryFn: () => soundsAPI.list({}),
  });

  // Handle both array and paginated responses
  const tags = (() => {
    if (!tagsData) return [];
    if (Array.isArray(tagsData)) return tagsData;
    if (tagsData.results && Array.isArray(tagsData.results)) return tagsData.results;
    return [];
  })();

  const sounds = soundsData?.results || [];

  // Create tag mutation
  const createTagMutation = useMutation({
    mutationFn: (name: string) => tagsAPI.create(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      setNewTagName("");
      toast({
        title: "Tag created",
        description: "Tag has been added successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create tag",
        variant: "destructive",
      });
    },
  });

  // Delete tag mutation
  const deleteTagMutation = useMutation({
    mutationFn: (id: number) => tagsAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      setDeleteTagId(null);
      toast({
        title: "Tag deleted",
        description: "Tag has been deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete tag",
        variant: "destructive",
      });
    },
  });

  // Delete sound mutation
  const deleteSoundMutation = useMutation({
    mutationFn: (id: number) => soundsAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sounds'] });
      setDeleteSoundId(null);
      toast({
        title: "Sound deleted",
        description: "Sound has been deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete sound",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    
    if (!user?.isAdmin) {
      toast({
        title: "Access Denied",
        description: "You need admin privileges to access this page",
        variant: "destructive",
      });
      navigate("/");
      return;
    }
  }, [isAuthenticated, user, navigate, toast]);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "mp3" | "image"
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (type === "mp3") {
        setMp3File(file);
      } else {
        setImageFile(file);
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!mp3File) {
      toast({
        title: "Error",
        description: "Please select an audio file",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append("name", formData.name);
      uploadFormData.append("description", formData.description);
      uploadFormData.append("mp3_file", mp3File);
      
      if (imageFile) {
        uploadFormData.append("image", imageFile);
      }

      // Parse tags and find matching tag IDs
      if (formData.tags) {
        const tagNames = formData.tags.split(",").map(t => t.trim()).filter(Boolean);
        const tagIds = tagNames
          .map(tagName => {
            const tag = tags.find(t => t.name.toLowerCase() === tagName.toLowerCase());
            return tag?.id;
          })
          .filter(Boolean);
        
        tagIds.forEach(id => uploadFormData.append("tags", id.toString()));
      }

      await soundsAPI.create(uploadFormData);
      
      queryClient.invalidateQueries({ queryKey: ['sounds'] });
      
      toast({
        title: "Sound uploaded",
        description: "Your sound has been added successfully",
      });

      // Reset form
      setFormData({ name: "", description: "", tags: "" });
      setMp3File(null);
      setImageFile(null);
      const mp3Input = document.getElementById("audio") as HTMLInputElement;
      const imageInput = document.getElementById("image") as HTMLInputElement;
      if (mp3Input) mp3Input.value = "";
      if (imageInput) imageInput.value = "";
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Could not upload sound",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateTag = () => {
    if (!newTagName.trim()) {
      toast({
        title: "Error",
        description: "Tag name cannot be empty",
        variant: "destructive",
      });
      return;
    }
    createTagMutation.mutate(newTagName.trim());
  };

  if (!isAuthenticated || !user?.isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground">Upload and manage sounds and tags</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b">
            <Button
              variant={activeTab === "upload" ? "default" : "ghost"}
              onClick={() => setActiveTab("upload")}
            >
              Upload Sound
            </Button>
            <Button
              variant={activeTab === "tags" ? "default" : "ghost"}
              onClick={() => setActiveTab("tags")}
            >
              Manage Tags
            </Button>
            <Button
              variant={activeTab === "sounds" ? "default" : "ghost"}
              onClick={() => setActiveTab("sounds")}
            >
              Manage Sounds
            </Button>
          </div>

          {/* Upload Sound Tab */}
          {activeTab === "upload" && (
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary" />
                  Upload New Sound
                </CardTitle>
                <CardDescription>Add a new sound to the library</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpload} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Sound Name *</Label>
                    <Input
                      id="name"
                      placeholder="Enter sound name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="bg-secondary/50"
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Enter sound description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="bg-secondary/50 min-h-24"
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags (comma separated)</Label>
                    <Input
                      id="tags"
                      placeholder="Nature, Water, Relaxation"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      className="bg-secondary/50"
                      disabled={isSubmitting}
                    />
                    <p className="text-sm text-muted-foreground">
                      Existing tags: {tags.map(t => t.name).join(", ") || "None"}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="audio">Audio File * (MP3)</Label>
                    <div className="flex items-center gap-4">
                      <label htmlFor="audio">
                        <Button type="button" variant="outline" className="gap-2 cursor-pointer" asChild>
                          <span>
                            <Music className="h-4 w-4" />
                            Choose File
                          </span>
                        </Button>
                      </label>
                      <input
                        type="file"
                        id="audio"
                        accept="audio/mpeg,audio/mp3"
                        onChange={(e) => handleFileChange(e, "mp3")}
                        className="hidden"
                        disabled={isSubmitting}
                      />
                      <span className="text-sm text-muted-foreground">
                        {mp3File ? mp3File.name : "No file chosen"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="image">Cover Image (Optional)</Label>
                    <div className="flex items-center gap-4">
                      <label htmlFor="image">
                        <Button type="button" variant="outline" className="gap-2 cursor-pointer" asChild>
                          <span>
                            <Upload className="h-4 w-4" />
                            Choose Image
                          </span>
                        </Button>
                      </label>
                      <input
                        type="file"
                        id="image"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, "image")}
                        className="hidden"
                        disabled={isSubmitting}
                      />
                      <span className="text-sm text-muted-foreground">
                        {imageFile ? imageFile.name : "No file chosen"}
                      </span>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                    {isSubmitting ? "Uploading..." : "Upload Sound"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Manage Tags Tab */}
          {activeTab === "tags" && (
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Manage Tags</CardTitle>
                <CardDescription>Create and delete tags</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Create Tag */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter tag name"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleCreateTag();
                        }
                      }}
                    />
                    <Button
                      onClick={handleCreateTag}
                      disabled={createTagMutation.isPending || !newTagName.trim()}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Tag
                    </Button>
                  </div>

                  {/* Tags Table */}
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tags.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground">
                              No tags found
                            </TableCell>
                          </TableRow>
                        ) : (
                          tags.map((tag: Tag) => (
                            <TableRow key={tag.id}>
                              <TableCell>{tag.id}</TableCell>
                              <TableCell className="font-medium">{tag.name}</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteTagId(tag.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Manage Sounds Tab */}
          {activeTab === "sounds" && (
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Manage Sounds</CardTitle>
                <CardDescription>View and delete sounds</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Tags</TableHead>
                        <TableHead>Uploaded By</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sounds.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            No sounds found
                          </TableCell>
                        </TableRow>
                      ) : (
                        sounds.map((sound: Sound) => (
                          <TableRow key={sound.id}>
                            <TableCell>{sound.id}</TableCell>
                            <TableCell className="font-medium">{sound.name}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {sound.tags.slice(0, 3).map((tag: any) => (
                                  <span key={typeof tag === 'object' ? tag.id : tag} className="text-xs bg-secondary px-2 py-1 rounded">
                                    {typeof tag === 'object' ? tag.name : tag}
                                  </span>
                                ))}
                                {sound.tags.length > 3 && (
                                  <span className="text-xs text-muted-foreground">+{sound.tags.length - 3}</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {typeof sound.uploaded_by === 'object' 
                                ? sound.uploaded_by.username 
                                : sound.uploaded_by}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteSoundId(sound.id)}
                                className="text-destructive hover:text-destructive"
                                disabled={deleteSoundMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Delete Tag Confirmation */}
      <AlertDialog open={deleteTagId !== null} onOpenChange={() => setDeleteTagId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tag</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this tag? This action cannot be undone.
              {deleteTagId && (
                <span className="font-semibold">
                  {" "}Tag: {tags.find(t => t.id === deleteTagId)?.name}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTagId && deleteTagMutation.mutate(deleteTagId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Sound Confirmation */}
      <AlertDialog open={deleteSoundId !== null} onOpenChange={() => setDeleteSoundId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sound</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this sound? This action cannot be undone.
              {deleteSoundId && (
                <span className="font-semibold">
                  {" "}Sound: {sounds.find(s => s.id === deleteSoundId)?.name}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteSoundId && deleteSoundMutation.mutate(deleteSoundId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Admin;
