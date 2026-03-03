import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  Paper,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import ArticleCard from "../components/ArticleCard";
import ConfirmDialog from "../components/ConfirmDialog";
import FeedbackSnackbar from "../components/FeedbackSnackbar";
import PageHeader from "../components/PageHeader";
import { useAppContext } from "../context/AppContext";

const blankForm = {
  title: "",
  content: "",
  isPublic: true,
  allowComments: true,
};

function ArticleEditor({ form, setForm, onSubmit, submitLabel }) {
  return (
    <Paper component="form" sx={{ p: 2.25 }} onSubmit={onSubmit}>
      <Stack spacing={2}>
        <TextField
          label="Titre"
          value={form.title}
          onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
          inputProps={{ maxLength: 120 }}
          helperText={`${form.title.length}/120`}
        />
        <TextField
          label="Contenu"
          value={form.content}
          multiline
          minRows={6}
          onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
          helperText={`${form.content.length} caracteres`}
        />
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <FormControlLabel
            control={
              <Switch
                checked={form.isPublic}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, isPublic: event.target.checked }))
                }
              />
            }
            label={form.isPublic ? "Public" : "Prive"}
          />
          <FormControlLabel
            control={
              <Switch
                checked={form.allowComments}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, allowComments: event.target.checked }))
                }
              />
            }
            label={form.allowComments ? "Commentaires autorises" : "Commentaires desactives"}
          />
        </Stack>
        <Button type="submit" variant="contained">
          {submitLabel}
        </Button>
      </Stack>
    </Paper>
  );
}

export default function ArticlesPage() {
  const { articles, comments, users, currentUserId, createArticle, updateArticle, deleteArticle } =
    useAppContext();

  const [tab, setTab] = useState("edit");
  const [form, setForm] = useState(blankForm);
  const [editTarget, setEditTarget] = useState(null);
  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState({ open: false, type: "success", message: "" });
  const [confirmDelete, setConfirmDelete] = useState({ open: false, articleId: null, title: "" });

  const ownArticles = useMemo(
    () =>
      articles
        .filter((article) => article.authorId === currentUserId)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [articles, currentUserId]
  );

  const filteredArticles = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return ownArticles;
    return ownArticles.filter(
      (article) =>
        article.title.toLowerCase().includes(keyword) || article.content.toLowerCase().includes(keyword)
    );
  }, [ownArticles, search]);

  async function apply(action, successMessage) {
    const result = await action();
    if (result.ok) {
      setFeedback({ open: true, type: "success", message: successMessage });
    } else {
      setFeedback({ open: true, type: "error", message: result.error });
    }
    return result;
  }

  async function submitCreate(event) {
    event.preventDefault();
    const result = await apply(() => createArticle(form), "Article publie.");
    if (result.ok) {
      setForm(blankForm);
      setTab("preview");
    }
  }

  async function submitEdit() {
    if (!editTarget) return;
    const result = await apply(() => updateArticle(editTarget.id, editTarget), "Article modifie.");
    if (result.ok) setEditTarget(null);
  }

  return (
    <Stack spacing={2.5}>
      <PageHeader title="Gestion des articles" subtitle="Creation, edition, suppression et apercu." />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 5 }}>
          <Paper sx={{ p: 1 }}>
            <Tabs value={tab} onChange={(_, value) => setTab(value)}>
              <Tab value="edit" label="Edition" />
              <Tab value="preview" label="Apercu" />
            </Tabs>
          </Paper>

          {tab === "edit" ? (
            <Box sx={{ mt: 1.5 }}>
              <ArticleEditor
                form={form}
                setForm={setForm}
                onSubmit={submitCreate}
                submitLabel="Publier"
              />
            </Box>
          ) : (
            <Box sx={{ mt: 1.5 }}>
              <ArticleCard
                article={{
                  id: "preview",
                  authorId: currentUserId,
                  title: form.title || "Titre de demonstration",
                  content:
                    form.content ||
                    "Apercu de l'article. Le texte saisi apparaitra ici avant publication.",
                  isPublic: form.isPublic,
                  allowComments: form.allowComments,
                  updatedAt: new Date().toISOString(),
                }}
                author={users.find((user) => user.id === currentUserId)}
                comments={[]}
                canComment={false}
              />
            </Box>
          )}
        </Grid>

        <Grid size={{ xs: 12, lg: 7 }}>
          <Paper sx={{ p: 2.25 }}>
            <Typography variant="h6">Mes publications</Typography>
            <TextField
              fullWidth
              size="small"
              sx={{ mt: 1.5 }}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher un article..."
            />
          </Paper>

          <Stack spacing={2} sx={{ mt: 1.5 }}>
            {filteredArticles.length === 0 ? (
              <Paper sx={{ p: 2.5 }}>
                <Typography color="text.secondary">Aucun article trouve.</Typography>
              </Paper>
            ) : (
              filteredArticles.map((article) => {
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
                    author={users.find((user) => user.id === article.authorId)}
                    comments={articleComments}
                    canComment={false}
                    actions={
                      <Stack direction="row" spacing={1}>
                        <Button size="small" variant="outlined" onClick={() => setEditTarget({ ...article })}>
                          Modifier
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          color="error"
                          onClick={() =>
                            setConfirmDelete({
                              open: true,
                              articleId: article.id,
                              title: article.title,
                            })
                          }
                        >
                          Supprimer
                        </Button>
                      </Stack>
                    }
                  />
                );
              })
            )}
          </Stack>
        </Grid>
      </Grid>

      <Dialog open={Boolean(editTarget)} onClose={() => setEditTarget(null)} fullWidth maxWidth="md">
        <DialogTitle>Modifier l&apos;article</DialogTitle>
        <DialogContent>
          {editTarget ? (
            <ArticleEditor
              form={editTarget}
              setForm={setEditTarget}
              onSubmit={async (event) => {
                event.preventDefault();
                await submitEdit();
              }}
              submitLabel="Enregistrer"
            />
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditTarget(null)}>Annuler</Button>
          <Button variant="contained" onClick={submitEdit}>
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete.open}
        title="Supprimer cet article ?"
        description={`Cette action supprimera definitivement "${confirmDelete.title}".`}
        confirmLabel="Supprimer"
        confirmColor="error"
        onClose={() => setConfirmDelete({ open: false, articleId: null, title: "" })}
        onConfirm={async () => {
          await apply(() => deleteArticle(confirmDelete.articleId), "Article supprime.");
          setConfirmDelete({ open: false, articleId: null, title: "" });
        }}
      />

      <FeedbackSnackbar
        open={feedback.open}
        type={feedback.type}
        message={feedback.message}
        onClose={() => setFeedback((prev) => ({ ...prev, open: false }))}
      />
    </Stack>
  );
}
