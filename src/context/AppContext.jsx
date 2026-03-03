import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  apiAddComment,
  apiBlockUser,
  apiCreateArticle,
  apiDeleteArticle,
  apiGetState,
  apiLogin,
  apiRegister,
  apiRemoveFriend,
  apiRespondToRequest,
  apiSendFriendRequest,
  apiUnblockUser,
  apiUpdateArticle,
  handleUnauthorized,
} from "../lib/api";
import { clearToken, extractUserIdFromToken, readToken, writeToken } from "../lib/auth";

const emptyData = {
  users: [],
  friendRequests: [],
  articles: [],
  comments: [],
};

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [data, setData] = useState(emptyData);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const currentUser = useMemo(
    () => data.users.find((user) => user.id === currentUserId) || null,
    [data.users, currentUserId]
  );

  async function refreshState() {
    try {
      const state = await apiGetState();
      setData(state);
      return { ok: true, state };
    } catch (error) {
      handleUnauthorized(error);
      if (error?.status === 401) {
        clearToken();
        setCurrentUserId(null);
        setData(emptyData);
      }
      return { ok: false, error: error.message || "Erreur serveur." };
    }
  }

  async function bootstrap() {
    const token = readToken();
    if (!token) {
      setIsBootstrapping(false);
      return;
    }
    setCurrentUserId(extractUserIdFromToken(token));
    const result = await refreshState();
    if (!result.ok) setCurrentUserId(null);
    setIsBootstrapping(false);
  }

  useEffect(() => {
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function authAndSync(action) {
    try {
      const { token } = await action();
      writeToken(token);
      setCurrentUserId(extractUserIdFromToken(token));
      const state = await apiGetState();
      setData(state);
      return { ok: true };
    } catch (error) {
      handleUnauthorized(error);
      return { ok: false, error: error.message || "Erreur serveur." };
    }
  }

  async function register(payload) {
    return authAndSync(() => apiRegister(payload));
  }

  async function login(payload) {
    return authAndSync(() => apiLogin(payload));
  }

  function logout() {
    clearToken();
    setCurrentUserId(null);
    setData(emptyData);
  }

  async function mutate(action) {
    try {
      await action();
      const refresh = await refreshState();
      if (!refresh.ok) return refresh;
      return { ok: true };
    } catch (error) {
      handleUnauthorized(error);
      if (error?.status === 401) {
        logout();
      }
      return { ok: false, error: error.message || "Erreur serveur." };
    }
  }

  async function sendFriendRequest(targetUserId) {
    return mutate(() => apiSendFriendRequest(targetUserId));
  }

  async function respondToRequest(requestId, accept) {
    return mutate(() => apiRespondToRequest(requestId, accept));
  }

  async function removeFriend(friendId) {
    return mutate(() => apiRemoveFriend(friendId));
  }

  async function blockUser(targetUserId) {
    return mutate(() => apiBlockUser(targetUserId));
  }

  async function unblockUser(targetUserId) {
    return mutate(() => apiUnblockUser(targetUserId));
  }

  async function createArticle(payload) {
    return mutate(() => apiCreateArticle(payload));
  }

  async function updateArticle(articleId, payload) {
    return mutate(() => apiUpdateArticle(articleId, payload));
  }

  async function deleteArticle(articleId) {
    return mutate(() => apiDeleteArticle(articleId));
  }

  async function addComment(articleId, content) {
    return mutate(() => apiAddComment(articleId, content));
  }

  const value = {
    users: data.users,
    articles: data.articles,
    comments: data.comments,
    friendRequests: data.friendRequests,
    currentUser,
    currentUserId,
    isBootstrapping,
    register,
    login,
    logout,
    refreshState,
    sendFriendRequest,
    respondToRequest,
    removeFriend,
    blockUser,
    unblockUser,
    createArticle,
    updateArticle,
    deleteArticle,
    addComment,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext doit etre utilise dans AppProvider");
  return context;
}
