const DEFAULT_IMG = '/default-img-verney.jpg'

export default function CatalogImage({ imageUrl, alt = '', title }) {
  return (
    <div className="catalog-image-frame">
      <img
        src={imageUrl || DEFAULT_IMG}
        alt={alt}
        title={title}
        loading="lazy"
      />
    </div>
  )
}
