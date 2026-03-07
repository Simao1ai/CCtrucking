import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  BookOpen,
  Search,
  Plus,
  Pin,
  Pencil,
  Trash2,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";

const DEFAULT_CATEGORIES = [
  "Onboarding",
  "IFTA Filing",
  "DOT Compliance",
  "Tax Preparation",
  "Invoicing",
  "Client Intake",
  "Bookkeeping",
  "General Procedures",
  "HR & Training",
];

interface KBArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  createdByName?: string;
}

export default function AdminKnowledgeBase() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isOwnerOrAdmin = user?.role === "owner" || user?.role === "admin";

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedArticle, setSelectedArticle] = useState<KBArticle | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<KBArticle | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formCategory, setFormCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [formPinned, setFormPinned] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data: articles = [], isLoading } = useQuery<KBArticle[]>({
    queryKey: ["/api/admin/knowledge-base"],
  });

  const { data: searchResults } = useQuery<KBArticle[]>({
    queryKey: ["/api/admin/knowledge-base/search", searchTerm],
    queryFn: async () => {
      const res = await fetch(`/api/admin/knowledge-base/search?q=${encodeURIComponent(searchTerm)}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    enabled: searchTerm.length > 0,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; category: string; pinned: boolean }) => {
      await apiRequest("POST", "/api/admin/knowledge-base", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/knowledge-base"] });
      toast({ title: "Article created" });
      closeDialog();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; title: string; content: string; category: string; pinned: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/knowledge-base/${id}`, data);
      return res.json();
    },
    onSuccess: (updatedArticle) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/knowledge-base"] });
      toast({ title: "Article updated" });
      closeDialog();
      if (selectedArticle && selectedArticle.id === updatedArticle.id) {
        setSelectedArticle(updatedArticle);
      } else {
        setSelectedArticle(null);
      }
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/knowledge-base/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/knowledge-base"] });
      toast({ title: "Article deleted" });
      setSelectedArticle(null);
      setDeleteConfirmId(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const pinMutation = useMutation({
    mutationFn: async ({ id, pinned }: { id: string; pinned: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/knowledge-base/${id}`, { pinned });
      return res.json();
    },
    onSuccess: (updatedArticle) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/knowledge-base"] });
      if (selectedArticle && selectedArticle.id === updatedArticle.id) {
        setSelectedArticle(updatedArticle);
      }
    },
  });

  const categories = useMemo(() => {
    const fromArticles = articles.map((a) => a.category).filter(Boolean);
    const all = new Set([...DEFAULT_CATEGORIES, ...fromArticles]);
    return Array.from(all).sort();
  }, [articles]);

  const displayedArticles = useMemo(() => {
    const source = searchTerm.length > 0 && searchResults ? searchResults : articles;
    let filtered = source;
    if (selectedCategory !== "all") {
      filtered = filtered.filter((a) => a.category === selectedCategory);
    }
    return [...filtered].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
    });
  }, [articles, searchResults, searchTerm, selectedCategory]);

  function openCreateDialog() {
    setEditingArticle(null);
    setFormTitle("");
    setFormContent("");
    setFormCategory(DEFAULT_CATEGORIES[0]);
    setFormPinned(false);
    setDialogOpen(true);
  }

  function openEditDialog(article: KBArticle) {
    setEditingArticle(article);
    setFormTitle(article.title);
    setFormContent(article.content);
    setFormCategory(article.category);
    setFormPinned(article.pinned);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingArticle(null);
  }

  function handleSave() {
    if (!formTitle.trim() || !formContent.trim()) {
      toast({ title: "Title and content are required", variant: "destructive" });
      return;
    }
    const data = { title: formTitle.trim(), content: formContent.trim(), category: formCategory, pinned: formPinned };
    if (editingArticle) {
      updateMutation.mutate({ id: editingArticle.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  }

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    articles.forEach((a) => {
      counts[a.category] = (counts[a.category] || 0) + 1;
    });
    return counts;
  }, [articles]);

  if (selectedArticle) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedArticle(null)}
          data-testid="button-back-to-list"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to articles
        </Button>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedArticle.pinned && <Pin className="w-4 h-4 text-primary flex-shrink-0" />}
                  <h1 className="text-xl font-semibold" data-testid="text-article-title">
                    {selectedArticle.title}
                  </h1>
                </div>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge variant="secondary" data-testid="text-article-category">
                    {selectedArticle.category}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Updated {new Date(selectedArticle.updatedAt || selectedArticle.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              {isOwnerOrAdmin && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => pinMutation.mutate({ id: selectedArticle.id, pinned: !selectedArticle.pinned })}
                    data-testid="button-toggle-pin"
                  >
                    <Pin className={`w-4 h-4 ${selectedArticle.pinned ? "text-primary fill-primary" : ""}`} />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => openEditDialog(selectedArticle)}
                    data-testid="button-edit-article"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  {user?.role === "owner" && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setDeleteConfirmId(selectedArticle.id)}
                      data-testid="button-delete-article"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed" data-testid="text-article-content">
              {selectedArticle.content}
            </div>
          </CardContent>
        </Card>

        <ArticleDialog
          open={dialogOpen}
          onClose={closeDialog}
          onSave={handleSave}
          editing={!!editingArticle}
          isPending={createMutation.isPending || updateMutation.isPending}
          formTitle={formTitle}
          setFormTitle={setFormTitle}
          formContent={formContent}
          setFormContent={setFormContent}
          formCategory={formCategory}
          setFormCategory={setFormCategory}
          formPinned={formPinned}
          setFormPinned={setFormPinned}
          categories={categories}
        />

        <Dialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Article</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">Are you sure you want to delete this article? This action cannot be undone.</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirmId(null)} data-testid="button-cancel-delete">
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
                disabled={deleteMutation.isPending}
                data-testid="button-confirm-delete"
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Knowledge Base"
        description="Internal articles and procedures for the team"
        icon={<BookOpen className="w-5 h-5 text-primary" />}
        actions={
          isOwnerOrAdmin ? (
            <Button onClick={openCreateDialog} data-testid="button-create-article">
              <Plus className="w-4 h-4 mr-1" />
              New Article
            </Button>
          ) : undefined
        }
      />

      <div className="flex gap-6">
        <div className="w-56 flex-shrink-0 space-y-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search articles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
              data-testid="input-search-articles"
            />
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">Categories</p>
            <button
              onClick={() => setSelectedCategory("all")}
              className={`w-full text-left text-sm px-2 py-1.5 rounded-md transition-colors ${
                selectedCategory === "all" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover-elevate"
              }`}
              data-testid="button-category-all"
            >
              All Articles
              <span className="ml-1 text-xs opacity-60">({articles.length})</span>
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`w-full text-left text-sm px-2 py-1.5 rounded-md transition-colors ${
                  selectedCategory === cat ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover-elevate"
                }`}
                data-testid={`button-category-${cat.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {cat}
                <span className="ml-1 text-xs opacity-60">({categoryCounts[cat] || 0})</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-5 w-2/3 mb-2" />
                    <Skeleton className="h-4 w-1/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : displayedArticles.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="text-sm text-muted-foreground">
                  {searchTerm ? "No articles match your search." : "No articles yet."}
                </p>
                {isOwnerOrAdmin && !searchTerm && (
                  <Button variant="outline" className="mt-4" onClick={openCreateDialog} data-testid="button-create-first-article">
                    <Plus className="w-4 h-4 mr-1" />
                    Create your first article
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {displayedArticles.map((article) => (
                <Card
                  key={article.id}
                  className="hover-elevate cursor-pointer"
                  onClick={() => setSelectedArticle(article)}
                  data-testid={`card-article-${article.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {article.pinned && <Pin className="w-3.5 h-3.5 text-primary flex-shrink-0 fill-primary" />}
                          <span className="text-sm font-medium truncate" data-testid={`text-article-title-${article.id}`}>
                            {article.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <Badge variant="secondary" className="text-xs">
                            {article.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(article.updatedAt || article.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                          {article.content.substring(0, 150)}
                          {article.content.length > 150 ? "..." : ""}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <ArticleDialog
        open={dialogOpen}
        onClose={closeDialog}
        onSave={handleSave}
        editing={!!editingArticle}
        isPending={createMutation.isPending || updateMutation.isPending}
        formTitle={formTitle}
        setFormTitle={setFormTitle}
        formContent={formContent}
        setFormContent={setFormContent}
        formCategory={formCategory}
        setFormCategory={setFormCategory}
        formPinned={formPinned}
        setFormPinned={setFormPinned}
        categories={categories}
      />
    </div>
  );
}

function ArticleDialog({
  open,
  onClose,
  onSave,
  editing,
  isPending,
  formTitle,
  setFormTitle,
  formContent,
  setFormContent,
  formCategory,
  setFormCategory,
  formPinned,
  setFormPinned,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  editing: boolean;
  isPending: boolean;
  formTitle: string;
  setFormTitle: (v: string) => void;
  formContent: string;
  setFormContent: (v: string) => void;
  formCategory: string;
  setFormCategory: (v: string) => void;
  formPinned: boolean;
  setFormPinned: (v: boolean) => void;
  categories: string[];
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Article" : "New Article"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="article-title">Title</Label>
            <Input
              id="article-title"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Article title"
              data-testid="input-article-title"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="article-category">Category</Label>
            <Select value={formCategory} onValueChange={setFormCategory}>
              <SelectTrigger data-testid="select-article-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="article-content">Content</Label>
            <Textarea
              id="article-content"
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              placeholder="Write your article content..."
              rows={10}
              className="resize-none"
              data-testid="input-article-content"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="article-pinned"
              checked={formPinned}
              onCheckedChange={setFormPinned}
              data-testid="switch-article-pinned"
            />
            <Label htmlFor="article-pinned">Pin this article</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-article">
            Cancel
          </Button>
          <Button onClick={onSave} disabled={isPending} data-testid="button-save-article">
            {isPending ? "Saving..." : editing ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
