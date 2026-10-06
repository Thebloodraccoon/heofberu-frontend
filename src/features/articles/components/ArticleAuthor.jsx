export default function ArticleAuthor({ author }) {
  if (!author?.username) return null

  return <span className="lore-article-author" aria-label={`Автор: ${author.username}`}>
    @{author.username}
  </span>
}
