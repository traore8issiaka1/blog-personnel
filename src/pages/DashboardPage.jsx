import { useMemo, useState } from "react";
import {
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import ArticleCard from "../components/ArticleCard";
import FeedbackSnackbar from "../components/FeedbackSnackbar";
import PageHeader from "../components/PageHeader";
import { useAppContext } from "../context/AppContext";
import { canViewArticle } from "../lib/helpers";

function StatCard({ label, value }) {
  return (
    <Paper sx={{ p: 2.25 }}>
      <Typography variant="subtitle2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h4">{value}</Typography>
    </Paper>
  );
}

export default function DashboardPage() {
  const { articles, comments, currentUser, currentUserId, users, addComment } = useAppContext();
  const [visibilityFilter, setVisibilityFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("recent");
  const [feedback, setFeedback] = useState({ open: false, type: "success", message: "" });

  const ownArticles = useMemo(
    () => articles.filter((article) => article.authorId === currentUserId),
    [articles, currentUserId]
  );

  const visibleFriendArticles = useMemo(
    () =>
      articles.filter((article) => {
        if (article.authorId === currentUserId) return false;
        const author = users.find((user) => user.id === article.authorId);
        return canViewArticle(article, currentUser, author);
      }),
    [articles, currentUser, currentUserId, users]
  );

  const feed = useMemo(() => {
    const raw = [...ownArticles, ...visibleFriendArticles];
    const filtered =
      visibilityFilter === "all"
        ? raw
        : raw.filter((article) =>
            visibilityFilter === "public" ? article.isPublic : !article.isPublic
          );

    return filtered.sort((a, b) => {
      if (sortOrder === "recent") {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
    });
  }, [ownArticles, visibleFriendArticles, sortOrder, visibilityFilter]);

  async function handleAddComment(articleId, content) {
    const result = await addComment(articleId, content);
    if (!result.ok) return result;
    setFeedback({ open: true, type: "success", message: "Commentaire ajoute." });
    return result;
  }

  return (
    <Stack spacing={2.5}>
      <PageHeader
        title="Tableau de bord"
        subtitle="Consultez vos articles et ceux de vos amis autorises."
      />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard label="Vos articles" value={ownArticles.length} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard label="Articles amis visibles" value={visibleFriendArticles.length} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard label="Flux total" value={feed.length} />
        </Grid>
      </Grid>

      <Paper sx={{ p: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <FormControl fullWidth size="small">
            <InputLabel id="filter-label">Visibilite</InputLabel>
            <Select
              labelId="filter-label"
              label="Visibilite"
              value={visibilityFilter}
              onChange={(event) => setVisibilityFilter(event.target.value)}
            >
              <MenuItem value="all">Tous</MenuItem>
              <MenuItem value="public">Public</MenuItem>
              <MenuItem value="private">Prive</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth size="small">
            <InputLabel id="sort-label">Tri</InputLabel>
            <Select
              labelId="sort-label"
              label="Tri"
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
            >
              <MenuItem value="recent">Plus recents</MenuItem>
              <MenuItem value="oldest">Plus anciens</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      <Stack spacing={2}>
        {feed.length === 0 ? (
          <Paper sx={{ p: 2.5 }}>
            <Typography color="text.secondary">
              Aucun article pour ce filtre. Creez du contenu ou ajoutez des amis.
            </Typography>
          </Paper>
        ) : (
          feed.map((article) => {
            const author = users.find((user) => user.id === article.authorId);
            const articleComments = comments
              .filter((comment) => comment.articleId === article.id)
              .map((comment) => ({
                ...comment,
                authorName: users.find((user) => user.id === comment.authorId)?.name,
              }));

            return (
              <ArticleCard
                key={article.id}
                article={article}
                author={author}
                comments={articleComments}
                canComment={true}
                onAddComment={handleAddComment}
              />
            );
          })
        )}
      </Stack>

      <FeedbackSnackbar
        open={feedback.open}
        type={feedback.type}
        message={feedback.message}
        onClose={() => setFeedback((prev) => ({ ...prev, open: false }))}
      />
    </Stack>
  );
}
