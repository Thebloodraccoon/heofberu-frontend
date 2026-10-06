const DEFAULT_IMG = '/default-img-verney.jpg'

export default function CatalogImage({ imageUrl, alt = '', title, className = '' }) {
  return (
    <div className={`catalog-image-frame ${className}`}>
      <img
        src={imageUrl || DEFAULT_IMG}
        alt={alt}
        title={title}
        loading="lazy"
      />
    </div>
  )
}
