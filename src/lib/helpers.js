export function createId(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function formatDate(isoDate) {
  return new Date(isoDate).toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function areFriends(userA, userB) {
  if (!userA || !userB) return false;
  return userA.friendIds.includes(userB.id) && userB.friendIds.includes(userA.id);
}

export function isBlockedBetween(userA, userB) {
  if (!userA || !userB) return false;
  return userA.blockedUserIds.includes(userB.id) || userB.blockedUserIds.includes(userA.id);
}

export function canViewArticle(article, viewer, author) {
  if (!article || !viewer || !author) return false;
  if (article.authorId === viewer.id) return true;
  if (!article.isPublic) return false;
  return areFriends(viewer, author) && !isBlockedBetween(viewer, author);
}
